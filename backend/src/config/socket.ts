import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import { prisma } from './database';

export const initializeSocket = (httpServer: HTTPServer): SocketIOServer => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Middleware de autenticación para Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Token no proporcionado'));
      }

      const payload = verifyAccessToken(token);

      // Verificar que el usuario aún existe
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, username: true, role: true, localId: true, activo: true },
      });

      if (!user || !user.activo) {
        return next(new Error('Usuario no válido'));
      }

      socket.data.user = {
        id: user.id,
        username: user.username,
        role: user.role,
        localId: user.localId,
      };

      next();
    } catch (error) {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    console.log(`Usuario conectado: ${user.username} (${user.role})`);

    // Unirse a una sala por local (para notificaciones de stock)
    if (user.localId) {
      socket.join(`local:${user.localId}`);
    }

    // Los admins escuchan todos los locales
    if (user.role === 'ADMIN') {
      socket.join('admin');
    }

    socket.on('disconnect', () => {
      console.log(`Usuario desconectado: ${user.username}`);
    });
  });

  return io;
};

// Función para emitir cambios de precios a todos los locales
export const emitPriceUpdate = (io: SocketIOServer, producto: any) => {
  io.emit('precio-actualizado', {
    productoId: producto.id,
    nuevoPrecio: producto.precio,
    nombre: producto.nombre,
    fecha: new Date(),
  });
};

// Función para emitir alertas de stock bajo
export const emitStockAlert = (io: SocketIOServer, stock: any, producto: any) => {
  const room = `local:${stock.localId}`;
  io.to(room).emit('stock-bajo', {
    productoId: producto.id,
    nombre: producto.nombre,
    stockActual: stock.cantidad,
    stockMinimo: stock.stockMinimo,
    localId: stock.localId,
    fecha: new Date(),
  });

  // También notificar a los admins
  io.to('admin').emit('stock-bajo-admin', {
    productoId: producto.id,
    nombre: producto.nombre,
    stockActual: stock.cantidad,
    stockMinimo: stock.stockMinimo,
    localId: stock.localId,
    fecha: new Date(),
  });
};
