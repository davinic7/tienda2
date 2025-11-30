import { Router } from 'express';
import { z } from 'zod';
import { prisma, socketIO } from '../index';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/audit.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);
router.use(auditLog);

const createProductoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string().optional(),
  precio: z.number().positive('El precio debe ser positivo'),
  categoria: z.string().optional(),
  codigo_barras: z.string().optional(),
  imagen_url: z.string().url('URL inválida').optional().or(z.literal('')),
  stockInicial: z.number().int().min(0).optional(), // Stock inicial para todos los locales
  stockMinimo: z.number().int().min(0).optional().default(10) // Stock mínimo por defecto
});

const updateProductoSchema = createProductoSchema.partial();

// GET /api/productos - Listar productos
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { categoria, activo, search } = req.query;

    const where: any = {};

    if (categoria) {
      where.categoria = categoria as string;
    }

    if (activo !== undefined) {
      where.activo = activo === 'true';
    }

    if (search) {
      const searchTerm = search as string;
      // MySQL no soporta mode: 'insensitive', pero las búsquedas son case-insensitive por defecto
      // dependiendo del collation de la base de datos
      where.OR = [
        { nombre: { contains: searchTerm } },
        { codigo_barras: { contains: searchTerm } }
      ];
    }

    const productos = await prisma.producto.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        stocks: {
          include: {
            local: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        },
        _count: {
          select: { stocks: true, ventaDetalles: true }
        }
      }
    });

    res.json({ productos });
  } catch (error) {
    next(error);
  }
});

// GET /api/productos/:id - Obtener producto por ID
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const producto = await prisma.producto.findUnique({
      where: { id },
      include: {
        stocks: {
          include: {
            local: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        }
      }
    });

    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({ producto });
  } catch (error) {
    next(error);
  }
});

// POST /api/productos - Crear producto (ADMIN y VENDEDOR)
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const data = createProductoSchema.parse(req.body);
    const { stockInicial, stockMinimo, ...productoData } = data;

    // Crear producto y stock inicial en una transacción
    const producto = await prisma.$transaction(async (tx) => {
      // Crear el producto
      const nuevoProducto = await tx.producto.create({
        data: {
          ...productoData,
          precio: productoData.precio
        }
      });

      // Si se especifica stock inicial, crear stock para todos los locales activos
      if (stockInicial !== undefined && stockInicial > 0) {
        const locales = await tx.local.findMany({
          where: { activo: true },
          select: { id: true }
        });

        // Crear stock para cada local
        for (const local of locales) {
          await tx.stock.create({
            data: {
              productoId: nuevoProducto.id,
              localId: local.id,
              cantidad: stockInicial,
              stock_minimo: stockMinimo || 10
            }
          });
        }
      }

      // TODO: Cuando PrecioLocal esté habilitado en el schema, crear precios para cada local aquí

      // Retornar producto con sus stocks y precios
      return await tx.producto.findUnique({
        where: { id: nuevoProducto.id },
        include: {
          stocks: {
            include: {
              local: {
                select: {
                  id: true,
                  nombre: true
                }
              }
            }
          },
          // precios: {
          //   include: {
          //     local: {
          //       select: {
          //         id: true,
          //         nombre: true
          //       }
          //     }
          //   }
          // }
        }
      });
    });

    res.status(201).json({ producto });
  } catch (error) {
    next(error);
  }
});

// PUT /api/productos/:id - Actualizar producto
router.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const data = updateProductoSchema.parse(req.body);

    // Obtener datos anteriores para auditoría
    const productoAnterior = await prisma.producto.findUnique({
      where: { id }
    });

    if (!productoAnterior) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // Los VENDEDOR no pueden modificar el precio (solo ADMIN)
    if (req.user?.role === 'VENDEDOR' && data.precio !== undefined) {
      return res.status(403).json({ error: 'No tienes permisos para modificar el precio. Solo puedes actualizar descripción, categoría e imagen.' });
    }

    // Si se actualiza el precio, notificar por Socket.io (solo ADMIN puede hacerlo)
    const precioCambiado = req.user?.role === 'ADMIN' && data.precio !== undefined && data.precio !== Number(productoAnterior.precio);

    const producto = await prisma.producto.update({
      where: { id },
      data: {
        ...data,
        precio: data.precio !== undefined ? data.precio : undefined
      }
    });

    // Emitir evento de actualización de precio si cambió (solo ADMIN)
    if (precioCambiado) {
      socketIO.emit('price:updated', {
        productoId: producto.id,
        nuevoPrecio: producto.precio,
        nombre: producto.nombre,
        fecha: new Date()
      });
    }

    res.json({ producto });
  } catch (error) {
    next(error);
  }
});

