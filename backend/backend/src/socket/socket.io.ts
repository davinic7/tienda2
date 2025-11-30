import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { JWTPayload } from '../utils/jwt.util';
import { config } from '../config/env';

interface AuthenticatedSocket extends Socket {
  user?: JWTPayload;
}

export const setupSocketIO = (io: Server) => {
  // Middleware de autenticación para Socket.io
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Token no proporcionado'));
      }

      const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;

      // Verificar que el usuario existe y está activo
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true, role: true, localId: true, activo: true }
      });

      if (!user || !user.activo) {
        return next(new Error('Usuario no válido o inactivo'));
      }

      socket.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        localId: user.localId
      };

      next();
    } catch (error) {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`Cliente conectado: ${socket.user?.email} (${socket.user?.role})`);

    // Unirse a la sala del local
    if (socket.user?.localId) {
      socket.join(`local:${socket.user.localId}`);
      console.log(`Cliente ${socket.user.email} se unió al local ${socket.user.localId}`);
    }

    // Unirse a la sala de administradores (para recibir todas las notificaciones)
    if (socket.user?.role === 'ADMIN') {
      socket.join('admins');
      console.log(`Admin ${socket.user.email} conectado`);
    }

    // Evento: unirse a un local específico (para admins que quieren ver múltiples locales)
    socket.on('join:local', async (localId: string) => {
      if (socket.user?.role === 'ADMIN') {
        socket.join(`local:${localId}`);
        console.log(`Admin ${socket.user.email} se unió al local ${localId}`);
      }
    });

    // Evento: actualizar precio (solo admin)
    socket.on('price:update', async (data: { productoId: string; nuevoPrecio: number }) => {
      if (socket.user?.role !== 'ADMIN') {
        socket.emit('error', { message: 'No autorizado' });
        return;
      }

      try {
        const producto = await prisma.producto.update({
          where: { id: data.productoId },
          data: { precio: data.nuevoPrecio }
        });

        // Emitir actualización a todos los clientes
        io.emit('price:updated', {
          productoId: producto.id,
          nuevoPrecio: producto.precio,
          nombre: producto.nombre,
          fecha: new Date()
        });
      } catch (error) {
        socket.emit('error', { message: 'Error al actualizar precio' });
      }
    });

    // Desconexión
    socket.on('disconnect', () => {
      console.log(`Cliente desconectado: ${socket.user?.email}`);
    });

    // Manejo de errores
    socket.on('error', (error) => {
      console.error('Error en socket:', error);
    });
  });

  console.log('✅ Socket.io configurado correctamente');
};

