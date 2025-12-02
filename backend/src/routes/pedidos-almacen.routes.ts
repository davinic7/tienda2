import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

const pedidoSchema = z.object({
  localId: z.string(),
  observaciones: z.string().optional(),
  detalles: z.array(z.object({
    productoId: z.string(),
    cantidad: z.number().int().min(1),
  })).min(1, 'Debe tener al menos un producto'),
});

// GET /api/pedidos-almacen - Listar pedidos
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { estado, localId } = req.query;
    const user = (req as any).user;

    const where: any = {};
    if (estado) where.estado = estado;
    
    // Los vendedores solo ven pedidos de su local
    if (user.role === 'VENDEDOR' && user.localId) {
      where.localId = user.localId;
    } else if (localId) {
      where.localId = localId as string;
    }

    const pedidos = await prisma.pedidoAlmacen.findMany({
      where,
      include: {
        local: true,
        solicitante: { select: { id: true, nombre: true, username: true } },
        autorizador: { select: { id: true, nombre: true, username: true } },
        detalles: {
          include: {
            producto: true,
          },
        },
      },
      orderBy: { fechaSolicitud: 'desc' },
    });

    res.json(pedidos);
  } catch (error) {
    next(error);
  }
});

// GET /api/pedidos-almacen/:id - Obtener pedido por ID
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const pedido = await prisma.pedidoAlmacen.findUnique({
      where: { id },
      include: {
        local: true,
        solicitante: { select: { id: true, nombre: true, username: true } },
        autorizador: { select: { id: true, nombre: true, username: true } },
        detalles: {
          include: {
            producto: true,
          },
        },
      },
    });

    if (!pedido) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    // Los vendedores solo pueden ver pedidos de su local
    if (user.role === 'VENDEDOR' && pedido.localId !== user.localId) {
      return res.status(403).json({ error: 'No tienes permiso para ver este pedido' });
    }

    res.json(pedido);
  } catch (error) {
    next(error);
  }
});

// POST /api/pedidos-almacen - Crear pedido (VENDEDOR o ADMIN)
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const data = pedidoSchema.parse(req.body);

    // Los vendedores solo pueden crear pedidos para su local
    if (user.role === 'VENDEDOR' && data.localId !== user.localId) {
      return res.status(403).json({ error: 'No puedes crear pedidos para otros locales' });
    }

    const pedido = await prisma.pedidoAlmacen.create({
      data: {
        localId: data.localId,
        solicitanteId: user.id,
        observaciones: data.observaciones,
        estado: user.role === 'ADMIN' ? 'AUTORIZADO' : 'PENDIENTE',
        fechaAutorizacion: user.role === 'ADMIN' ? new Date() : null,
        autorizadorId: user.role === 'ADMIN' ? user.id : null,
        detalles: {
          create: data.detalles.map((detalle) => ({
            productoId: detalle.productoId,
            cantidad: detalle.cantidad,
          })),
        },
      },
      include: {
        local: true,
        solicitante: { select: { id: true, nombre: true, username: true } },
        detalles: {
          include: {
            producto: true,
          },
        },
      },
    });

    res.status(201).json(pedido);
  } catch (error) {
    next(error);
  }
});

// PUT /api/pedidos-almacen/:id/autorizar - Autorizar pedido (ADMIN o DEPOSITO)
router.put('/:id/autorizar', authenticate, authorize('ADMIN', 'DEPOSITO'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const pedido = await prisma.pedidoAlmacen.update({
      where: { id },
      data: {
        estado: 'AUTORIZADO',
        autorizadorId: user.id,
        fechaAutorizacion: new Date(),
      },
      include: {
        local: true,
        solicitante: { select: { id: true, nombre: true, username: true } },
        autorizador: { select: { id: true, nombre: true, username: true } },
        detalles: {
          include: {
            producto: true,
          },
        },
      },
    });

    res.json(pedido);
  } catch (error) {
    next(error);
  }
});

// PUT /api/pedidos-almacen/:id/rechazar - Rechazar pedido (ADMIN o DEPOSITO)
router.put('/:id/rechazar', authenticate, authorize('ADMIN', 'DEPOSITO'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { motivo } = z.object({ motivo: z.string().optional() }).parse(req.body);
    const user = (req as any).user;

    const pedidoActual = await prisma.pedidoAlmacen.findUnique({
      where: { id },
    });

    if (!pedidoActual) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const pedido = await prisma.pedidoAlmacen.update({
      where: { id },
      data: {
        estado: 'RECHAZADO',
        autorizadorId: user.id,
        fechaAutorizacion: new Date(),
        observaciones: motivo ? `${pedidoActual.observaciones || ''}\nMotivo rechazo: ${motivo}`.trim() : pedidoActual.observaciones,
      },
      include: {
        local: true,
        solicitante: { select: { id: true, nombre: true, username: true } },
        autorizador: { select: { id: true, nombre: true, username: true } },
        detalles: {
          include: {
            producto: true,
          },
        },
      },
    });

    res.json(pedido);
  } catch (error) {
    next(error);
  }
});

