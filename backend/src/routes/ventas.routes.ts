import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, filterByLocal } from '../middleware/auth';
import { createAuditLog } from '../utils/audit';
import { io } from '../index';
import { emitStockAlert } from '../config/socket';
import { crearNotificacion } from './notificaciones.routes';
import { calcularPrecioPorCantidad } from '../utils/precio.util';

const router = Router();

const crearVentaSchema = z.object({
  clienteId: z.string().uuid().optional().nullable(),
  nombreComprador: z.string().optional(), // Para ventas remotas
  localOrigenId: z.string().uuid().optional(), // Para ventas remotas (local donde se vende físicamente)
  metodoPago: z.enum(['EFECTIVO', 'CREDITO', 'MIXTO', 'DEBITO', 'QR', 'TARJETA_CREDITO', 'TRANSFERENCIA']).default('EFECTIVO'),
  montoEfectivo: z.number().min(0).optional(),
  montoOtro: z.number().min(0).optional(),
  productos: z.array(
    z.object({
      productoId: z.string().uuid(),
      cantidad: z.number().int().positive(),
    })
  ).min(1, 'Debe incluir al menos un producto'),
});

// Aplicar autenticación a todas las rutas
router.use(authenticate);

// POST /ventas - Crear una nueva venta (solo VENDEDOR)
router.post('/', filterByLocal, async (req, res, next) => {
  try {
    const user = req.user!;
    
    // Solo vendedores pueden crear ventas
    if (user.role !== 'VENDEDOR') {
      res.status(403).json({ error: 'Solo los vendedores pueden realizar ventas' });
      return;
    }

    if (!user.localId) {
      res.status(403).json({ error: 'Debes tener un local asignado para realizar ventas' });
      return;
    }

    // Verificar que el vendedor tenga una caja abierta
    const cajaAbierta = await prisma.aperturaCaja.findFirst({
      where: {
        vendedorId: user.id,
        localId: user.localId,
        estado: 'ABIERTA',
      },
    });

    if (!cajaAbierta) {
      res.status(400).json({ 
        error: 'Debes abrir una caja antes de realizar ventas',
        requiereApertura: true,
      });
      return;
    }

    const data = crearVentaSchema.parse(req.body);

    // Verificar que el cliente existe (si se proporciona)
    if (data.clienteId) {
      const cliente = await prisma.cliente.findUnique({
        where: { id: data.clienteId },
      });

      if (!cliente) {
        res.status(404).json({ error: 'Cliente no encontrado' });
        return;
      }
    }

    // Determinar si es venta remota
    const esVentaRemota = data.localOrigenId && data.localOrigenId !== user.localId;
    const localVenta = esVentaRemota ? data.localOrigenId! : user.localId!;

    // Si es venta remota, verificar que el local origen existe
    if (esVentaRemota) {
      const localOrigen = await prisma.local.findUnique({
        where: { id: data.localOrigenId },
      });
      if (!localOrigen) {
        res.status(404).json({ error: 'Local origen no encontrado' });
        return;
      }
    }

    // Validar productos y calcular totales
    const detallesVenta: Array<{
      productoId: string;
      cantidad: number;
      precioUnitario: number;
      subtotal: number;
      stockDisponible: number;
      localStockId?: string; // Para ventas remotas
    }> = [];

    let totalVenta = 0;

    for (const detalle of data.productos) {
      // Buscar producto con stock
      const producto = await prisma.producto.findUnique({
        where: { id: detalle.productoId },
        include: {
          stocks: {
            where: esVentaRemota 
              ? { localId: localVenta } // Stock del local origen en venta remota
              : { localId: user.localId }, // Stock del local del vendedor
          },
          preciosLocales: esVentaRemota
            ? {
                where: { localId: localVenta, precioAprobado: true },
              }
            : {
                where: { localId: user.localId, precioAprobado: true },
              },
          preciosPorCantidad: {
            where: { activo: true },
            orderBy: { cantidad: 'desc' },
          },
        },
      });

      if (!producto || !producto.activo) {
        res.status(404).json({ error: `Producto ${detalle.productoId} no encontrado o inactivo` });
        return;
      }

      const stock = producto.stocks[0];
      const stockDisponible = stock ? stock.cantidad : 0;

      // Si no hay stock en el local, buscar en otros locales (solo para vendedores)
      if (stockDisponible < detalle.cantidad && !esVentaRemota) {
        // Buscar stock en otros locales
        const otrosStocks = await prisma.stock.findMany({
          where: {
            productoId: detalle.productoId,
            cantidad: {
              gte: detalle.cantidad,
            },
            local: {
              activo: true,
            },
          },
          include: {
            local: {
              select: {
                id: true,
                nombre: true,
              },
            },
          },
        });

        if (otrosStocks.length > 0) {
          // Devolver información de disponibilidad en otros locales
          res.status(400).json({
            error: `Stock insuficiente en tu local. Disponible: ${stockDisponible}`,
            disponibleEnOtrosLocales: otrosStocks.map((s: { localId: string; local: { nombre: string }; cantidad: number }) => ({
              localId: s.localId,
              localNombre: s.local.nombre,
              cantidad: s.cantidad,
            })),
            sugerencia: 'Puedes realizar una venta remota especificando el localOrigenId',
          });
          return;
        } else {
          res.status(400).json({
            error: `Stock insuficiente para el producto ${producto.nombre}. Disponible: ${stockDisponible}, Solicitado: ${detalle.cantidad}`,
          });
          return;
        }
      } else if (stockDisponible < detalle.cantidad && esVentaRemota) {
        res.status(400).json({
          error: `Stock insuficiente en el local origen para el producto ${producto.nombre}. Disponible: ${stockDisponible}, Solicitado: ${detalle.cantidad}`,
        });
        return;
      }

      // Calcular precio: usar precio local aprobado si existe, sino precio del producto
      let precioUnitario = producto.precio ? Number(producto.precio) : 0;
      if (producto.preciosLocales && producto.preciosLocales.length > 0) {
        precioUnitario = Number(producto.preciosLocales[0].precio);
      }

      // Verificar si hay precio por cantidad
      const precioPorCantidad = calcularPrecioPorCantidad(
        precioUnitario,
        detalle.cantidad,
        producto.preciosPorCantidad.map((p: { cantidad: number; precio: number }) => ({
          cantidad: p.cantidad,
          precio: p.precio,
        }))
      );

      const subtotal = precioPorCantidad;

      detallesVenta.push({
        productoId: producto.id,
        cantidad: detalle.cantidad,
        precioUnitario: precioPorCantidad / detalle.cantidad, // Precio unitario efectivo
        subtotal,
        stockDisponible,
        localStockId: esVentaRemota ? localVenta : undefined,
      });

      totalVenta += subtotal;
    }

    // Validar montos según método de pago
    if (data.metodoPago === 'MIXTO') {
      if (!data.montoEfectivo || !data.montoOtro) {
        res.status(400).json({ error: 'Para pago mixto debes especificar montoEfectivo y montoOtro' });
        return;
      }
      const sumaMontos = Number(data.montoEfectivo) + Number(data.montoOtro);
      if (sumaMontos < totalVenta - 0.01) {
        res.status(400).json({ error: 'La suma de los montos no puede ser menor al total de la venta' });
        return;
      }
      // Permitir que sea mayor (no hay problema, solo se cobra el total)
    } else if (data.metodoPago === 'EFECTIVO') {
      if (!data.montoEfectivo || Number(data.montoEfectivo) <= 0) {
        res.status(400).json({ error: 'Debes especificar el monto recibido en efectivo' });
        return;
      }
      if (Number(data.montoEfectivo) < totalVenta - 0.01) {
        res.status(400).json({ error: 'El monto recibido no puede ser menor al total de la venta' });
        return;
      }
      // Permitir que sea mayor (se calculará el cambio automáticamente)
    } else { // Otros métodos de pago (Débito, Crédito, QR, Transferencia)
      if (data.montoEfectivo !== undefined && data.montoEfectivo !== null) {
        res.status(400).json({ error: `Para el método de pago ${data.metodoPago}, no se debe especificar monto en efectivo.` });
        return;
      }
      if (data.montoOtro === undefined || data.montoOtro === null) {
        res.status(400).json({ error: `Para el método de pago ${data.metodoPago}, el monto debe ser especificado.` });
        return;
      }
      if (Number(data.montoOtro) < totalVenta - 0.01) {
        res.status(400).json({ error: `El monto para ${data.metodoPago} no puede ser menor al total de la venta.` });
        return;
      }
      // Permitir que sea mayor o igual
    }

    // Crear venta con transacción
    const venta = await prisma.$transaction(async (tx: any) => {
      // Crear la venta
      const nuevaVenta = await tx.venta.create({
        data: {
          localId: esVentaRemota ? localVenta : user.localId,
          localOrigenId: esVentaRemota ? localVenta : null,
          vendedorId: user.id,
          clienteId: data.clienteId || null,
          nombreComprador: data.nombreComprador || null,
          aperturaCajaId: cajaAbierta.id,
          total: totalVenta,
          metodoPago: data.metodoPago,
          esVentaRemota: esVentaRemota,
          montoEfectivo: data.metodoPago === 'EFECTIVO' || data.metodoPago === 'MIXTO' 
            ? (data.montoEfectivo ? Number(data.montoEfectivo) : (data.metodoPago === 'EFECTIVO' ? totalVenta : null))
            : null,
          montoOtro: data.metodoPago === 'MIXTO' ? (data.montoOtro ? Number(data.montoOtro) : null) : null,
          estado: 'COMPLETADA',
          detalles: {
            create: detallesVenta.map((d) => ({
              productoId: d.productoId,
              cantidad: d.cantidad,
              precioUnitario: d.precioUnitario,
              subtotal: d.subtotal,
            })),
          },
        },
        include: {
          detalles: {
            include: {
              producto: true,
            },
          },
          cliente: true,
        },
      });

      // Actualizar stock de cada producto (del local origen en venta remota)
      for (const detalle of detallesVenta) {
        const localStockId = detalle.localStockId || user.localId!;
        
        const stockActualizado = await tx.stock.updateMany({
          where: {
            productoId: detalle.productoId,
            localId: localStockId,
          },
          data: {
            cantidad: {
              decrement: detalle.cantidad,
            },
          },
        });

        // Verificar si el stock quedó por debajo del mínimo
        const stockFinal = await tx.stock.findUnique({
          where: {
            productoId_localId: {
              productoId: detalle.productoId,
              localId: localStockId,
            },
          },
        });

        if (stockFinal && stockFinal.cantidad <= stockFinal.stockMinimo) {
          const producto = await tx.producto.findUnique({
            where: { id: detalle.productoId },
          });

          if (producto) {
            emitStockAlert(io, stockFinal, producto);
          }
        }
      }

      // Actualizar puntos del cliente (si aplica)
      if (data.clienteId) {
        const puntosAgregados = Math.floor(totalVenta / 10); // 1 punto por cada $10
        if (puntosAgregados > 0) {
          await tx.cliente.update({
            where: { id: data.clienteId },
            data: {
              puntos: {
                increment: puntosAgregados,
              },
            },
          });
        }
      }

      return nuevaVenta;
    });

    // Log de auditoría
    await createAuditLog({
      userId: user.id,
      accion: 'CREATE',
      tabla: 'Venta',
      datosNuevos: venta,
    });

    // Si es venta remota, crear notificación al local origen
    if (esVentaRemota && data.localOrigenId) {
      const localOrigen = await prisma.local.findUnique({
        where: { id: data.localOrigenId },
      });

      if (localOrigen) {
        await crearNotificacion({
          tipo: 'VENTA_REMOTA',
          titulo: `Venta remota realizada`,
          mensaje: `El vendedor ${(user as any).nombre || user.username || user.id} realizó una venta remota por $${venta.total.toFixed(2)}${data.nombreComprador ? ` a ${data.nombreComprador}` : ''}. Productos vendidos desde ${localOrigen.nombre}.`,
          localId: data.localOrigenId,
          ventaId: venta.id,
        });
      }
    }

    // Emitir evento de nueva venta para actualizar dashboards
    if (io) {
      // Notificar al local específico
      const localNotificacion = esVentaRemota ? localVenta : user.localId;
      if (localNotificacion) {
        io.to(`local:${localNotificacion}`).emit('nueva-venta', {
          ventaId: venta.id,
          total: venta.total,
          localId: localNotificacion,
          fecha: venta.fecha,
          esVentaRemota,
        });
      }
      // Notificar a los admins
      io.to('admin').emit('nueva-venta', {
        ventaId: venta.id,
        total: venta.total,
        localId: localNotificacion,
        fecha: venta.fecha,
        esVentaRemota,
      });
    }

    res.status(201).json(venta);
  } catch (error) {
    next(error);
  }
});

