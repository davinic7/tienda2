import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/audit.middleware';

const router = Router();

router.use(authenticateToken);
router.use(auditLog);

const createClienteSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  dni: z.string().optional().or(z.literal('')),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefono: z.string().optional(),
  credito: z.number().min(0, 'El crédito no puede ser negativo').optional()
});

// GET /api/clientes - Listar clientes
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { search } = req.query;

    const where: any = {};

    if (search) {
      const searchTerm = search as string;
      // MySQL no soporta mode: 'insensitive', pero las búsquedas son case-insensitive por defecto
      // dependiendo del collation de la base de datos
      where.OR = [
        { nombre: { contains: searchTerm } },
        { dni: { contains: searchTerm } },
        { email: { contains: searchTerm } },
        { telefono: { contains: searchTerm } }
      ];
    }

    const clientes = await prisma.cliente.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { ventas: true }
        }
      }
    });

    res.json({ clientes });
  } catch (error) {
    next(error);
  }
});

// GET /api/clientes/:id - Obtener cliente por ID
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const cliente = await prisma.cliente.findUnique({
      where: { id },
      include: {
        ventas: {
          take: 10,
          orderBy: { fecha: 'desc' },
          include: {
            local: {
              select: {
                id: true,
                nombre: true
              }
            },
            vendedor: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        }
      }
    });

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    res.json({ cliente });
  } catch (error) {
    next(error);
  }
});

// POST /api/clientes - Crear cliente
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const data = createClienteSchema.parse(req.body);

    const cliente = await prisma.cliente.create({
      data: {
        ...data,
        email: data.email || undefined,
        dni: data.dni || undefined
      }
    });

    res.status(201).json({ cliente });
  } catch (error) {
    next(error);
  }
});

// PUT /api/clientes/:id - Actualizar cliente
router.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const data = createClienteSchema.partial().parse(req.body);

    const cliente = await prisma.cliente.update({
      where: { id },
      data: {
        ...data,
        email: data.email || undefined,
        dni: data.dni || undefined
      }
    });

    res.json({ cliente });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/clientes/:id - Eliminar cliente
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    // Verificar que el cliente existe
    const cliente = await prisma.cliente.findUnique({
      where: { id },
      include: {
        _count: {
          select: { ventas: true }
        }
      }
    });

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Si el cliente tiene ventas, no se puede eliminar completamente
    // En su lugar, se podría implementar un soft delete
    await prisma.cliente.delete({
      where: { id }
    });

    res.json({ message: 'Cliente eliminado exitosamente' });
  } catch (error: any) {
    // Error de foreign key constraint
    if (error.code === 'P2003') {
      return res.status(400).json({
        error: 'No se puede eliminar el cliente porque tiene ventas asociadas'
      });
    }
    next(error);
  }
});

export default router;

