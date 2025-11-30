import { Router } from 'express';
import { prisma } from '../index';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

// GET /api/analytics/dashboard - Dashboard principal con todas las estadísticas
router.get('/dashboard', async (req: AuthRequest, res, next) => {
  try {
    const { fechaInicio, fechaFin, localId } = req.query;
    const where: any = {
      estado: 'COMPLETADA'
    };

    // Los vendedores solo ven datos de su local asignado
    if (req.user!.role === 'VENDEDOR' && req.user!.localId) {
      where.localId = req.user!.localId;
    } else if (localId) {
      where.localId = localId as string;
    }

    // Filtro de fechas
    if (fechaInicio || fechaFin) {
      where.fecha = {};
      if (fechaInicio) {
        where.fecha.gte = new Date(fechaInicio as string);
      }
      if (fechaFin) {
        where.fecha.lte = new Date(fechaFin as string);
      }
    } else {
      // Por defecto, últimos 30 días
      const fechaInicioDefault = new Date();
      fechaInicioDefault.setDate(fechaInicioDefault.getDate() - 30);
      where.fecha = {
        gte: fechaInicioDefault
      };
    }

    // 1. Productos más vendidos
    const productosMasVendidos = await prisma.ventaDetalle.groupBy({
      by: ['productoId'],
      where: {
        venta: where
      },
      _sum: {
        cantidad: true,
        subtotal: true
      },
      _count: {
        id: true
      },
      orderBy: {
        _sum: {
          cantidad: 'desc'
        }
      },
      take: 10
    });

    const productosIds = productosMasVendidos.map(p => p.productoId);
    const productos = await prisma.producto.findMany({
      where: { id: { in: productosIds } },
      select: {
        id: true,
        nombre: true,
        precio: true,
        categoria: true
      }
    });

    const productosConVentas = productosMasVendidos.map(pv => {
      const producto = productos.find(p => p.id === pv.productoId);
      return {
        producto: producto || { id: pv.productoId, nombre: 'Producto eliminado' },
        cantidadVendida: pv._sum.cantidad || 0,
        totalVendido: Number(pv._sum.subtotal) || 0,
        vecesVendido: pv._count.id || 0
      };
    });

    // 2. Ventas por día - Usar Prisma para evitar problemas con SQL
    const ventasPorDiaData = await prisma.venta.findMany({
      where,
      select: {
        fecha: true,
        total: true
      }
    });

    // Agrupar por día manualmente
    const ventasPorDiaMap = new Map<string, { total: number; cantidad: number }>();
    ventasPorDiaData.forEach(venta => {
      const fechaStr = venta.fecha.toISOString().split('T')[0];
      const actual = ventasPorDiaMap.get(fechaStr) || { total: 0, cantidad: 0 };
      ventasPorDiaMap.set(fechaStr, {
        total: actual.total + Number(venta.total),
        cantidad: actual.cantidad + 1
      });
    });

    const ventasPorDia = Array.from(ventasPorDiaMap.entries())
      .map(([fecha, datos]) => ({
        fecha: new Date(fecha),
        total: datos.total,
        cantidad: datos.cantidad
      }))
      .sort((a, b) => b.fecha.getTime() - a.fecha.getTime())
      .slice(0, 30);

    // 3. Hora que más se vende - Usar Prisma para evitar problemas con SQL
    const ventasPorHoraData = await prisma.venta.findMany({
      where,
      select: {
        fecha: true,
        total: true
      }
    });

    // Agrupar por hora manualmente
    const ventasPorHoraMap = new Map<number, { total: number; cantidad: number }>();
    ventasPorHoraData.forEach(venta => {
      const hora = venta.fecha.getHours();
      const actual = ventasPorHoraMap.get(hora) || { total: 0, cantidad: 0 };
      ventasPorHoraMap.set(hora, {
        total: actual.total + Number(venta.total),
        cantidad: actual.cantidad + 1
      });
    });

    const ventasPorHora = Array.from(ventasPorHoraMap.entries())
      .map(([hora, datos]) => ({
        hora,
        total: datos.total,
        cantidad: datos.cantidad
      }))
      .sort((a, b) => b.cantidad - a.cantidad);

    // 4. Medio de pago más usado
    const mediosPago = await prisma.venta.groupBy({
      by: ['metodoPago'],
      where,
      _sum: {
        total: true
      },
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    });

    // 5. Clientes con más frecuencia y mayor consumo
    const clientesFrecuentes = await prisma.venta.groupBy({
      by: ['clienteId'],
      where: {
        ...where,
        clienteId: { not: null }
      },
      _sum: {
        total: true
      },
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 10
    });

    const clientesIds = clientesFrecuentes
      .map(c => c.clienteId)
      .filter((id): id is string => id !== null);

    const clientes = await prisma.cliente.findMany({
      where: { id: { in: clientesIds } },
      select: {
        id: true,
        nombre: true,
        email: true,
        telefono: true
      }
    });

    const clientesConEstadisticas = clientesFrecuentes.map(cf => {
      const cliente = clientes.find(c => c.id === cf.clienteId);
      return {
        cliente: cliente || { id: cf.clienteId, nombre: 'Cliente eliminado' },
        totalConsumido: Number(cf._sum.total) || 0,
        cantidadCompras: cf._count.id || 0,
        promedioPorCompra: cf._count.id > 0 
          ? Number(cf._sum.total) / cf._count.id 
          : 0
      };
    });

    // 6. Estadísticas generales
    const estadisticasGenerales = await prisma.venta.aggregate({
      where,
      _sum: {
        total: true
      },
      _count: {
        id: true
      },
      _avg: {
        total: true
      }
    });

    // 7. Ventas por categoría
    const ventasPorCategoria = await prisma.ventaDetalle.groupBy({
      by: ['productoId'],
      where: {
        venta: where
      },
      _sum: {
        subtotal: true,
        cantidad: true
      }
    });

    const productosCategoria = await prisma.producto.findMany({
      where: {
        id: { in: ventasPorCategoria.map(v => v.productoId) },
        categoria: { not: null }
      },
      select: {
        id: true,
        categoria: true
      }
    });

    const categoriasMap = new Map<string, { total: number; cantidad: number }>();
    ventasPorCategoria.forEach(v => {
      const producto = productosCategoria.find(p => p.id === v.productoId);
      if (producto?.categoria) {
        const actual = categoriasMap.get(producto.categoria) || { total: 0, cantidad: 0 };
        categoriasMap.set(producto.categoria, {
          total: actual.total + Number(v._sum.subtotal || 0),
          cantidad: actual.cantidad + (v._sum.cantidad || 0)
        });
      }
    });

    const ventasPorCategoriaArray = Array.from(categoriasMap.entries())
      .map(([categoria, datos]) => ({
        categoria,
        total: datos.total,
        cantidad: datos.cantidad
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    res.json({
      productosMasVendidos: productosConVentas,
      ventasPorDia,
      ventasPorHora,
      mediosPago: mediosPago.map(mp => ({
        metodoPago: mp.metodoPago,
        total: Number(mp._sum.total) || 0,
        cantidad: mp._count.id || 0
      })),
      clientesFrecuentes: clientesConEstadisticas,
      ventasPorCategoria: ventasPorCategoriaArray,
      estadisticasGenerales: {
        totalVentas: Number(estadisticasGenerales._sum.total) || 0,
        cantidadVentas: estadisticasGenerales._count.id || 0,
        promedioVenta: Number(estadisticasGenerales._avg.total) || 0
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;

