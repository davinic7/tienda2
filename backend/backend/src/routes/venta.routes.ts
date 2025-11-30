import { Router } from 'express';
import { z } from 'zod';
import { prisma, socketIO } from '../index';
import { authenticateToken, requireLocal, AuthRequest } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/audit.middleware';

const router = Router();

router.use(authenticateToken);
router.use(requireLocal);
router.use(auditLog);

const createVentaSchema = z.object({
  localId: z.string().uuid('ID de local inválido').optional(), // Permitir localId para ADMIN
  clienteId: z.union([z.string().uuid('ID de cliente inválido'), z.null()]).optional(),
  metodoPago: z.enum(['EFECTIVO', 'CREDITO', 'MIXTO']).default('EFECTIVO'),
  creditoUsado: z.number().min(0).default(0),
  efectivoRecibido: z.number().min(0).optional().or(z.null()),
  total: z.number().optional(), // Permitir total aunque se recalcule en el backend
  detalles: z.array(
    z.object({
      productoId: z.string().uuid('ID de producto inválido'),
      cantidad: z.number().int().positive('La cantidad debe ser positiva'),
      precio_unitario: z.number().positive('El precio unitario debe ser positivo'),
      subtotal: z.number().optional() // Permitir subtotal aunque no se use en validación
    })
  ).min(1, 'Debe haber al menos un producto en la venta')
}).passthrough(); // Permitir campos adicionales sin error

// POST /api/ventas - Crear venta
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const data = createVentaSchema.parse(req.body);
    // Para ADMIN, usar localId del body si se proporciona; para VENDEDOR, usar el del turno activo
    let localId: string;
    let turnoId: string | null = null;

    if (req.user!.role === 'ADMIN' && data.localId) {
      localId = data.localId;
    } else {
      // Para VENDEDOR, obtener el turno activo
      const turnoActivo = await prisma.turno.findFirst({
        where: {
          vendedorId: req.user!.id,
          estado: 'ABIERTO'
        }
      });

      if (!turnoActivo) {
        return res.status(400).json({ 
          error: 'No tienes un turno abierto. Debes abrir un turno antes de realizar ventas.' 
        });
      }

      localId = turnoActivo.localId;
      turnoId = turnoActivo.id;
    }

    const vendedorId = req.user!.id;

    if (!localId) {
      return res.status(400).json({ error: 'Local no especificado' });
    }

    // Validar que todos los productos existen y tienen stock suficiente
    const productoIds = data.detalles.map(d => d.productoId);
    const productos = await prisma.producto.findMany({
      where: { id: { in: productoIds }, activo: true }
    });

    if (productos.length !== productoIds.length) {
      return res.status(404).json({ error: 'Uno o más productos no encontrados' });
    }

    // Verificar stock y calcular total
    let total = 0;
    const stocks = await prisma.stock.findMany({
      where: {
        productoId: { in: productoIds },
        localId
      }
    });

    for (const detalle of data.detalles) {
      const producto = productos.find(p => p.id === detalle.productoId);
      if (!producto) {
        return res.status(404).json({ error: `Producto ${detalle.productoId} no encontrado` });
      }

      const stock = stocks.find(s => s.productoId === detalle.productoId);
      if (!stock || stock.cantidad < detalle.cantidad) {
        return res.status(400).json({
          error: `Stock insuficiente para el producto ${producto.nombre}. Disponible: ${stock?.cantidad || 0}, Solicitado: ${detalle.cantidad}`
        });
      }

      // Usar precio del detalle o precio del producto
      // TODO: Cuando se implemente PrecioLocal, usar precio del local aquí
      const precioUnitario = detalle.precio_unitario || Number(producto.precio);
      
      total += precioUnitario * detalle.cantidad;
      
      // Actualizar el precio en el detalle para que se guarde correctamente
      detalle.precio_unitario = precioUnitario;
    }

    // Validar crédito si se usa
    let creditoDisponible = 0;
    if (data.metodoPago === 'CREDITO' || data.metodoPago === 'MIXTO') {
      // Si el método de pago es CREDITO o MIXTO, se requiere un cliente
      if (!data.clienteId) {
        return res.status(400).json({ 
          error: 'Se requiere un cliente para pagar con crédito' 
        });
      }

      const cliente = await prisma.cliente.findUnique({
        where: { id: data.clienteId }
      });
      
      if (!cliente) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }
      
      creditoDisponible = Number(cliente.credito);
      
      // Para CREDITO, el crédito usado debe ser igual al total
      if (data.metodoPago === 'CREDITO') {
        if (data.creditoUsado !== total) {
          return res.status(400).json({
            error: `Para pago con crédito, el crédito usado debe ser igual al total. Total: $${total.toFixed(2)}, Crédito usado: $${data.creditoUsado.toFixed(2)}`
          });
        }
      }
      
      if (data.creditoUsado > creditoDisponible) {
        return res.status(400).json({
          error: `Crédito insuficiente. Disponible: $${creditoDisponible.toFixed(2)}, Solicitado: $${data.creditoUsado.toFixed(2)}`
        });
      }
      
      if (data.creditoUsado > total) {
        return res.status(400).json({
          error: 'El crédito usado no puede ser mayor al total de la venta'
        });
      }
    }

    // Crear venta y detalles en una transacción
    const venta = await prisma.$transaction(async (tx) => {
      // Actualizar crédito del cliente si se usa
      if (data.clienteId && data.creditoUsado > 0) {
        await tx.cliente.update({
          where: { id: data.clienteId },
          data: {
            credito: {
              decrement: data.creditoUsado
            }
          }
        });
      }

      // Crear venta
      const nuevaVenta = await tx.venta.create({
        data: {
          localId,
          vendedorId,
          clienteId: data.clienteId || null,
          turnoId: turnoId || null,
          total,
          estado: 'COMPLETADA',
          metodoPago: data.metodoPago,
          creditoUsado: data.creditoUsado,
          efectivoRecibido: data.efectivoRecibido || null
        }
      });

      // Crear detalles y actualizar stock
      const detalles = [];
      for (const detalle of data.detalles) {
        const nuevoDetalle = await tx.ventaDetalle.create({
          data: {
            ventaId: nuevaVenta.id,
            productoId: detalle.productoId,
            cantidad: detalle.cantidad,
            precio_unitario: detalle.precio_unitario,
            subtotal: detalle.precio_unitario * detalle.cantidad
          },
          include: {
            producto: {
              select: {
                id: true,
                nombre: true,
                codigo_barras: true
              }
            }
          }
        });

        // Descontar stock
        await tx.stock.update({
          where: {
            productoId_localId: {
              productoId: detalle.productoId,
              localId
            }
          },
          data: {
            cantidad: {
              decrement: detalle.cantidad
            }
          }
        });

        detalles.push(nuevoDetalle);
      }

      return { ...nuevaVenta, detalles };
    });

    // Obtener venta completa para respuesta
    const ventaCompleta = await prisma.venta.findUnique({
      where: { id: venta.id },
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
            nombre: true,
            email: true
          }
        },
        cliente: {
          select: {
            id: true,
            nombre: true,
            email: true,
            credito: true
          }
        },
        detalles: {
          include: {
            producto: {
              select: {
                id: true,
                nombre: true,
                codigo_barras: true
              }
            }
          }
        }
      }
    });

    // Guardar ID de venta para auditoría
    req.body.ventaId = venta.id;
    req.body.newData = {
      id: venta.id,
      localId: venta.localId,
      vendedorId: venta.vendedorId,
      clienteId: venta.clienteId,
      total: venta.total,
      metodoPago: venta.metodoPago,
      fecha: venta.fecha
    };

    // Emitir evento de nueva venta
    socketIO.emit('venta:created', {
      ventaId: venta.id,
      localId: venta.localId,
      total: venta.total,
      fecha: venta.fecha
    });

    res.status(201).json({ venta: ventaCompleta });
  } catch (error) {
    next(error);
  }
});

