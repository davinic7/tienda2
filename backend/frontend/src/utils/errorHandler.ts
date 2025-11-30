/**
 * Utilidad para manejar errores de manera consistente
 * Muestra errores detallados en desarrollo y mensajes amigables en producción
 */

const isDevelopment = import.meta.env.DEV;

export interface ErrorDetails {
  message: string;
  status?: number;
  details?: any;
  path?: string;
  method?: string;
}

export const handleError = (error: any, context?: string): ErrorDetails => {
  const details: ErrorDetails = {
    message: 'Error desconocido',
  };

  // Si es un error de axios/API
  if (error.response) {
    details.status = error.response.status;
    details.message = error.response.data?.error || error.response.data?.message || error.message;
    details.details = error.response.data?.details;
    details.path = error.config?.url;
    details.method = error.config?.method?.toUpperCase();
  } else if (error.request) {
    // Error de red (sin respuesta del servidor)
    details.message = 'No se pudo conectar al servidor';
    details.path = error.config?.url;
    details.method = error.config?.method?.toUpperCase();
  } else {
    // Error al configurar la petición
    details.message = error.message || 'Error desconocido';
  }

  // Logging detallado en desarrollo
  if (isDevelopment) {
    console.error(`\n❌ ========== ERROR${context ? ` EN ${context}` : ''} ==========`);
    console.error('📝 Mensaje:', details.message);
    if (details.status) {
      console.error('📊 Status:', details.status);
    }
    if (details.path) {
      console.error('📍 Ruta:', details.method, details.path);
    }
    if (details.details) {
      console.error('📦 Detalles:', details.details);
    }
    if (error.response?.data) {
      console.error('📥 Respuesta completa:', error.response.data);
    }
    if (error.stack) {
      console.error('📚 Stack:', error.stack);
    }
    console.error('=====================================\n');
  }

  return details;
};

export const getErrorMessage = (error: any): string => {
  const details = handleError(error);
  
  // Mensajes amigables según el tipo de error
  if (details.status === 401) {
    return 'Sesión expirada. Por favor, inicia sesión nuevamente';
  }
  
  if (details.status === 403) {
    return 'No tienes permisos para realizar esta acción';
  }
  
  if (details.status === 404) {
    return 'Recurso no encontrado';
  }
  
  if (details.status === 409) {
    return 'Conflicto: El recurso ya existe o está en uso';
  }
  
  if (details.status === 422) {
    if (details.details && Array.isArray(details.details)) {
      const validationErrors = details.details
        .map((d: any) => `${d.path}: ${d.message}`)
        .join(', ');
      return `Error de validación: ${validationErrors}`;
    }
    return 'Error de validación en los datos enviados';
  }
  
  if (details.status === 500) {
    return 'Error interno del servidor. Por favor, intenta más tarde';
  }
  
  if (details.status === 503) {
    return 'Servicio no disponible. Verifica la conexión a la base de datos';
  }
  
  if (details.message.includes('Network Error') || details.message.includes('ECONNREFUSED')) {
    return 'No se pudo conectar al servidor. Verifica que el backend esté corriendo';
  }
  
  // Si hay un mensaje específico del servidor, usarlo
  if (details.message && details.message !== 'Error desconocido') {
    return details.message;
  }
  
  return 'Ocurrió un error inesperado';
};



