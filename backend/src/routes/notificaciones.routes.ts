import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, authorize, filterByLocal } from '../middleware/auth';

const router = Router();

// Aplicar autenticación a todas las rutas
router.use(authenticate);

// GET /notificaciones - Listar notificaciones
router.get('/', filterByLocal, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { estado, tipo, localId } = req.query;
    const user = req.user!;

    const where: any = {};

    // Admin ve todas, vendedor solo las de su local
    if (user.role === 'VENDEDOR' && user.localId) {
      where.localId = user.localId;
    } else if (localId) {
      where.localId = localId as string;
    }

    if (estado) {
      where.estado = estado;
    }

    if (tipo) {
      where.tipo = tipo;
    }

    const notificaciones = await prisma.notificacion.findMany({
      where,
      include: {
        local: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json(notificaciones);
  } catch (error) {
    next(error);
  }
});

// GET /notificaciones/pendientes - Obtener notificaciones pendientes
router.get('/pendientes', filterByLocal, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const where: any = {
      estado: 'PENDIENTE',
    };

    if (user.role === 'VENDEDOR' && user.localId) {
      where.localId = user.localId;
    }

    const notificaciones = await prisma.notificacion.findMany({
      where,
      include: {
        local: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(notificaciones);
  } catch (error) {
    next(error);
  }
});

// PUT /notificaciones/:id/marcar-leida - Marcar notificación como leída
router.put('/:id/marcar-leida', filterByLocal, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notificacion = await prisma.notificacion.findUnique({
      where: { id: req.params.id },
    });

    if (!notificacion) {
      res.status(404).json({ error: 'Notificación no encontrada' });
      return;
    }

    // Verificar que el usuario tiene acceso a esta notificación
    const user = req.user!;
    if (user.role === 'VENDEDOR' && notificacion.localId !== user.localId) {
      res.status(403).json({ error: 'No tienes permisos para esta notificación' });
      return;
    }

    const notificacionActualizada = await prisma.notificacion.update({
      where: { id: req.params.id },
      data: {
        estado: 'LEIDA',
        leidaEn: new Date(),
      },
    });

    res.json(notificacionActualizada);
  } catch (error) {
    next(error);
  }
});

// PUT /notificaciones/:id/archivar - Archivar notificación
router.put('/:id/archivar', filterByLocal, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notificacion = await prisma.notificacion.findUnique({
      where: { id: req.params.id },
    });

    if (!notificacion) {
      res.status(404).json({ error: 'Notificación no encontrada' });
      return;
    }

    // Verificar que el usuario tiene acceso
    const user = req.user!;
    if (user.role === 'VENDEDOR' && notificacion.localId !== user.localId) {
      res.status(403).json({ error: 'No tienes permisos para esta notificación' });
      return;
    }

    const notificacionActualizada = await prisma.notificacion.update({
      where: { id: req.params.id },
      data: {
        estado: 'ARCHIVADA',
      },
    });

    res.json(notificacionActualizada);
  } catch (error) {
    next(error);
  }
});

// Función auxiliar para crear notificaciones (usada por otros módulos)
export async function crearNotificacion(data: {
  tipo: 'CAMBIO_PRECIO' | 'BAJA_ROTACION' | 'VENCIMIENTO' | 'VENTA_REMOTA';
  titulo: string;
  mensaje: string;
  localId?: string;
  productoId?: string;
  ventaId?: string;
}) {
  return await prisma.notificacion.create({
    data: {
      tipo: data.tipo,
      titulo: data.titulo,
      mensaje: data.mensaje,
      localId: data.localId || null,
      productoId: data.productoId || null,
      ventaId: data.ventaId || null,
    },
  });
}

export default router;

