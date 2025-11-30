/**
 * Configuración de variables de entorno
 * Valida que todas las variables requeridas estén presentes
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

// Variables requeridas (deben estar en .env)
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
];

// Validar variables de entorno
function validateEnv() {
  const missing: string[] = [];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    const error = `❌ Faltan variables de entorno requeridas: ${missing.join(', ')}`;
    console.error(error);
    
    if (!isDevelopment) {
      // En producción, salir si faltan variables críticas
      throw new Error(error);
    } else {
      console.warn('⚠️  Advertencia: Algunas variables faltan, pero continuamos en modo desarrollo');
    }
  }
}

// Validar al cargar el módulo
validateEnv();

export const config = {
  // Entorno
  isDevelopment,
  isProduction: !isDevelopment,

  // Base de datos
  databaseUrl: process.env.DATABASE_URL!,

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET!,
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // Servidor
  port: parseInt(process.env.PORT || '3000', 10),
  frontendUrl: process.env.FRONTEND_URL || (isDevelopment ? 'http://localhost:5173' : ''),

  // Socket.io
  socketUrl: process.env.SOCKET_URL || (isDevelopment ? 'http://localhost:3000' : ''),

  // Seguridad
  security: {
    // En producción, CORS debe ser restrictivo
    corsOrigin: isDevelopment
      ? process.env.FRONTEND_URL || 'http://localhost:5173'
      : process.env.FRONTEND_URL || '',
    
    // Rate limiting más agresivo en producción
    rateLimitWindow: isDevelopment ? 15 * 60 * 1000 : 15 * 60 * 1000, // 15 min
    rateLimitMax: isDevelopment ? 100 : 10, // Más restrictivo en producción
  },
};

// Validar que en producción las URLs estén configuradas
if (config.isProduction) {
  if (!process.env.FRONTEND_URL) {
    throw new Error('❌ FRONTEND_URL es requerida en producción');
  }
  
  // Validar que JWT secrets sean seguros (no los valores por defecto)
  if (config.jwt.secret.includes('cambiar') || config.jwt.secret.includes('example')) {
    throw new Error('❌ JWT_SECRET debe ser una clave segura en producción');
  }
  
  if (config.jwt.refreshSecret.includes('cambiar') || config.jwt.refreshSecret.includes('example')) {
    throw new Error('❌ JWT_REFRESH_SECRET debe ser una clave segura en producción');
  }
}