// POST /api/productos/:id/inicializar-stock - Inicializar stock de un producto en todos los locales
router.post('/:id/inicializar-stock', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { cantidad, stockMinimo } = req.body;

    if (!cantidad || cantidad < 0) {
      return res.status(400).json({ error: 'La cantidad debe ser un número positivo' });
    }

    // Verificar que el producto existe
    const producto = await prisma.producto.findUnique({
      where: { id }
    });

    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // Obtener todos los locales activos
    const locales = await prisma.local.findMany({
      where: { activo: true },
      select: { id: true }
    });

    // Crear o actualizar stock para cada local
    const stocksCreados = await prisma.$transaction(
      locales.map((local) =>
        prisma.stock.upsert({
          where: {
            productoId_localId: {
              productoId: id,
              localId: local.id
            }
          },
          create: {
            productoId: id,
            localId: local.id,
            cantidad: cantidad,
            stock_minimo: stockMinimo || 10
          },
          update: {
            cantidad: {
              increment: cantidad
            },
            ...(stockMinimo !== undefined && { stock_minimo: stockMinimo })
          }
        })
      )
    );

    res.json({
      message: `Stock inicializado en ${stocksCreados.length} locales`,
      stocks: stocksCreados
    });
  } catch (error) {
    next(error);
  }
});

// TODO: Rutas de PrecioLocal comentadas hasta que el modelo esté habilitado en el schema
// PUT /api/productos/:id/precios/:localId - Actualizar precio de un producto en un local específico
// router.put('/:id/precios/:localId', requireRole('ADMIN'), async (req: AuthRequest, res, next) => {
//   try {
//     const { id, localId } = req.params;
//     const { precio } = req.body;

//     if (!precio || precio <= 0) {
//       return res.status(400).json({ error: 'El precio debe ser un número positivo' });
//     }

//     // Verificar que el producto existe
//     const producto = await prisma.producto.findUnique({
//       where: { id }
//     });

//     if (!producto) {
//       return res.status(404).json({ error: 'Producto no encontrado' });
//     }

//     // Verificar que el local existe
//     const local = await prisma.local.findUnique({
//       where: { id: localId }
//     });

//     if (!local) {
//       return res.status(404).json({ error: 'Local no encontrado' });
//     }

//     // Crear o actualizar precio
//     const precioLocal = await prisma.precioLocal.upsert({
//       where: {
//         productoId_localId: {
//           productoId: id,
//           localId: localId
//         }
//       },
//       create: {
//         productoId: id,
//         localId: localId,
//         precio: precio
//       },
//       update: {
//         precio: precio
//       },
//       include: {
//         local: {
//           select: {
//             id: true,
//             nombre: true
//           }
//         }
//       }
//     });

//     // Emitir evento de actualización de precio
//     socketIO.emit('price:updated', {
//       productoId: id,
//       localId: localId,
//       nuevoPrecio: precioLocal.precio,
//       nombre: producto.nombre,
//       local: local.nombre,
//       fecha: new Date()
//     });

//     res.json({ precioLocal });
//   } catch (error) {
//     next(error);
//   }
// });

// GET /api/productos/:id/precios - Obtener todos los precios de un producto por local
// router.get('/:id/precios', async (req: AuthRequest, res, next) => {
//   try {
//     const { id } = req.params;

//     const producto = await prisma.producto.findUnique({
//       where: { id }
//     });

//     if (!producto) {
//       return res.status(404).json({ error: 'Producto no encontrado' });
//     }

//     const precios = await prisma.precioLocal.findMany({
//       where: { productoId: id },
//       include: {
//         local: {
//           select: {
//             id: true,
//             nombre: true
//           }
//         }
//       }
//     });

//     res.json({ precios });
//   } catch (error) {
//     next(error);
//   }
// });

// DELETE /api/productos/:id - Eliminar producto (solo ADMIN puede eliminar)
router.delete('/:id', requireRole('ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    // Soft delete: marcar como inactivo
    const producto = await prisma.producto.update({
      where: { id },
      data: { activo: false }
    });

    res.json({ message: 'Producto eliminado exitosamente', producto });
  } catch (error) {
    next(error);
  }
});

export default router;