// GET /api/ventas - Listar ventas
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { fechaInicio, fechaFin, clienteId, localId, vendedorId, metodoPago } = req.query;

    const where: any = {};

    // Los vendedores solo ven ventas de su local
    if (req.user?.role === 'VENDEDOR' && req.user.localId) {
      where.localId = req.user.localId;
    } else if (localId) {
      // Para ADMIN, permitir filtrar por local
      where.localId = localId as string;
    }

    if (fechaInicio || fechaFin) {
      where.fecha = {};
      if (fechaInicio) {
        where.fecha.gte = new Date(fechaInicio as string);
      }
      if (fechaFin) {
        where.fecha.lte = new Date(fechaFin as string);
      }
    }

    if (clienteId) {
      where.clienteId = clienteId as string;
    }

    if (vendedorId) {
      where.vendedorId = vendedorId as string;
    }

    if (metodoPago) {
      where.metodoPago = metodoPago as string;
    }

    const ventas = await prisma.venta.findMany({
      where,
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
        },
        cliente: {
          select: {
            id: true,
            nombre: true,
            email: true,
            credito: true
          }
        },
        detalles: {
          include: {
            producto: {
              select: {
                id: true,
                nombre: true,
                precio: true
              }
            }
          }
        },
        _count: {
          select: { detalles: true }
        }
      },
      orderBy: { fecha: 'desc' },
      take: 100
    });

    res.json({ ventas });
  } catch (error) {
    next(error);
  }
});

// GET /api/ventas/:id - Obtener venta por ID
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const venta = await prisma.venta.findUnique({
      where: { id },
      include: {
        local: {
          select: {
            id: true,
            nombre: true,
            direccion: true
          }
        },
        vendedor: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        },
        cliente: {
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true
          }
        },
        detalles: {
          include: {
            producto: {
              select: {
                id: true,
                nombre: true,
                codigo_barras: true,
                categoria: true
              }
            }
          }
        }
      }
    });

    if (!venta) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    // Verificar permisos: vendedores solo pueden ver ventas de su local
    if (req.user?.role === 'VENDEDOR' && req.user.localId !== venta.localId) {
      return res.status(403).json({ error: 'No tienes acceso a esta venta' });
    }

    res.json({ venta });
  } catch (error) {
    next(error);
  }
});

export default router;

