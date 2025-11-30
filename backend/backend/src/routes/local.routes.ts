import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/audit.middleware';

const router = Router();

router.use(authenticateToken);
router.use(auditLog);

const createLocalSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  direccion: z.string().optional(),
  telefono: z.string().optional()
});

// GET /api/locales - Listar locales
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    // Los vendedores solo ven su local asignado
    const where: any = {};
    if (req.user?.role === 'VENDEDOR' && req.user.localId) {
      where.id = req.user.localId;
    }

    const locales = await prisma.local.findMany({
      where,
      include: {
        _count: {
          select: {
            usuarios: true,
            ventas: true,
            stocks: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Para cada local, obtener turnos activos y vendedores
    const localesConTurnos = await Promise.all(
      locales.map(async (local) => {
        const turnosActivos = await prisma.turno.findMany({
          where: {
            localId: local.id,
            estado: 'ABIERTO'
          },
          include: {
            vendedor: {
              select: {
                id: true,
                nombre: true,
                email: true
              }
            }
          }
        });

        return {
          ...local,
          turnosActivos: turnosActivos.length,
          vendedoresActivos: turnosActivos.map(t => ({
            id: t.vendedor.id,
            nombre: t.vendedor.nombre,
            email: t.vendedor.email,
            fechaApertura: t.fecha_apertura
          }))
        };
      })
    );

    res.json({ locales: localesConTurnos });
  } catch (error) {
    next(error);
  }
});

// GET /api/locales/:id - Obtener local por ID
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    // Los vendedores solo pueden ver su local
    if (req.user?.role === 'VENDEDOR' && req.user.localId !== id) {
      return res.status(403).json({ error: 'No tienes acceso a este local' });
    }

    const local = await prisma.local.findUnique({
      where: { id },
      include: {
        usuarios: {
          select: {
            id: true,
            email: true,
            nombre: true,
            role: true,
            activo: true
          }
        },
        stocks: {
          include: {
            producto: {
              select: {
                id: true,
                nombre: true,
                precio: true
              }
            }
          }
        }
      }
    });

    if (!local) {
      return res.status(404).json({ error: 'Local no encontrado' });
    }

    res.json({ local });
  } catch (error) {
    next(error);
  }
});

// POST /api/locales - Crear local (solo ADMIN)
router.post('/', requireRole('ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const data = createLocalSchema.parse(req.body);

    const local = await prisma.local.create({
      data
    });

    res.status(201).json({ local });
  } catch (error) {
    next(error);
  }
});

// PUT /api/locales/:id - Actualizar local (solo ADMIN)
router.put('/:id', requireRole('ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const data = createLocalSchema.partial().parse(req.body);

    const local = await prisma.local.update({
      where: { id },
      data
    });

    res.json({ local });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/locales/:id - Eliminar local (soft delete, solo ADMIN)
router.delete('/:id', requireRole('ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const local = await prisma.local.findUnique({
      where: { id }
    });

    if (!local) {
      return res.status(404).json({ error: 'Local no encontrado' });
    }

    // Soft delete: marcar como inactivo
    const localActualizado = await prisma.local.update({
      where: { id },
      data: { activo: false }
    });

    res.json({ message: 'Local desactivado exitosamente', local: localActualizado });
  } catch (error) {
    next(error);
  }
});

export default router;

