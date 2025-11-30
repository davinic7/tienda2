import { Router } from 'express';
import { prisma } from '../index';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

// GET /api/dashboard/stats - Estadísticas para el dashboard
router.get('/stats', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const localId = req.user!.localId;

    // Fechas para comparar
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const mañana = new Date(hoy);
    mañana.setDate(mañana.getDate() + 1);
    
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay()); // Domingo de esta semana
    inicioSemana.setHours(0, 0, 0, 0);

    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59);

    // Construir filtros según el rol
    const whereVentas: any = {
      estado: 'COMPLETADA'
    };

    const whereStock: any = {};
    const whereProductos: any = { activo: true };
    const whereClientes: any = {};

    // Para vendedores, usar el local del turno activo
    if (userRole === 'VENDEDOR') {
      const turnoActivo = await prisma.turno.findFirst({
        where: {
          vendedorId: userId,
          estado: 'ABIERTO'
        }
      });

      if (turnoActivo) {
        whereVentas.localId = turnoActivo.localId;
        whereStock.localId = turnoActivo.localId;
      } else if (localId) {
        whereVentas.localId = localId;
        whereStock.localId = localId;
      }
    } else if (localId) {
      // Admin puede filtrar por local si tiene uno asignado
      whereVentas.localId = localId;
      whereStock.localId = localId;
    }

    // 1. Ventas de hoy
    const ventasHoy = await prisma.venta.aggregate({
      where: {
        ...whereVentas,
        fecha: {
          gte: hoy,
          lt: mañana
        }
      },
      _sum: {
        total: true
      },
      _count: {
        id: true
      }
    });

    // 2. Ventas de la semana
    const ventasSemana = await prisma.venta.aggregate({
      where: {
        ...whereVentas,
        fecha: {
          gte: inicioSemana
        }
      },
      _sum: {
        total: true
      },
      _count: {
        id: true
      }
    });

    // 3. Ventas del mes
    const ventasMes = await prisma.venta.aggregate({
      where: {
        ...whereVentas,
        fecha: {
          gte: inicioMes,
          lte: finMes
        }
      },
      _sum: {
        total: true
      },
      _count: {
        id: true
      }
    });

    // 4. Total de productos
    const totalProductos = await prisma.producto.count({
      where: whereProductos
    });

    // 5. Total de clientes
    const totalClientes = await prisma.cliente.count({
      where: whereClientes
    });

    // 6. Productos con stock bajo
    const stockBajo = await prisma.stock.count({
      where: {
        ...whereStock,
        cantidad: {
          lte: prisma.stock.fields.stock_minimo
        }
      }
    });

    // 7. Ventas recientes (últimas 5)
    const ventasRecientes = await prisma.venta.findMany({
      where: whereVentas,
      take: 5,
      orderBy: {
        fecha: 'desc'
      },
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
            nombre: true
          }
        }
      }
    });

    // 8. Productos con stock bajo (detalles)
    const productosStockBajo = await prisma.stock.findMany({
      where: {
        ...whereStock,
        cantidad: {
          lte: prisma.stock.fields.stock_minimo
        }
      },
      include: {
        producto: {
          select: {
            id: true,
            nombre: true,
            categoria: true
          }
        },
        local: {
          select: {
            id: true,
            nombre: true
          }
        }
      },
      orderBy: {
        cantidad: 'asc'
      },
      take: 10
    });

    // 9. Ventas por día de la semana (últimos 7 días)
    const ultimos7Dias = new Date();
    ultimos7Dias.setDate(ultimos7Dias.getDate() - 7);
    
    const ventasUltimos7Dias = await prisma.venta.findMany({
      where: {
        ...whereVentas,
        fecha: {
          gte: ultimos7Dias
        }
      },
      select: {
        fecha: true,
        total: true
      }
    });

    // Agrupar por día
    const ventasPorDia = new Map<string, { total: number; cantidad: number }>();
    ventasUltimos7Dias.forEach(venta => {
      const fechaStr = venta.fecha.toISOString().split('T')[0];
      const actual = ventasPorDia.get(fechaStr) || { total: 0, cantidad: 0 };
      ventasPorDia.set(fechaStr, {
        total: actual.total + Number(venta.total),
        cantidad: actual.cantidad + 1
      });
    });

    // 10. Información del turno activo (solo para vendedores)
    let turnoActivo = null;
    if (userRole === 'VENDEDOR') {
      const turno = await prisma.turno.findFirst({
        where: {
          vendedorId: userId,
          estado: 'ABIERTO'
        },
        include: {
          local: {
            select: {
              id: true,
              nombre: true
            }
          },
          _count: {
            select: {
              ventas: true
            }
          }
        }
      });

      if (turno) {
        const ventasTurno = await prisma.venta.aggregate({
          where: {
            turnoId: turno.id,
            estado: 'COMPLETADA'
          },
          _sum: {
            total: true
          }
        });

        turnoActivo = {
          id: turno.id,
          local: turno.local,
          fecha_apertura: turno.fecha_apertura,
          efectivo_inicial: Number(turno.efectivo_inicial),
          cantidadVentas: turno._count.ventas,
          totalVentas: Number(ventasTurno._sum.total) || 0
        };
      }
    }

    // 11. Top 5 productos más vendidos (últimos 7 días)
    const productosMasVendidos = await prisma.ventaDetalle.groupBy({
      by: ['productoId'],
      where: {
        venta: {
          ...whereVentas,
          fecha: {
            gte: ultimos7Dias
          }
        }
      },
      _sum: {
        cantidad: true,
        subtotal: true
      },
      orderBy: {
        _sum: {
          cantidad: 'desc'
        }
      },
      take: 5
    });

    const productosIds = productosMasVendidos.map(p => p.productoId);
    const productos = await prisma.producto.findMany({
      where: { id: { in: productosIds } },
      select: {
        id: true,
        nombre: true,
        precio: true
      }
    });

    const topProductos = productosMasVendidos.map(pv => {
      const producto = productos.find(p => p.id === pv.productoId);
      return {
        producto: producto || { id: pv.productoId, nombre: 'Producto eliminado', precio: 0 },
        cantidadVendida: pv._sum.cantidad || 0,
        totalVendido: Number(pv._sum.subtotal) || 0
      };
    });

    res.json({
      ventasHoy: {
        total: Number(ventasHoy._sum.total) || 0,
        cantidad: ventasHoy._count.id || 0
      },
      ventasSemana: {
        total: Number(ventasSemana._sum.total) || 0,
        cantidad: ventasSemana._count.id || 0
      },
      ventasMes: {
        total: Number(ventasMes._sum.total) || 0,
        cantidad: ventasMes._count.id || 0
      },
      totalProductos,
      totalClientes,
      stockBajo,
      ventasRecientes: ventasRecientes.map(v => ({
        id: v.id,
        fecha: v.fecha,
        total: Number(v.total),
        local: v.local,
        vendedor: v.vendedor,
        cliente: v.cliente,
        metodoPago: v.metodoPago
      })),
      productosStockBajo: productosStockBajo.map(s => ({
        id: s.id,
        producto: s.producto,
        local: s.local,
        cantidad: s.cantidad,
        stock_minimo: s.stock_minimo
      })),
      ventasPorDia: Array.from(ventasPorDia.entries()).map(([fecha, datos]) => ({
        fecha,
        total: datos.total,
        cantidad: datos.cantidad
      })),
      turnoActivo,
      topProductos
    });
  } catch (error) {
    next(error);
  }
});

export default router;

