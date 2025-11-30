import { prisma } from '../config/database';
import { crearNotificacion } from '../routes/notificaciones.routes';

/**
 * Verifica productos próximos a vencer y crea notificaciones
 */
export async function verificarVencimientos() {
  try {
    // Productos que vencen en los próximos 7 días
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + 7);

    const productosVencimiento = await prisma.producto.findMany({
      where: {
        fechaVencimiento: {
          lte: fechaLimite,
          gte: new Date(), // Solo futuros
        },
        activo: true,
      },
      include: {
        stocks: {
          where: {
            cantidad: {
              gt: 0,
            },
          },
          include: {
            local: true,
          },
        },
      },
    });

    for (const producto of productosVencimiento) {
      for (const stock of producto.stocks) {
        // Verificar si ya existe una notificación reciente para este producto y local
        const notificacionExistente = await prisma.notificacion.findFirst({
          where: {
            tipo: 'VENCIMIENTO',
            productoId: producto.id,
            localId: stock.localId,
            estado: 'PENDIENTE',
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Últimas 24 horas
            },
          },
        });

        if (!notificacionExistente) {
          const diasRestantes = Math.ceil(
            (producto.fechaVencimiento!.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          );

          await crearNotificacion({
            tipo: 'VENCIMIENTO',
            titulo: `Producto próximo a vencer: ${producto.nombre}`,
            mensaje: `El producto "${producto.nombre}" vence en ${diasRestantes} día(s). Stock disponible: ${stock.cantidad} unidades en ${stock.local.nombre}.`,
            localId: stock.localId,
            productoId: producto.id,
          });
        }
      }
    }
  } catch (error) {
    console.error('Error al verificar vencimientos:', error);
  }
}

/**
 * Verifica productos con baja rotación (no vendidos en los últimos 30 días)
 */
export async function verificarBajaRotacion() {
  try {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - 30);

    // Obtener todos los productos activos con stock
    const productosConStock = await prisma.producto.findMany({
      where: {
        activo: true,
      },
      include: {
        stocks: {
          where: {
            cantidad: {
              gt: 0,
            },
          },
          include: {
            local: true,
          },
        },
        ventaDetalles: {
          where: {
            createdAt: {
              gte: fechaLimite,
            },
          },
          select: {
            id: true,
          },
        },
      },
    });

    for (const producto of productosConStock) {
      // Si no tiene ventas en los últimos 30 días pero tiene stock
      if (producto.ventaDetalles.length === 0 && producto.stocks.length > 0) {
        for (const stock of producto.stocks) {
          // Verificar si ya existe una notificación reciente
          const notificacionExistente = await prisma.notificacion.findFirst({
            where: {
              tipo: 'BAJA_ROTACION',
              productoId: producto.id,
              localId: stock.localId,
              estado: 'PENDIENTE',
              createdAt: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Últimos 7 días
              },
            },
          });

          if (!notificacionExistente) {
            await crearNotificacion({
              tipo: 'BAJA_ROTACION',
              titulo: `Baja rotación: ${producto.nombre}`,
              mensaje: `El producto "${producto.nombre}" no ha tenido ventas en los últimos 30 días. Stock disponible: ${stock.cantidad} unidades en ${stock.local.nombre}.`,
              localId: stock.localId,
              productoId: producto.id,
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('Error al verificar baja rotación:', error);
  }
}

/**
 * Ejecuta todas las verificaciones de alertas
 */
export async function ejecutarVerificacionesAlertas() {
  await Promise.all([
    verificarVencimientos(),
    verificarBajaRotacion(),
  ]);
}