// PUT /api/pedidos-almacen/:id/procesar - Procesar pedido autorizado (ADMIN o DEPOSITO)
router.put('/:id/procesar', authenticate, authorize('ADMIN', 'DEPOSITO'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const pedido = await prisma.pedidoAlmacen.findUnique({
      where: { id },
      include: {
        detalles: {
          include: {
            producto: true,
          },
        },
        local: true,
      },
    });

    if (!pedido) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    if (pedido.estado !== 'AUTORIZADO') {
      return res.status(400).json({ error: 'Solo se pueden procesar pedidos autorizados' });
    }

    // Obtener el primer depósito activo (o implementar lógica para seleccionar depósito)
    const deposito = await prisma.deposito.findFirst({
      where: { activo: true },
    });

    if (!deposito) {
      return res.status(400).json({ error: 'No hay depósitos activos' });
    }

    // Verificar stock disponible y crear movimientos
    const movimientos = [];
    for (const detalle of pedido.detalles) {
      const stockDeposito = await prisma.stockDeposito.findUnique({
        where: {
          productoId_depositoId: {
            productoId: detalle.productoId,
            depositoId: deposito.id,
          },
        },
      });

      if (!stockDeposito || stockDeposito.cantidad < detalle.cantidad) {
        return res.status(400).json({
          error: `Stock insuficiente para ${detalle.producto.nombre}`,
        });
      }

      // Reducir stock del depósito
      await prisma.stockDeposito.update({
        where: { id: stockDeposito.id },
        data: {
          cantidad: { decrement: detalle.cantidad },
        },
      });

      // Aumentar stock del local
      await prisma.stock.upsert({
        where: {
          productoId_localId: {
            productoId: detalle.productoId,
            localId: pedido.localId,
          },
        },
        update: {
          cantidad: { increment: detalle.cantidad },
        },
        create: {
          productoId: detalle.productoId,
          localId: pedido.localId,
          cantidad: detalle.cantidad,
        },
      });

      // Crear movimiento de stock
      const movimiento = await prisma.movimientoStock.create({
        data: {
          tipo: 'SALIDA_DEPOSITO',
          productoId: detalle.productoId,
          depositoId: deposito.id,
          localDestinoId: pedido.localId,
          cantidad: detalle.cantidad,
          usuarioId: user.id,
          pedidoId: pedido.id,
          motivo: `Procesamiento de pedido #${pedido.id}`,
        },
      });

      movimientos.push(movimiento);

      // Actualizar cantidad procesada
      await prisma.pedidoAlmacenDetalle.update({
        where: { id: detalle.id },
        data: { cantidadProcesada: detalle.cantidad },
      });
    }

    // Actualizar pedido a procesado
    const pedidoProcesado = await prisma.pedidoAlmacen.update({
      where: { id },
      data: {
        estado: 'PROCESADO',
        fechaProcesamiento: new Date(),
      },
      include: {
        local: true,
        solicitante: { select: { id: true, nombre: true, username: true } },
        autorizador: { select: { id: true, nombre: true, username: true } },
        detalles: {
          include: {
            producto: true,
          },
        },
      },
    });

    res.json(pedidoProcesado);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/pedidos-almacen/:id - Cancelar pedido
router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const pedido = await prisma.pedidoAlmacen.findUnique({
      where: { id },
    });

    if (!pedido) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    // Solo el solicitante o admin puede cancelar
    if (user.role !== 'ADMIN' && pedido.solicitanteId !== user.id) {
      return res.status(403).json({ error: 'No tienes permiso para cancelar este pedido' });
    }

    if (pedido.estado === 'PROCESADO') {
      return res.status(400).json({ error: 'No se puede cancelar un pedido procesado' });
    }

    await prisma.pedidoAlmacen.update({
      where: { id },
      data: { estado: 'CANCELADO' },
    });

    res.json({ message: 'Pedido cancelado' });
  } catch (error) {
    next(error);
  }
});

export default router;

