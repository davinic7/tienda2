import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket debe usarse dentro de SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Desconectar si no hay usuario autenticado
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    // Crear conexión Socket.io
    const accessToken = localStorage.getItem('accessToken');
    const newSocket = io(SOCKET_URL, {
      auth: {
        token: accessToken,
      },
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('Conectado a Socket.io');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Desconectado de Socket.io');
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      // Solo mostrar error si no es de autenticación (token inválido es normal si no hay sesión)
      if (error.message !== 'Token inválido' && error.message !== 'Unauthorized') {
        console.error('Error de conexión Socket.io:', error);
      }
      setConnected(false);
    });

    // Escuchar eventos del servidor
    newSocket.on('price:updated', (data) => {
      toast.success(`Precio actualizado: ${data.nombre} - $${data.nuevoPrecio}`, {
        duration: 5000,
      });
    });

    newSocket.on('stock:low', (data) => {
      toast.error(
        `⚠️ Stock bajo: ${data.producto.nombre} en ${data.local.nombre} (${data.cantidad}/${data.stock_minimo})`,
        {
          duration: 8000,
        }
      );
    });

    newSocket.on('venta:created', (data) => {
      if (user.role === 'ADMIN' || user.localId === data.localId) {
        toast.success(`Nueva venta: $${data.total}`, {
          duration: 3000,
        });
      }
    });

    newSocket.on('error', (error) => {
      toast.error(error.message || 'Error en Socket.io');
    });

    setSocket(newSocket);

    // Cleanup
    return () => {
      newSocket.close();
    };
  }, [isAuthenticated, user]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

