import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, LoginResponse, Local } from '../types';
import { api } from '../utils/api';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ localesDisponibles?: Local[] }>;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay usuario guardado al cargar
    const checkAuth = async () => {
      const savedUser = localStorage.getItem('user');
      const token = localStorage.getItem('accessToken');

      if (savedUser && token) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          
          // Verificar que el token sigue siendo válido
          // El interceptor de api.ts intentará refrescar el token automáticamente si es necesario
          try {
            await api.get('/auth/me');
            // Si la petición es exitosa, el token es válido (o fue refrescado)
          } catch (error: any) {
            const isDevelopment = import.meta.env.DEV;
            
            // Solo limpiar si el error persiste después del intento de refresh
            // El interceptor ya intentó refrescar el token, si llegamos aquí es porque falló
            if (error.response?.status === 401) {
              if (isDevelopment) {
                console.warn('⚠️ Token inválido y refresh falló, limpiando sesión');
              }
              
              // Limpiar todo solo si el refresh también falló
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              localStorage.removeItem('user');
              localStorage.removeItem('localesDisponibles');
              setUser(null);
            }
          }
        } catch (error: any) {
          const isDevelopment = import.meta.env.DEV;
          
          if (isDevelopment) {
            console.error('❌ Error al parsear usuario guardado:', error.message);
          }
          
          // Limpiar datos inválidos
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          localStorage.removeItem('localesDisponibles');
          setUser(null);
        }
      }

      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post<LoginResponse>('/auth/login', {
        email,
        password,
      });

      const { accessToken, refreshToken, user: userData, localesDisponibles } = response.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Guardar locales disponibles si es vendedor
      if (localesDisponibles) {
        localStorage.setItem('localesDisponibles', JSON.stringify(localesDisponibles));
      }

      setUser(userData);
      toast.success(`Bienvenido, ${userData.nombre}`);
      
      return { localesDisponibles };
    } catch (error: any) {
      const message = error.response?.data?.error || 'Error al iniciar sesión';
      toast.error(message);
      throw error;
    }
  };

  const logout = async () => {
    // Si es vendedor, verificar si hay turno activo antes de cerrar sesión
    if (user?.role === 'VENDEDOR') {
      try {
        const response = await api.get<{ turno: any | null }>('/turnos/activo');
        const turnoActivo = response.data.turno;
        
        if (turnoActivo) {
          // Hay turno activo, no permitir cerrar sesión sin cerrar turno
          toast.error('Debes cerrar el turno antes de cerrar sesión');
          return;
        }
      } catch (error) {
        // Si hay error, permitir cerrar sesión de todas formas
        console.error('Error al verificar turno activo:', error);
      }
    }
    
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('localesDisponibles');
    setUser(null);
    toast.success('Sesión cerrada');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        loading,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

