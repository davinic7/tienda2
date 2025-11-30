import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

const isDevelopment = process.env.NODE_ENV !== 'production';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Logging detallado en desarrollo
  if (isDevelopment) {
    console.error('\n❌ ========== ERROR DETECTADO ==========');
    console.error('📍 Ruta:', req.method, req.path);
    console.error('📝 Mensaje:', err.message);
    console.error('🏷️  Tipo:', err.name);
    console.error('📦 Stack:', err.stack);
    if (req.body && Object.keys(req.body).length > 0) {
      console.error('📥 Body recibido:', JSON.stringify(req.body, null, 2));
    }
    if (req.query && Object.keys(req.query).length > 0) {
      console.error('🔍 Query params:', JSON.stringify(req.query, null, 2));
    }
    if (req.params && Object.keys(req.params).length > 0) {
      console.error('🎯 Params:', JSON.stringify(req.params, null, 2));
    }
    console.error('=====================================\n');
  } else {
    // En producción, solo mensaje básico
    console.error('Error:', err.message);
  }

  // Error de validación Zod
  if (err instanceof ZodError) {
    const details = err.errors.map(e => ({
      path: e.path.join('.'),
      message: e.message,
      code: e.code
    }));
    
    if (isDevelopment) {
      console.error('🔴 Errores de validación Zod:');
      details.forEach(d => {
        console.error(`  - ${d.path}: ${d.message} (${d.code})`);
      });
    }
    
    return res.status(400).json({
      error: 'Error de validación',
      details,
      ...(isDevelopment && { body: req.body })
    });
  }

  // Error de Prisma - detectar todos los tipos
  if (err.name?.includes('Prisma') || err.constructor?.name?.includes('Prisma')) {
    const prismaError = err as any;
    
    if (isDevelopment) {
      console.error('🔴 Error de Prisma:');
      console.error('  Código:', prismaError.code);
      console.error('  Meta:', JSON.stringify(prismaError.meta, null, 2));
    }
    
    // Errores de conexión a la base de datos
    if (prismaError.code === 'P1001' || prismaError.code === 'P1000' || prismaError.code === 'P1017') {
      console.error('🔴 ERROR CRÍTICO: No se puede conectar a la base de datos');
      console.error('💡 Verifica que MySQL esté corriendo');
      return res.status(503).json({
        error: 'Servicio no disponible: Error de conexión a la base de datos',
        code: prismaError.code,
        ...(isDevelopment && { 
          message: prismaError.message 
        })
      });
    }
    
    if (prismaError.code === 'P2002') {
      return res.status(409).json({
        error: 'Conflicto: ya existe un registro con estos valores únicos',
        ...(isDevelopment && { 
          details: prismaError.meta,
          target: prismaError.meta?.target 
        })
      });
    }
    if (prismaError.code === 'P2025') {
      return res.status(404).json({
        error: 'Registro no encontrado',
        ...(isDevelopment && { 
          details: prismaError.meta 
        })
      });
    }
    if (prismaError.code === 'P2003') {
      return res.status(400).json({
        error: 'Error de relación: registro relacionado no encontrado',
        ...(isDevelopment && { 
          details: prismaError.meta 
        })
      });
    }
    
    // Otros errores de Prisma - no mostrar "Error de base de datos" genérico
    return res.status(500).json({
      error: 'Error al procesar la solicitud',
      code: prismaError.code,
      ...(isDevelopment && { 
        message: prismaError.message,
        meta: prismaError.meta 
      })
    });
  }

  // Error de conexión a base de datos
  if (err.message.includes('connect ECONNREFUSED') || err.message.includes('Can\'t reach database server')) {
    console.error('🔴 ERROR CRÍTICO: No se puede conectar a la base de datos');
    console.error('💡 Verifica que MySQL esté corriendo');
    return res.status(503).json({
      error: 'Servicio no disponible: Error de conexión a la base de datos',
      ...(isDevelopment && { 
        message: err.message 
      })
    });
  }

  // Error genérico
  res.status(500).json({
    error: 'Error interno del servidor',
    ...(isDevelopment && { 
      message: err.message,
      name: err.name,
      stack: err.stack?.split('\n').slice(0, 5) // Solo primeras 5 líneas del stack
    })
  });
};

