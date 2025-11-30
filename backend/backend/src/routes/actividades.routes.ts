import { Router, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

// Middleware para verificar que sea ADMIN
const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acceso denegado. Solo administradores pueden ver actividades.' });
  }
  next();
};

router.use(requireAdmin);

// GET /api/actividades - Obtener actividades recientes
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { localId, userId, tabla, fechaInicio, fechaFin, limit = 50 } = req.query;

    const where: any = {};

    if (localId) {
      // Obtener usuarios del local
      const usuariosLocal = await prisma.user.findMany({
        where: { localId: localId as string },
        select: { id: true }
      });
      where.userId = { in: usuariosLocal.map(u => u.id) };
    }

    if (userId) {
      where.userId = userId as string;
    }

    if (tabla) {
      where.tabla = tabla as string;
    }

    if (fechaInicio || fechaFin) {
      where.fecha = {};
      if (fechaInicio) {
        where.fecha.gte = new Date(fechaInicio as string);
      }
      if (fechaFin) {
        where.fecha.lte = new Date(fechaFin as string);
      }
    } else {
      // Por defecto, últimos 7 días
      const fechaInicioDefault = new Date();
      fechaInicioDefault.setDate(fechaInicioDefault.getDate() - 7);
      where.fecha = {
        gte: fechaInicioDefault
      };
    }

    const actividades = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            nombre: true,
            email: true,
            role: true,
            local: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        }
      },
      orderBy: {
        fecha: 'desc'
      },
      take: parseInt(limit as string) || 500 // Aumentar límite para historial completo
    });

    // Agrupar por tipo de actividad
    const actividadesPorTipo = actividades.reduce((acc, act) => {
      const tipo = `${act.accion}_${act.tabla}`;
      if (!acc[tipo]) {
        acc[tipo] = [];
      }
      acc[tipo].push(act);
      return acc;
    }, {} as Record<string, typeof actividades>);

    res.json({
      actividades,
      resumen: {
        total: actividades.length,
        porTipo: Object.keys(actividadesPorTipo).map(tipo => ({
          tipo,
          cantidad: actividadesPorTipo[tipo].length
        })),
        porLocal: await getActividadesPorLocal(actividades),
        porUsuario: await getActividadesPorUsuario(actividades)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Función auxiliar para agrupar actividades por local
async function getActividadesPorLocal(actividades: any[]) {
  const userIds = [...new Set(actividades.map(a => a.userId))];
  const usuarios = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      local: {
        select: {
          id: true,
          nombre: true
        }
      }
    }
  });

  const porLocal = new Map<string, number>();
  actividades.forEach(act => {
    const usuario = usuarios.find(u => u.id === act.userId);
    const localNombre = usuario?.local?.nombre || 'Sin local';
    porLocal.set(localNombre, (porLocal.get(localNombre) || 0) + 1);
  });

  return Array.from(porLocal.entries()).map(([local, cantidad]) => ({
    local,
    cantidad
  }));
}

// Función auxiliar para agrupar actividades por usuario
async function getActividadesPorUsuario(actividades: any[]) {
  const userIds = [...new Set(actividades.map(a => a.userId))];
  const usuarios = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      nombre: true,
      email: true
    }
  });

  const porUsuario = new Map<string, number>();
  actividades.forEach(act => {
    const usuario = usuarios.find(u => u.id === act.userId);
    const nombre = usuario?.nombre || 'Usuario desconocido';
    porUsuario.set(nombre, (porUsuario.get(nombre) || 0) + 1);
  });

  return Array.from(porUsuario.entries())
    .map(([usuario, cantidad]) => ({
      usuario,
      cantidad
    }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 10);
}

export default router;

