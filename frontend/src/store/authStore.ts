import { create } from 'zustand';
import type { User } from '@shared/types';
import { authApi } from '@/lib/api';
import { initializeSocket, disconnectSocket } from '@/lib/socket';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

// Cargar estado desde localStorage
const loadStoredAuth = (): Partial<AuthState> => {
  if (typeof window === 'undefined') return {};
  
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');
  const userStr = localStorage.getItem('user');
  
  return {
    accessToken,
    refreshToken,
    user: userStr ? JSON.parse(userStr) : null,
    isAuthenticated: !!accessToken,
  };
};

// Guardar estado en localStorage
const saveStoredAuth = (state: Partial<AuthState>) => {
  if (typeof window === 'undefined') return;
  
  if (state.accessToken) {
    localStorage.setItem('accessToken', state.accessToken);
  } else {
    localStorage.removeItem('accessToken');
  }
  
  if (state.refreshToken) {
    localStorage.setItem('refreshToken', state.refreshToken);
  } else {
    localStorage.removeItem('refreshToken');
  }
  
  if (state.user) {
    localStorage.setItem('user', JSON.stringify(state.user));
  } else {
    localStorage.removeItem('user');
  }
};

export const useAuthStore = create<AuthState>((set, get) => {
  // Inicializar con datos guardados
  const stored = loadStoredAuth();
  
  return {
    ...stored,
    user: stored.user || null,
    accessToken: stored.accessToken || null,
    refreshToken: stored.refreshToken || null,
    isAuthenticated: stored.isAuthenticated || false,

    login: async (username: string, password: string) => {
      try {
        const response = await authApi.login({ username, password });

        const newState = {
          user: response.user,
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
          isAuthenticated: true,
        };

        set(newState);
        saveStoredAuth(newState);

        // Inicializar Socket.io
        initializeSocket(response.accessToken);
      } catch (error) {
        throw error;
      }
    },

    logout: () => {
      disconnectSocket();
      const newState = {
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
      };
      set(newState);
      saveStoredAuth(newState);
    },

    loadUser: async () => {
      try {
        const { accessToken } = get();
        if (!accessToken) {
          return;
        }

        const user = await authApi.getMe();
        const newState = { user, isAuthenticated: true };
        set(newState);
        saveStoredAuth({ user });

        // Inicializar Socket.io si no está conectado
        initializeSocket(accessToken);
      } catch (error) {
        get().logout();
      }
    },
  };
});