// GET /ventas - Listar ventas (filtrado por local para vendedores)
router.get('/', filterByLocal, async (req, res, next) => {
  try {
    const user = req.user!;
    const { fechaDesde, fechaHasta, clienteId, estado, page = '1', limit = '50' } = req.query;

    const where: any = {};

    // Filtrar por local (vendedor solo ve su local)
    if (user.localId) {
      where.localId = user.localId;
    }

    if (fechaDesde || fechaHasta) {
      where.fecha = {};
      if (fechaDesde) {
        where.fecha.gte = new Date(fechaDesde as string);
      }
      if (fechaHasta) {
        where.fecha.lte = new Date(fechaHasta as string);
      }
    }

    if (clienteId) {
      where.clienteId = clienteId;
    }

    if (estado) {
      where.estado = estado;
    }

    // Para vendedores, solo sus propias ventas
    if (user.role === 'VENDEDOR') {
      where.vendedorId = user.id;
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [ventas, total] = await Promise.all([
      prisma.venta.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { fecha: 'desc' },
        include: {
          vendedor: {
            select: {
              id: true,
              nombre: true,
              username: true,
            },
          },
          cliente: {
            select: {
              id: true,
              nombre: true,
              email: true,
            },
          },
          detalles: {
            include: {
              producto: {
                select: {
                  id: true,
                  nombre: true,
                  codigoBarras: true,
                },
              },
            },
          },
        },
      }),
      prisma.venta.count({ where }),
    ]);

    res.json({
      ventas,
      paginacion: {
        total,
        pagina: parseInt(page as string),
        limite: parseInt(limit as string),
        totalPaginas: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /ventas/:id - Obtener una venta específica
router.get('/:id', filterByLocal, async (req, res, next) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const where: any = { id };

    // Vendedor solo puede ver ventas de su local
    if (user.localId) {
      where.localId = user.localId;
    }

    // Vendedor solo puede ver sus propias ventas
    if (user.role === 'VENDEDOR') {
      where.vendedorId = user.id;
    }

    const venta = await prisma.venta.findFirst({
      where,
      include: {
        local: true,
        vendedor: {
          select: {
            id: true,
            nombre: true,
            username: true,
          },
        },
        cliente: true,
        detalles: {
          include: {
            producto: true,
          },
        },
      },
    });

    if (!venta) {
      res.status(404).json({ error: 'Venta no encontrada' });
      return;
    }

    res.json(venta);
  } catch (error) {
    next(error);
  }
});

// PUT /ventas/:id/cancelar - Cancelar una venta
router.put('/:id/cancelar', filterByLocal, async (req, res, next) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const where: any = { id };

    if (user.localId) {
      where.localId = user.localId;
    }

    if (user.role === 'VENDEDOR') {
      where.vendedorId = user.id;
    }

    const venta = await prisma.venta.findFirst({
      where,
      include: {
        detalles: true,
        cliente: true,
      },
    });

    if (!venta) {
      res.status(404).json({ error: 'Venta no encontrada' });
      return;
    }

    if (venta.estado === 'CANCELADA') {
      res.status(400).json({ error: 'La venta ya está cancelada' });
      return;
    }

    // Restaurar stock y puntos (transacción)
    const ventaCancelada = await prisma.$transaction(async (tx: any) => {
      // Restaurar stock
      for (const detalle of venta.detalles) {
        await tx.stock.updateMany({
          where: {
            productoId: detalle.productoId,
            localId: venta.localId,
          },
          data: {
            cantidad: {
              increment: detalle.cantidad,
            },
          },
        });
      }

      // Restar puntos del cliente si tenía
      if (venta.clienteId && venta.cliente) {
        const puntosRestados = Math.floor(Number(venta.total) / 10);
        if (puntosRestados > 0 && venta.cliente.puntos >= puntosRestados) {
          await tx.cliente.update({
            where: { id: venta.clienteId },
            data: {
              puntos: {
                decrement: puntosRestados,
              },
            },
          });
        }
      }

      // Marcar venta como cancelada
      return await tx.venta.update({
        where: { id },
        data: { estado: 'CANCELADA' },
      });
    });

    // Log de auditoría
    await createAuditLog({
      userId: user.id,
      accion: 'CANCEL',
      tabla: 'Venta',
      datosAnteriores: venta,
      datosNuevos: ventaCancelada,
    });

    res.json(ventaCancelada);
  } catch (error) {
    next(error);
  }
});

export default router;

