import rateLimit from 'express-rate-limit';

const isDevelopment = process.env.NODE_ENV === 'development';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: isDevelopment ? 100 : 10, // En desarrollo: 100 intentos, en producción: 10
  message: 'Demasiados intentos de login, intenta de nuevo más tarde',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // En desarrollo, permitir más flexibilidad
    return false;
  },
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: isDevelopment ? 1000 : 100, // En desarrollo: 1000 requests, en producción: 100
  message: 'Demasiadas solicitudes, intenta de nuevo más tarde',
  standardHeaders: true,
  legacyHeaders: false,
});

