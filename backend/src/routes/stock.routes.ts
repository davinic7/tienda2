import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, filterByLocal } from '../middleware/auth';
import { createAuditLog } from '../utils/audit';
import { io } from '../index';
import { emitStockAlert } from '../config/socket';

const router = Router();

const actualizarStockSchema = z.object({
  productoId: z.string().uuid(),
  cantidad: z.number().int(),
  tipo: z.enum(['ENTRADA', 'SALIDA', 'AJUSTE']),
  motivo: z.string().optional(),
});

// Aplicar autenticación a todas las rutas
router.use(authenticate);

// GET /stock - Listar stock del local (vendedor solo ve su local, admin ve todos)
router.get('/', filterByLocal, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const { localId, productoId, stockBajo } = req.query;

    const where: any = {};

    // Filtrar por local
    if (user.localId) {
      where.localId = user.localId;
    } else if (localId && user.role === 'ADMIN') {
      where.localId = localId;
    }

    if (productoId) {
      where.productoId = productoId;
    }

    if (stockBajo === 'true') {
      where.cantidad = {
        lte: prisma.stock.fields.stockMinimo,
      };
    }

    const stocks = await prisma.stock.findMany({
      where,
      include: {
        producto: {
          select: {
            id: true,
            nombre: true,
            precio: true,
            codigoBarras: true,
            categoria: true,
          },
        },
        local: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
      orderBy: [
        { producto: { nombre: 'asc' } },
      ],
    });

    res.json(stocks);
  } catch (error) {
    next(error);
  }
});

// GET /stock/:productoId/:localId - Obtener stock específico
router.get('/:productoId/:localId', filterByLocal, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const { productoId, localId } = req.params;

    // Vendedor solo puede ver stock de su local
    if (user.localId && user.localId !== localId) {
      res.status(403).json({ error: 'No tienes acceso a este local' });
      return;
    }

    const stock = await prisma.stock.findUnique({
      where: {
        productoId_localId: {
          productoId,
          localId,
        },
      },
      include: {
        producto: true,
        local: true,
      },
    });

    if (!stock) {
      res.status(404).json({ error: 'Stock no encontrado' });
      return;
    }

    res.json(stock);
  } catch (error) {
    next(error);
  }
});

// PUT /stock/actualizar - Actualizar stock (entrada/salida/ajuste)
router.put('/actualizar', filterByLocal, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const data = actualizarStockSchema.parse(req.body);

    if (!user.localId) {
      res.status(403).json({ error: 'Debes tener un local asignado para actualizar stock' });
      return;
    }

    // Verificar que el producto existe
    const producto = await prisma.producto.findUnique({
      where: { id: data.productoId },
    });

    if (!producto) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    // Buscar o crear stock
    let stock = await prisma.stock.findUnique({
      where: {
        productoId_localId: {
          productoId: data.productoId,
          localId: user.localId,
        },
      },
    });

    const stockAnterior = stock ? { ...stock } : null;

    if (!stock) {
      // Crear stock inicial
      stock = await prisma.stock.create({
        data: {
          productoId: data.productoId,
          localId: user.localId,
          cantidad: data.tipo === 'ENTRADA' ? data.cantidad : -data.cantidad,
          stockMinimo: 0,
        },
      });
    } else {
      // Actualizar stock según el tipo
      let nuevaCantidad = stock.cantidad;

      if (data.tipo === 'ENTRADA') {
        nuevaCantidad += data.cantidad;
      } else if (data.tipo === 'SALIDA') {
        nuevaCantidad -= data.cantidad;
        if (nuevaCantidad < 0) {
          res.status(400).json({
            error: `Stock insuficiente. Disponible: ${stock.cantidad}, Solicitado: ${data.cantidad}`,
          });
          return;
        }
      } else if (data.tipo === 'AJUSTE') {
        nuevaCantidad = data.cantidad;
      }

      stock = await prisma.stock.update({
        where: {
          productoId_localId: {
            productoId: data.productoId,
            localId: user.localId,
          },
        },
        data: {
          cantidad: nuevaCantidad,
        },
      });
    }

    // Verificar si el stock quedó por debajo del mínimo
    const stockFinal = await prisma.stock.findUnique({
      where: {
        productoId_localId: {
          productoId: data.productoId,
          localId: user.localId,
        },
      },
    });

    if (stockFinal && stockFinal.cantidad <= stockFinal.stockMinimo) {
      emitStockAlert(io, stockFinal, producto);
    }

    // Log de auditoría
    await createAuditLog({
      userId: user.id,
      accion: 'UPDATE',
      tabla: 'Stock',
      datosAnteriores: stockAnterior,
      datosNuevos: stock,
    });

    const stockConRelaciones = await prisma.stock.findUnique({
      where: {
        productoId_localId: {
          productoId: data.productoId,
          localId: user.localId,
        },
      },
      include: {
        producto: true,
        local: true,
      },
    });

    res.json(stockConRelaciones);
  } catch (error) {
    next(error);
  }
});

// PUT /stock/:productoId/:localId/minimo - Actualizar stock mínimo
router.put('/:productoId/:localId/minimo', filterByLocal, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const { productoId, localId } = req.params;
    const { stockMinimo } = req.body;

    if (!stockMinimo || typeof stockMinimo !== 'number' || stockMinimo < 0) {
      res.status(400).json({ error: 'Stock mínimo debe ser un número positivo' });
      return;
    }

    // Vendedor solo puede actualizar stock de su local
    if (user.localId && user.localId !== localId) {
      res.status(403).json({ error: 'No tienes acceso a este local' });
      return;
    }

    const stock = await prisma.stock.findUnique({
      where: {
        productoId_localId: {
          productoId,
          localId,
        },
      },
    });

    if (!stock) {
      res.status(404).json({ error: 'Stock no encontrado' });
      return;
    }

    const stockActualizado = await prisma.stock.update({
      where: {
        productoId_localId: {
          productoId,
          localId,
        },
      },
      data: {
        stockMinimo: stockMinimo,
      },
      include: {
        producto: true,
        local: true,
      },
    });

    // Log de auditoría
    await createAuditLog({
      userId: user.id,
      accion: 'UPDATE',
      tabla: 'Stock',
      datosAnteriores: stock,
      datosNuevos: stockActualizado,
    });

    res.json(stockActualizado);
  } catch (error) {
    next(error);
  }
});

export default router;

