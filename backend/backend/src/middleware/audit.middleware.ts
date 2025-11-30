import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { prisma } from '../index';

export const auditLog = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const originalSend = res.json;

  res.json = function (body: any) {
    // Solo registrar si la operación fue exitosa (2xx)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const accion = getAction(req.method, req.route?.path || req.path);
      const tabla = getTable(req.path);

      // Guardar en auditoría de forma asíncrona (no bloquear respuesta)
      if (req.user && accion && tabla) {
        // Preparar datos para auditoría
        const datosAnteriores = req.body.oldData || null;
        const datosNuevos = req.body.newData || req.body || null;
        
        // Limpiar datos sensibles (passwords)
        const limpiarDatos = (data: any) => {
          if (!data || typeof data !== 'object') return data;
          const cleaned = { ...data };
          if (cleaned.password) delete cleaned.password;
          if (cleaned.oldPassword) delete cleaned.oldPassword;
          if (cleaned.newPassword) delete cleaned.newPassword;
          return cleaned;
        };

        prisma.auditLog.create({
          data: {
            userId: req.user.id,
            accion,
            tabla,
            datos_anteriores: limpiarDatos(datosAnteriores),
            datos_nuevos: limpiarDatos(datosNuevos)
          }
        }).catch(err => {
          console.error('Error al crear audit log:', err);
        });
      }
    }

    return originalSend.call(this, body);
  };

  next();
};

function getAction(method: string, path: string): string | null {
  const methodMap: Record<string, string> = {
    'GET': 'CONSULTAR',
    'POST': 'CREAR',
    'PUT': 'ACTUALIZAR',
    'PATCH': 'ACTUALIZAR',
    'DELETE': 'ELIMINAR'
  };
  return methodMap[method] || null;
}

function getTable(path: string): string | null {
  const pathParts = path.split('/');
  const apiIndex = pathParts.indexOf('api');
  if (apiIndex >= 0 && apiIndex < pathParts.length - 1) {
    return pathParts[apiIndex + 1].toUpperCase();
  }
  return null;
}

