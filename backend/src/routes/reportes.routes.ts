import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, filterByLocal } from '../middleware/auth';

const router = Router();

// Aplicar autenticación a todas las rutas
router.use(authenticate);

// GET /reportes/ventas - Reporte de ventas
router.get('/ventas', filterByLocal, async (req, res, next) => {
  try {
    const user = req.user!;
    const { fechaDesde, fechaHasta, localId, vendedorId } = req.query;

    const where: any = {
      estado: 'COMPLETADA',
    };

    // Filtrar por local (vendedor solo ve su local)
    if (user.localId) {
      where.localId = user.localId;
    } else if (localId && user.role === 'ADMIN') {
      where.localId = localId;
    }

    // Filtrar por vendedor (vendedor solo ve sus ventas)
    if (user.role === 'VENDEDOR') {
      where.vendedorId = user.id;
    } else if (vendedorId) {
      where.vendedorId = vendedorId;
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

    const ventas = await prisma.venta.findMany({
      where,
      include: {
        local: {
          select: {
            id: true,
            nombre: true,
          },
        },
        vendedor: {
          select: {
            id: true,
            nombre: true,
          },
        },
        cliente: {
          select: {
            id: true,
            nombre: true,
          },
        },
        _count: {
          select: {
            detalles: true,
          },
        },
      },
      orderBy: { fecha: 'desc' },
    });

    // Calcular estadísticas
    const totalVentas = ventas.length;
    const totalMonto = ventas.reduce((sum: number, v: { total: number | string | null }) => sum + Number(v.total), 0);
    const promedioVenta = totalVentas > 0 ? totalMonto / totalVentas : 0;

    res.json({
      ventas,
      estadisticas: {
        totalVentas,
        totalMonto,
        promedioVenta,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /reportes/productos-mas-vendidos - Productos más vendidos
router.get('/productos-mas-vendidos', filterByLocal, async (req, res, next) => {
  try {
    const user = req.user!;
    const { fechaDesde, fechaHasta, localId, limite = '10' } = req.query;

    const whereVenta: any = {
      estado: 'COMPLETADA',
    };

    // Filtrar por local
    if (user.localId) {
      whereVenta.localId = user.localId;
    } else if (localId && user.role === 'ADMIN') {
      whereVenta.localId = localId;
    }

    if (fechaDesde || fechaHasta) {
      whereVenta.fecha = {};
      if (fechaDesde) {
        whereVenta.fecha.gte = new Date(fechaDesde as string);
      }
      if (fechaHasta) {
        whereVenta.fecha.lte = new Date(fechaHasta as string);
      }
    }

    // Obtener detalles de ventas con filtro
    const ventas = await prisma.venta.findMany({
      where: whereVenta,
      select: {
        id: true,
        detalles: {
          select: {
            productoId: true,
            cantidad: true,
            precioUnitario: true,
            subtotal: true,
            producto: {
              select: {
                id: true,
                nombre: true,
                codigoBarras: true,
                categoria: true,
              },
            },
          },
        },
      },
    });

    // Agrupar por producto
    const productosMap = new Map<string, {
      productoId: string;
      nombre: string;
      codigoBarras: string | null;
      categoria: string | null;
      cantidadTotal: number;
      montoTotal: number;
    }>();

    ventas.forEach((venta: { detalles: Array<{ productoId: string; cantidad: number; precio: number | string | null }> }) => {
      venta.detalles.forEach((detalle: { productoId: string; cantidad: number; precio: number | string | null }) => {
        const key = detalle.productoId;
        const existente = productosMap.get(key);

        if (existente) {
          existente.cantidadTotal += detalle.cantidad;
          existente.montoTotal += Number(detalle.subtotal);
        } else {
          productosMap.set(key, {
            productoId: detalle.producto.id,
            nombre: detalle.producto.nombre,
            codigoBarras: detalle.producto.codigoBarras,
            categoria: detalle.producto.categoria,
            cantidadTotal: detalle.cantidad,
            montoTotal: Number(detalle.subtotal),
          });
        }
      });
    });

    // Convertir a array y ordenar por cantidad
    const productosMasVendidos = Array.from(productosMap.values())
      .sort((a, b) => b.cantidadTotal - a.cantidadTotal)
      .slice(0, parseInt(limite as string));

    res.json(productosMasVendidos);
  } catch (error) {
    next(error);
  }
});

// GET /reportes/resumen - Resumen general
router.get('/resumen', filterByLocal, async (req, res, next) => {
  try {
    const user = req.user!;
    const { fechaDesde, fechaHasta, localId } = req.query;

    console.log('Reportes resumen - Fechas recibidas:', { fechaDesde, fechaHasta });

    const fechaInicio = fechaDesde ? new Date(fechaDesde as string) : new Date();
    fechaInicio.setHours(0, 0, 0, 0);

    const fechaFin = fechaHasta ? new Date(fechaHasta as string) : new Date();
    fechaFin.setHours(23, 59, 59, 999);

    console.log('Fechas procesadas:', { 
      fechaInicio: fechaInicio.toISOString(), 
      fechaFin: fechaFin.toISOString() 
    });

    const where: any = {
      estado: 'COMPLETADA',
      fecha: {
        gte: fechaInicio,
        lte: fechaFin,
      },
    };

    // Filtrar por local
    if (user.localId) {
      where.localId = user.localId;
    } else if (localId && user.role === 'ADMIN') {
      where.localId = localId;
    }

    // Filtrar por vendedor (vendedor solo ve sus ventas)
    if (user.role === 'VENDEDOR') {
      where.vendedorId = user.id;
    }

    // Verificar si hay ventas en el rango
    const ventasPrueba = await prisma.venta.findMany({
      where,
      take: 1,
      select: { id: true, fecha: true, total: true },
    });
    console.log('Ventas encontradas en rango:', ventasPrueba.length, ventasPrueba);

    const [
      totalVentas,
      totalMonto,
      totalClientes,
      totalProductos,
      ventasHoy,
      productosActivos,
      ventasPorLocal,
    ] = await Promise.all([
      // Total de ventas
      prisma.venta.count({ where }),
      // Total monto
      prisma.venta.aggregate({
        where,
        _sum: {
          total: true,
        },
      }),
      // Total clientes registrados (todos, no solo los que compraron)
      prisma.cliente.count(),
      // Total productos vendidos (suma de cantidades)
      (async () => {
        const ventas = await prisma.venta.findMany({
          where,
          select: {
            detalles: {
              select: {
                cantidad: true,
              },
            },
          },
        });
        let total = 0;
        ventas.forEach((v: { detalles: Array<{ cantidad: number }> }) => {
          v.detalles.forEach((d: { cantidad: number }) => {
            total += d.cantidad;
          });
        });
        return total;
      })(),
      // Ventas hoy
      prisma.venta.count({
        where: {
          ...where,
          fecha: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
      // Productos activos
      prisma.producto.count({
        where: {
          activo: true,
        },
      }),
      // Ventas por local (solo si es admin)
      user.role === 'ADMIN' && !user.localId
        ? prisma.venta.groupBy({
            by: ['localId'],
            where,
            _count: {
              id: true,
            },
            _sum: {
              total: true,
            },
          }).then(async (result: Array<{ localId: string; _count: { id: number }; _sum: { total: number | null } }>) => {
            const locales = await prisma.local.findMany({
              where: { id: { in: result.map((r: { localId: string }) => r.localId) } },
              select: { id: true, nombre: true },
            });

            return result.map((r: { localId: string; _count: { id: number }; _sum: { total: number | null } }) => ({
              localId: r.localId,
              localNombre: locales.find((l: { id: string; nombre: string }) => l.id === r.localId)?.nombre || 'Desconocido',
              cantidadVentas: r._count.id,
              montoTotal: Number(r._sum.total || 0),
            }));
          })
        : Promise.resolve([]),
    ]);

    const resultado = {
      periodo: {
        fechaDesde: fechaInicio.toISOString(),
        fechaHasta: fechaFin.toISOString(),
      },
      resumen: {
        totalVentas,
        totalMonto: Number(totalMonto._sum.total || 0),
        totalClientes,
        totalProductos: typeof totalProductos === 'number' ? totalProductos : 0,
        ventasHoy,
        productosActivos,
        promedioVenta: totalVentas > 0 ? Number(totalMonto._sum.total || 0) / totalVentas : 0,
      },
      ventasPorLocal: Array.isArray(ventasPorLocal) ? ventasPorLocal : [],
    };

    console.log('Resultado del resumen:', resultado);
    res.json(resultado);
  } catch (error) {
    next(error);
  }
});

// GET /reportes/ventas-por-dia - Ventas agrupadas por día
router.get('/ventas-por-dia', filterByLocal, async (req, res, next) => {
  try {
    const user = req.user!;
    const { fechaDesde, fechaHasta, localId } = req.query;

    const fechaInicio = fechaDesde ? new Date(fechaDesde as string) : new Date();
    fechaInicio.setHours(0, 0, 0, 0);

    const fechaFin = fechaHasta ? new Date(fechaHasta as string) : new Date();
    fechaFin.setHours(23, 59, 59, 999);

    const where: any = {
      estado: 'COMPLETADA',
      fecha: {
        gte: fechaInicio,
        lte: fechaFin,
      },
    };

    if (user.localId) {
      where.localId = user.localId;
    } else if (localId && user.role === 'ADMIN') {
      where.localId = localId;
    }

    if (user.role === 'VENDEDOR') {
      where.vendedorId = user.id;
    }

    const ventas = await prisma.venta.findMany({
      where,
      select: {
        fecha: true,
        total: true,
      },
      orderBy: {
        fecha: 'asc',
      },
    });

    // Agrupar por día
    const ventasPorDia = new Map<string, { fecha: string; cantidad: number; total: number }>();

    ventas.forEach((venta: { fecha: Date | string }) => {
      const fecha = new Date(venta.fecha).toISOString().split('T')[0];
      const existente = ventasPorDia.get(fecha);

      if (existente) {
        existente.cantidad += 1;
        existente.total += Number(venta.total);
      } else {
        ventasPorDia.set(fecha, {
          fecha,
          cantidad: 1,
          total: Number(venta.total),
        });
      }
    });

    const resultado = Array.from(ventasPorDia.values()).sort((a, b) => 
      a.fecha.localeCompare(b.fecha)
    );

    res.json(resultado);
  } catch (error) {
    next(error);
  }
});

// GET /reportes/ventas-por-metodo-pago - Ventas agrupadas por método de pago
router.get('/ventas-por-metodo-pago', filterByLocal, async (req, res, next) => {
  try {
    const user = req.user!;
    const { fechaDesde, fechaHasta, localId } = req.query;

    const fechaInicio = fechaDesde ? new Date(fechaDesde as string) : new Date();
    fechaInicio.setHours(0, 0, 0, 0);

    const fechaFin = fechaHasta ? new Date(fechaHasta as string) : new Date();
    fechaFin.setHours(23, 59, 59, 999);

    const where: any = {
      estado: 'COMPLETADA',
      fecha: {
        gte: fechaInicio,
        lte: fechaFin,
      },
    };

    if (user.localId) {
      where.localId = user.localId;
    } else if (localId && user.role === 'ADMIN') {
      where.localId = localId;
    }

    if (user.role === 'VENDEDOR') {
      where.vendedorId = user.id;
    }

    const ventas = await prisma.venta.groupBy({
      by: ['metodoPago'],
      where,
      _count: {
        id: true,
      },
      _sum: {
        total: true,
      },
    });

    const resultado = ventas.map((v: any) => ({
      metodoPago: v.metodoPago,
      cantidad: v._count.id,
      total: Number(v._sum.total || 0),
    }));

    res.json(resultado);
  } catch (error) {
    next(error);
  }
});

// GET /reportes/ventas-por-vendedor - Ventas agrupadas por vendedor (solo admin)
router.get('/ventas-por-vendedor', filterByLocal, async (req, res, next) => {
  try {
    const user = req.user!;
    const { fechaDesde, fechaHasta, localId } = req.query;

    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Solo los administradores pueden ver este reporte' });
    }

    const fechaInicio = fechaDesde ? new Date(fechaDesde as string) : new Date();
    fechaInicio.setHours(0, 0, 0, 0);

    const fechaFin = fechaHasta ? new Date(fechaHasta as string) : new Date();
    fechaFin.setHours(23, 59, 59, 999);

    const where: any = {
      estado: 'COMPLETADA',
      fecha: {
        gte: fechaInicio,
        lte: fechaFin,
      },
    };

    if (localId) {
      where.localId = localId;
    }

    const ventas = await prisma.venta.groupBy({
      by: ['vendedorId'],
      where,
      _count: {
        id: true,
      },
      _sum: {
        total: true,
      },
    });

    const vendedores = await prisma.user.findMany({
      where: {
        id: { in: ventas.map((v: { vendedorId: string }) => v.vendedorId) },
      },
      select: {
        id: true,
        nombre: true,
      },
    });

    const resultado = ventas.map((v: { vendedorId: string; _count: { id: number }; _sum: { total: number | null } }) => ({
      vendedorId: v.vendedorId,
      vendedorNombre: vendedores.find((vend: { id: string; nombre: string | null }) => vend.id === v.vendedorId)?.nombre || 'Desconocido',
      cantidad: v._count.id,
      total: Number(v._sum.total || 0),
    }));

    res.json(resultado);
  } catch (error) {
    next(error);
  }
});

// GET /reportes/diagnostico - Endpoint de diagnóstico para verificar datos
router.get('/diagnostico', filterByLocal, async (req, res, next) => {
  try {
    const user = req.user!;

    // Obtener todas las ventas sin filtro de fecha
    const todasLasVentas = await prisma.venta.findMany({
      where: {
        estado: 'COMPLETADA',
        ...(user.localId && { localId: user.localId }),
        ...(user.role === 'VENDEDOR' && { vendedorId: user.id }),
      },
      select: {
        id: true,
        fecha: true,
        total: true,
        localId: true,
        vendedorId: true,
      },
      orderBy: {
        fecha: 'desc',
      },
      take: 10,
    });

    // Obtener rango de fechas de ventas
    const ventasCompletas = await prisma.venta.findMany({
      where: {
        estado: 'COMPLETADA',
        ...(user.localId && { localId: user.localId }),
        ...(user.role === 'VENDEDOR' && { vendedorId: user.id }),
      },
      select: {
        fecha: true,
      },
      orderBy: {
        fecha: 'asc',
      },
    });

    const fechaMinima = ventasCompletas.length > 0 ? ventasCompletas[0].fecha : null;
    const fechaMaxima = ventasCompletas.length > 0 ? ventasCompletas[ventasCompletas.length - 1].fecha : null;

    res.json({
      totalVentas: ventasCompletas.length,
      ultimasVentas: todasLasVentas,
      rangoFechas: {
        minima: fechaMinima,
        maxima: fechaMaxima,
      },
      usuario: {
        id: user.id,
        role: user.role,
        localId: user.localId,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

