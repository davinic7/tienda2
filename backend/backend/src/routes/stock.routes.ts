import { Router } from 'express';
import { z } from 'zod';
import { prisma, socketIO } from '../index';
import { authenticateToken, requireLocal, AuthRequest } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/audit.middleware';

const router = Router();

router.use(authenticateToken);
router.use(requireLocal);
router.use(auditLog);

const updateStockSchema = z.object({
  cantidad: z.number().int('La cantidad debe ser un número entero').optional(),
  stock_minimo: z.number().int('El stock mínimo debe ser un número entero').optional(),
  tipoMovimiento: z.enum(['entrada', 'salida', 'ajuste']).optional(),
  cantidadAnterior: z.number().optional(),
  tipo: z.enum(['entrada', 'salida']).optional(), // Mantener compatibilidad
  cantidad_movimiento: z.number().int('La cantidad de movimiento debe ser un número entero').optional()
});

// GET /api/stock - Consultar stock
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { productoId, localId, stockBajo } = req.query;

    const where: any = {};

    // Los vendedores solo ven el stock del local de su turno activo
    if (req.user?.role === 'VENDEDOR') {
      const turnoActivo = await prisma.turno.findFirst({
        where: {
          vendedorId: req.user.id,
          estado: 'ABIERTO'
        }
      });
      
      if (!turnoActivo) {
        return res.status(400).json({ 
          error: 'No tienes un turno abierto. Debes abrir un turno antes de ver el stock.' 
        });
      }
      
      where.localId = turnoActivo.localId;
    } else if (localId) {
      where.localId = localId as string;
    }

    if (productoId) {
      where.productoId = productoId as string;
    }

    if (stockBajo === 'true') {
      where.cantidad = {
        lte: prisma.stock.fields.stock_minimo
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
            categoria: true,
            imagen_url: true
          }
        },
        local: {
          select: {
            id: true,
            nombre: true
          }
        }
      },
      orderBy: [
        { cantidad: 'asc' },
        { producto: { nombre: 'asc' } }
      ]
    });

    res.json({ stocks });
  } catch (error) {
    next(error);
  }
});

// PUT /api/stock/:productoId/:localId - Actualizar stock
router.put('/:productoId/:localId', async (req: AuthRequest, res, next) => {
  try {
    const { productoId, localId } = req.params;
    const data = updateStockSchema.parse(req.body);

    // Verificar permisos: vendedores solo pueden actualizar el stock del local de su turno activo
    if (req.user?.role === 'VENDEDOR') {
      const turnoActivo = await prisma.turno.findFirst({
        where: {
          vendedorId: req.user.id,
          estado: 'ABIERTO'
        }
      });
      
      if (!turnoActivo) {
        return res.status(400).json({ 
          error: 'No tienes un turno abierto. Debes abrir un turno antes de actualizar el stock.' 
        });
      }
      
      if (turnoActivo.localId !== localId) {
        return res.status(403).json({ 
          error: 'Solo puedes actualizar el stock del local de tu turno activo' 
        });
      }
    }

    // Verificar que el producto existe
    const producto = await prisma.producto.findUnique({
      where: { id: productoId }
    });

    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // Verificar que el local existe
    const local = await prisma.local.findUnique({
      where: { id: localId }
    });

    if (!local) {
      return res.status(404).json({ error: 'Local no encontrado' });
    }

    // Buscar o crear stock
    let stock = await prisma.stock.findUnique({
      where: {
        productoId_localId: {
          productoId,
          localId
        }
      },
      include: {
        producto: true,
        local: true
      }
    });

    // Guardar datos anteriores para auditoría
    const datosAnteriores = stock ? {
      cantidad: stock.cantidad,
      stock_minimo: stock.stock_minimo,
      producto: {
        id: stock.productoId,
        nombre: stock.producto?.nombre || producto.nombre
      },
      local: {
        id: stock.localId,
        nombre: stock.local?.nombre || local.nombre
      }
    } : null;

    let nuevaCantidad: number;

    // Manejar tipoMovimiento (nuevo formato del frontend)
    if (data.tipoMovimiento && data.cantidad !== undefined) {
      if (!stock) {
        return res.status(404).json({ error: 'Stock no encontrado. Crea el stock primero' });
      }

      if (data.tipoMovimiento === 'entrada') {
        nuevaCantidad = stock.cantidad + Number(data.cantidad);
      } else if (data.tipoMovimiento === 'salida') {
        nuevaCantidad = Math.max(0, stock.cantidad - Number(data.cantidad));
      } else { // ajuste
        nuevaCantidad = Math.max(0, Number(data.cantidad));
      }
    } else if (data.tipo && data.cantidad_movimiento !== undefined) {
      // Movimiento de stock (entrada/salida) - formato legacy
      if (!stock) {
        return res.status(404).json({ error: 'Stock no encontrado. Crea el stock primero' });
      }

      if (data.tipo === 'entrada') {
        nuevaCantidad = stock.cantidad + data.cantidad_movimiento;
      } else {
        nuevaCantidad = Math.max(0, stock.cantidad - data.cantidad_movimiento);
      }
    } else if (data.cantidad !== undefined) {
      // Actualización directa de cantidad
      nuevaCantidad = Math.max(0, data.cantidad);
    } else {
      nuevaCantidad = stock?.cantidad || 0;
    }

    stock = await prisma.stock.upsert({
      where: {
        productoId_localId: {
          productoId,
          localId
        }
      },
      create: {
        productoId,
        localId,
        cantidad: nuevaCantidad,
        stock_minimo: data.stock_minimo || 10
      },
      update: {
        cantidad: nuevaCantidad,
        ...(data.stock_minimo !== undefined && { stock_minimo: data.stock_minimo })
      },
      include: {
        producto: true,
        local: true
      }
    });

    // Guardar datos nuevos para auditoría
    req.body.oldData = datosAnteriores;
    req.body.newData = {
      cantidad: stock.cantidad,
      stock_minimo: stock.stock_minimo,
      producto: {
        id: stock.productoId,
        nombre: stock.producto.nombre
      },
      local: {
        id: stock.localId,
        nombre: stock.local.nombre
      },
      tipoMovimiento: data.tipoMovimiento || data.tipo,
      cantidadMovimiento: data.cantidad || data.cantidad_movimiento
    };

    // Verificar stock bajo y emitir alerta si es necesario
    if (stock.cantidad <= stock.stock_minimo) {
      socketIO.emit('stock:low', {
        productoId: stock.productoId,
        localId: stock.localId,
        producto: {
          id: stock.producto.id,
          nombre: stock.producto.nombre
        },
        local: {
          id: stock.local.id,
          nombre: stock.local.nombre
        },
        cantidad: stock.cantidad,
        stock_minimo: stock.stock_minimo,
        fecha: new Date()
      });
    }

    res.json({ stock });
  } catch (error) {
    next(error);
  }
});

export default router;

