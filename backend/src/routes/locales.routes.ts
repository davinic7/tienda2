import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { createAuditLog } from '../utils/audit';

const router = Router();

const localCreateSchema = z.object({
  nombre: z.string().min(1),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
});

const localUpdateSchema = localCreateSchema.partial();

// Autenticación para todas las rutas
router.use(authenticate);

// GET /locales - Listar todos los locales (todos los usuarios autenticados pueden ver)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { activo } = req.query;

    const where: any = {};

    if (activo !== undefined) {
      where.activo = activo === 'true';
    }

    const locales = await prisma.local.findMany({
      where,
      orderBy: { nombre: 'asc' },
      include: {
        _count: {
          select: {
            usuarios: true,
            ventas: true,
          },
        },
      },
    });

    res.json(locales);
  } catch (error) {
    next(error);
  }
});

// GET /locales/:id - Obtener un local (todos los usuarios autenticados pueden ver)
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const local = await prisma.local.findUnique({
      where: { id: req.params.id },
      include: {
        usuarios: {
          select: {
            id: true,
            username: true,
            nombre: true,
            role: true,
            activo: true,
          },
        },
        _count: {
          select: {
            ventas: true,
            stocks: true,
          },
        },
      },
    });

    if (!local) {
      res.status(404).json({ error: 'Local no encontrado' });
      return;
    }

    res.json(local);
  } catch (error) {
    next(error);
  }
});

// POST /locales - Crear local (solo ADMIN)
router.post('/', authorize('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = localCreateSchema.parse(req.body);

    const local = await prisma.local.create({
      data: {
        nombre: data.nombre,
        direccion: data.direccion || null,
        telefono: data.telefono || null,
      },
    });

    // Log de auditoría
    await createAuditLog({
      userId: req.user!.id,
      accion: 'CREATE',
      tabla: 'Local',
      datosNuevos: local,
    });

    res.status(201).json(local);
  } catch (error) {
    next(error);
  }
});

// PUT /locales/:id - Actualizar local (solo ADMIN)
router.put('/:id', authorize('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const localId = req.params.id;
    const data = localUpdateSchema.parse(req.body);

    const localAnterior = await prisma.local.findUnique({
      where: { id: localId },
    });

    if (!localAnterior) {
      res.status(404).json({ error: 'Local no encontrado' });
      return;
    }

    const localActualizado = await prisma.local.update({
      where: { id: localId },
      data: {
        ...(data.nombre && { nombre: data.nombre }),
        ...(data.direccion !== undefined && { direccion: data.direccion || null }),
        ...(data.telefono !== undefined && { telefono: data.telefono || null }),
      },
    });

    // Log de auditoría
    await createAuditLog({
      userId: req.user!.id,
      accion: 'UPDATE',
      tabla: 'Local',
      datosAnteriores: localAnterior,
      datosNuevos: localActualizado,
    });

    res.json(localActualizado);
  } catch (error) {
    next(error);
  }
});

// DELETE /locales/:id - Eliminar/Desactivar local (solo ADMIN)
router.delete('/:id', authorize('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const localId = req.params.id;

    const local = await prisma.local.findUnique({
      where: { id: localId },
      include: {
        _count: {
          select: {
            usuarios: true,
            ventas: true,
          },
        },
      },
    });

    if (!local) {
      res.status(404).json({ error: 'Local no encontrado' });
      return;
    }

    // Soft delete: marcar como inactivo
    const localEliminado = await prisma.local.update({
      where: { id: localId },
      data: { activo: false },
    });

    // Log de auditoría
    await createAuditLog({
      userId: req.user!.id,
      accion: 'DELETE',
      tabla: 'Local',
      datosAnteriores: local,
      datosNuevos: localEliminado,
    });

    res.json({ message: 'Local desactivado correctamente', local: localEliminado });
  } catch (error) {
    next(error);
  }
});

export default router;

