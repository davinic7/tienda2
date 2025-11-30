import { io, Socket } from 'socket.io-client';
import type { PrecioActualizadoEvent, StockBajoEvent } from '@shared/types';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export const initializeSocket = (token: string): Socket => {
  if (socket?.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: {
      token,
    },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('✅ Conectado a Socket.io');
  });

  socket.on('disconnect', () => {
    console.log('❌ Desconectado de Socket.io');
  });

  socket.on('connect_error', (error) => {
    console.error('Error de conexión Socket.io:', error);
  });

  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = (): Socket | null => {
  return socket;
};

// Helpers para escuchar eventos
export const onPrecioActualizado = (
  callback: (data: PrecioActualizadoEvent) => void
): void => {
  if (socket) {
    socket.on('precio-actualizado', callback);
  }
};

export const offPrecioActualizado = (
  callback: (data: PrecioActualizadoEvent) => void
): void => {
  if (socket) {
    socket.off('precio-actualizado', callback);
  }
};

export const onStockBajo = (callback: (data: StockBajoEvent) => void): void => {
  if (socket) {
    socket.on('stock-bajo', callback);
    socket.on('stock-bajo-admin', callback);
  }
};

export const offStockBajo = (callback: (data: StockBajoEvent) => void): void => {
  if (socket) {
    socket.off('stock-bajo', callback);
    socket.off('stock-bajo-admin', callback);
  }
};

// Helper para escuchar nuevas ventas
export const onNuevaVenta = (callback: (data: { ventaId: string; total: number; localId: string | null; fecha: Date }) => void): void => {
  if (socket) {
    socket.on('nueva-venta', callback);
  }
};

export const offNuevaVenta = (callback: (data: { ventaId: string; total: number; localId: string | null; fecha: Date }) => void): void => {
  if (socket) {
    socket.off('nueva-venta', callback);
  }
};

// Helper para escuchar cambios en clientes
export const onClienteCambiado = (callback: () => void): void => {
  if (socket) {
    socket.on('nuevo-cliente', callback);
    socket.on('cliente-actualizado', callback);
  }
};

export const offClienteCambiado = (callback: () => void): void => {
  if (socket) {
    socket.off('nuevo-cliente', callback);
    socket.off('cliente-actualizado', callback);
  }
};

