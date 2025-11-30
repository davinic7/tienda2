import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Función helper para verificar si un error es de base de datos y no debe mostrarse como toast
export const isDatabaseError = (error: any): boolean => {
  if (!error) return false;
  
  const errorMessage = error?.response?.data?.error || error?.message || '';
  const status = error?.response?.status;
  const errorCode = error?.response?.data?.code;
  
  // Errores de base de datos que no deben mostrarse como toast
  const databaseErrorPatterns = [
    'base de datos',
    'database',
    'conexión a la base',
    'connection to database',
    'Can\'t reach database',
    'P1001', // Prisma error: Can't reach database server
    'P1000', // Prisma error: Authentication failed
    'P1017', // Prisma error: Server has closed the connection
    'Servicio no disponible',
    'Error de conexión',
    'Error al procesar la solicitud', // Error genérico de Prisma
    'Error interno del servidor', // Error genérico del servidor
  ];
  
  // Si tiene código de Prisma (P####), es error de base de datos
  const hasPrismaCode = errorCode && typeof errorCode === 'string' && errorCode.startsWith('P');
  
  const isDatabaseError = databaseErrorPatterns.some(pattern => 
    errorMessage.toLowerCase().includes(pattern.toLowerCase())
  ) || status === 503 || hasPrismaCode; // Service Unavailable o código Prisma indica problemas de BD
  
  return isDatabaseError;
};

// Función helper para mostrar errores de forma segura (filtra errores de BD)
export const showErrorToast = (error: any, defaultMessage: string = 'Error al procesar la solicitud') => {
  if (!isDatabaseError(error)) {
    const errorMessage = error?.response?.data?.error || defaultMessage;
    // Solo importar toast si no es error de BD
    import('react-hot-toast').then(({ default: toast }) => {
      toast.error(errorMessage);
    });
  } else {
    // Solo loguear en desarrollo
    if (import.meta.env.DEV) {
      console.warn('⚠️ Error de base de datos (no se muestra toast):', error?.response?.data?.error);
    }
  }
};

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token a las peticiones
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Variable para evitar múltiples refrescos simultáneos
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Interceptor para manejar errores y refrescar token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isDevelopment = import.meta.env.DEV;

    // Logging detallado en desarrollo (solo para errores que no son 401 de token expirado)
    if (isDevelopment && !(error.response?.status === 401 && error.response?.data?.error === 'Token expirado')) {
      console.error('\n❌ ========== ERROR EN API ==========');
      console.error('📍 URL:', error.config?.method?.toUpperCase(), error.config?.url);
      console.error('📊 Status:', error.response?.status || 'Sin respuesta');
      console.error('📝 Mensaje:', error.message);
      
      if (error.response?.data) {
        console.error('📦 Datos del error:', error.response.data);
      }
      
      if (error.response?.status === 400 && error.response?.data?.details) {
        console.error('🔴 Errores de validación:');
        error.response.data.details.forEach((d: any) => {
          console.error(`  - ${d.path}: ${d.message}`);
        });
      }
      
      if (error.config?.data) {
        console.error('📥 Body enviado:', error.config.data);
      }
      
      if (error.stack) {
        console.error('📚 Stack:', error.stack);
      }
      console.error('=====================================\n');
    }

    // Si el error es 401 y no hemos intentado refrescar el token
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Si ya estamos refrescando, agregar esta petición a la cola
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          if (isDevelopment) {
            console.warn('⚠️ No hay refresh token disponible');
          }
          throw new Error('No hay refresh token');
        }

        const response = await axios.post(`${API_URL}/api/auth/refresh`, {
          refreshToken,
        });

        const { accessToken } = response.data;
        localStorage.setItem('accessToken', accessToken);

        if (isDevelopment) {
          console.log('✅ Token refrescado exitosamente');
        }

        // Procesar la cola de peticiones fallidas
        processQueue(null, accessToken);
        isRefreshing = false;

        // Reintentar la petición original con el nuevo token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError: any) {
        isRefreshing = false;
        processQueue(refreshError, null);
        
        if (isDevelopment) {
          console.error('❌ Error al refrescar token:', refreshError.message);
        }
        
        // Si falla el refresh, limpiar y redirigir a login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('localesDisponibles');
        
        // Solo redirigir si no estamos ya en login
        if (window.location.pathname !== '/login') {
          if (isDevelopment) {
            console.warn('⚠️ Redirigiendo a login por token inválido');
          }
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    // Si no hay respuesta del servidor (servidor caído, sin conexión, etc.)
    if (!error.response) {
      if (isDevelopment) {
        console.error('❌ No hay respuesta del servidor');
        console.error('💡 Verifica que el backend esté corriendo en', API_URL);
      }
      // No mostrar toast para errores de conexión, solo loguear
      return Promise.reject(error);
    }

    // Filtrar errores de base de datos que no deben mostrarse como toast
    // Estos errores se manejan silenciosamente o con mensajes más amigables
    if (isDatabaseError(error)) {
      // Solo loguear en desarrollo, no mostrar toast
      if (isDevelopment) {
        console.warn('⚠️ Error de base de datos (no se muestra al usuario):', error.response?.data?.error);
      }
      // Rechazar sin mostrar toast
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

