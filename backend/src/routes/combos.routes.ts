import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { createAuditLog } from '../utils/audit';

const router = Router();

const comboCreateSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  precioPromocional: z.number().positive(),
  imagenUrl: z.string().url().optional().or(z.literal('')),
  productos: z.array(
    z.object({
      productoId: z.string().uuid(),
      cantidad: z.number().int().positive().default(1),
    })
  ).min(1, 'Debe incluir al menos un producto'),
});

const comboUpdateSchema = z.object({
  nombre: z.string().min(1).optional(),
  descripcion: z.string().optional(),
  precioPromocional: z.number().positive().optional(),
  imagenUrl: z.string().url().optional().or(z.literal('')).nullable(),
  activo: z.boolean().optional(),
});

// Aplicar autenticación a todas las rutas
router.use(authenticate);

// GET /combos - Listar combos
router.get('/', async (req, res, next) => {
  try {
    const { activo, search } = req.query;

    const where: any = {};

    if (activo !== undefined) {
      where.activo = activo === 'true';
    }

    if (search) {
      where.nombre = { contains: search as string, mode: 'insensitive' };
    }

    const combos = await prisma.combo.findMany({
      where,
      include: {
        productos: {
          include: {
            producto: {
              select: {
                id: true,
                nombre: true,
                precio: true,
                imagenUrl: true,
              },
            },
          },
        },
      },
      orderBy: { nombre: 'asc' },
    });

    res.json(combos);
  } catch (error) {
    next(error);
  }
});

// GET /combos/:id - Obtener un combo
router.get('/:id', async (req, res, next) => {
  try {
    const combo = await prisma.combo.findUnique({
      where: { id: req.params.id },
      include: {
        productos: {
          include: {
            producto: true,
          },
        },
      },
    });

    if (!combo) {
      res.status(404).json({ error: 'Combo no encontrado' });
      return;
    }

    res.json(combo);
  } catch (error) {
    next(error);
  }
});

// POST /combos - Crear combo (solo ADMIN)
router.post('/', authorize('ADMIN'), async (req, res, next) => {
  try {
    const data = comboCreateSchema.parse(req.body);

    // Verificar que todos los productos existen
    for (const item of data.productos) {
      const producto = await prisma.producto.findUnique({
        where: { id: item.productoId },
      });

      if (!producto || !producto.activo) {
        res.status(400).json({ error: `Producto ${item.productoId} no encontrado o inactivo` });
        return;
      }
    }

    const combo = await prisma.combo.create({
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        precioPromocional: data.precioPromocional,
        imagenUrl: data.imagenUrl || null,
        productos: {
          create: data.productos.map((p) => ({
            productoId: p.productoId,
            cantidad: p.cantidad,
          })),
        },
      },
      include: {
        productos: {
          include: {
            producto: true,
          },
        },
      },
    });

    // Log de auditoría
    await createAuditLog({
      userId: req.user!.id,
      accion: 'CREATE',
      tabla: 'Combo',
      datosNuevos: combo,
    });

    res.status(201).json(combo);
  } catch (error) {
    next(error);
  }
});

// PUT /combos/:id - Actualizar combo (solo ADMIN)
router.put('/:id', authorize('ADMIN'), async (req, res, next) => {
  try {
    const comboId = req.params.id;
    const data = comboUpdateSchema.parse(req.body);

    const comboAnterior = await prisma.combo.findUnique({
      where: { id: comboId },
    });

    if (!comboAnterior) {
      res.status(404).json({ error: 'Combo no encontrado' });
      return;
    }

    const comboActualizado = await prisma.combo.update({
      where: { id: comboId },
      data: {
        ...(data.nombre && { nombre: data.nombre }),
        ...(data.descripcion !== undefined && { descripcion: data.descripcion }),
        ...(data.precioPromocional && { precioPromocional: data.precioPromocional }),
        ...(data.imagenUrl !== undefined && { imagenUrl: data.imagenUrl || null }),
        ...(data.activo !== undefined && { activo: data.activo }),
      },
      include: {
        productos: {
          include: {
            producto: true,
          },
        },
      },
    });

    // Log de auditoría
    await createAuditLog({
      userId: req.user!.id,
      accion: 'UPDATE',
      tabla: 'Combo',
      datosAnteriores: comboAnterior,
      datosNuevos: comboActualizado,
    });

    res.json(comboActualizado);
  } catch (error) {
    next(error);
  }
});

// PUT /combos/:id/productos - Actualizar productos del combo (solo ADMIN)
router.put('/:id/productos', authorize('ADMIN'), async (req, res, next) => {
  try {
    const comboId = req.params.id;
    const { productos } = req.body;

    if (!Array.isArray(productos) || productos.length === 0) {
      res.status(400).json({ error: 'Debe incluir al menos un producto' });
      return;
    }

    // Verificar que todos los productos existen
    for (const item of productos) {
      const producto = await prisma.producto.findUnique({
        where: { id: item.productoId },
      });

      if (!producto || !producto.activo) {
        res.status(400).json({ error: `Producto ${item.productoId} no encontrado o inactivo` });
        return;
      }
    }

    // Eliminar productos actuales y crear nuevos
    await prisma.comboProducto.deleteMany({
      where: { comboId },
    });

    await prisma.comboProducto.createMany({
      data: productos.map((p: any) => ({
        comboId,
        productoId: p.productoId,
        cantidad: p.cantidad || 1,
      })),
    });

    const combo = await prisma.combo.findUnique({
      where: { id: comboId },
      include: {
        productos: {
          include: {
            producto: true,
          },
        },
      },
    });

    res.json(combo);
  } catch (error) {
    next(error);
  }
});

// DELETE /combos/:id - Eliminar combo (solo ADMIN)
router.delete('/:id', authorize('ADMIN'), async (req, res, next) => {
  try {
    const combo = await prisma.combo.findUnique({
      where: { id: req.params.id },
    });

    if (!combo) {
      res.status(404).json({ error: 'Combo no encontrado' });
      return;
    }

    // Soft delete
    const comboEliminado = await prisma.combo.update({
      where: { id: req.params.id },
      data: { activo: false },
    });

    // Log de auditoría
    await createAuditLog({
      userId: req.user!.id,
      accion: 'DELETE',
      tabla: 'Combo',
      datosAnteriores: combo,
      datosNuevos: comboEliminado,
    });

    res.json({ message: 'Combo eliminado correctamente', combo: comboEliminado });
  } catch (error) {
    next(error);
  }
});

export default router;

