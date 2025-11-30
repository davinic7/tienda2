import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { hashPassword, comparePassword } from '../utils/bcrypt.util';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.util';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import rateLimit from 'express-rate-limit';
import { config } from '../config/env';

const router = Router();

// Rate limiting para login (más restrictivo en producción)
const loginLimiter = rateLimit({
  windowMs: config.security.rateLimitWindow,
  max: config.security.rateLimitMax,
  message: 'Demasiados intentos de inicio de sesión, intenta de nuevo más tarde',
  standardHeaders: true,
  legacyHeaders: false,
});

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres')
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: { local: true }
    });

    if (!user || !user.activo) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      localId: user.localId
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Para vendedores, obtener locales disponibles
    let localesDisponibles = null;
    if (user.role === 'VENDEDOR') {
      const locales = await prisma.local.findMany({
        where: { activo: true },
        select: {
          id: true,
          nombre: true,
          direccion: true
        },
        orderBy: { nombre: 'asc' }
      });
      localesDisponibles = locales;
    }

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        role: user.role,
        localId: user.localId,
        local: user.local ? {
          id: user.local.id,
          nombre: user.local.nombre
        } : null
      },
      localesDisponibles // Solo para vendedores
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token requerido' });
    }

    const { verifyRefreshToken } = await import('../utils/jwt.util');
    const payload = verifyRefreshToken(refreshToken);

    // Verificar que el usuario aún existe y está activo
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, email: true, role: true, localId: true, activo: true }
    });

    if (!user || !user.activo) {
      return res.status(401).json({ error: 'Usuario inválido' });
    }

    const newPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      localId: user.localId
    };

    const newAccessToken = generateAccessToken(newPayload);

    res.json({ accessToken: newAccessToken });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, (req: AuthRequest, res) => {
  // Con JWT stateless, simplemente respondemos ok
  // En producción podrías mantener una blacklist de tokens
  res.json({ message: 'Sesión cerrada exitosamente' });
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        nombre: true,
        role: true,
        localId: true,
        local: {
          select: {
            id: true,
            nombre: true,
            direccion: true,
            telefono: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

export default router;

