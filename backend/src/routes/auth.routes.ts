import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { hashPassword, comparePassword } from '../utils/bcrypt';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { authLimiter } from '../middleware/rateLimiter';
import { authenticate } from '../middleware/auth';

const router = Router();

const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

const registerSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  nombre: z.string().min(2),
  role: z.enum(['ADMIN', 'VENDEDOR']),
  localId: z.string().uuid().optional(),
});

// Login
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { username, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { username },
      include: { local: true },
    });

    if (!user || !user.activo) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    const isValidPassword = await comparePassword(password, user.password);

    if (!isValidPassword) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    const tokenPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      localId: user.localId,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        nombre: user.nombre,
        role: user.role,
        localId: user.localId,
        local: user.local ? {
          id: user.local.id,
          nombre: user.local.nombre,
        } : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Register (solo para ADMIN)
router.post('/register', authenticate, async (req, res, next) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Solo los administradores pueden crear usuarios' });
      return;
    }

    const data = registerSchema.parse(req.body);

    // Verificar que el username no exista
    const existingUser = await prisma.user.findUnique({
      where: { username: data.username },
    });

    if (existingUser) {
      res.status(400).json({ error: 'El usuario ya existe' });
      return;
    }

    // Si es VENDEDOR, debe tener localId
    if (data.role === 'VENDEDOR' && !data.localId) {
      res.status(400).json({ error: 'Los vendedores deben tener un local asignado' });
      return;
    }

    // Verificar que el local existe (si se proporciona)
    if (data.localId) {
      const local = await prisma.local.findUnique({
        where: { id: data.localId },
      });

      if (!local) {
        res.status(400).json({ error: 'El local especificado no existe' });
        return;
      }
    }

    const hashedPassword = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        username: data.username,
        password: hashedPassword,
        nombre: data.nombre,
        role: data.role,
        localId: data.localId,
      },
      select: {
        id: true,
        username: true,
        nombre: true,
        role: true,
        localId: true,
        createdAt: true,
      },
    });

    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

// Refresh token
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(401).json({ error: 'Refresh token requerido' });
      return;
    }

    const { verifyRefreshToken } = await import('../utils/jwt');
    const payload = verifyRefreshToken(refreshToken);

    // Verificar que el usuario aún existe y está activo
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || !user.activo) {
      res.status(401).json({ error: 'Usuario no válido' });
      return;
    }

    const newTokenPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      localId: user.localId,
    };

    const newAccessToken = generateAccessToken(newTokenPayload);

    res.json({ accessToken: newAccessToken });
  } catch (error) {
    res.status(401).json({ error: 'Refresh token inválido' });
    return;
  }
});

// Obtener usuario actual
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        username: true,
        nombre: true,
        role: true,
        localId: true,
        activo: true,
        local: req.user?.localId ? {
          select: {
            id: true,
            nombre: true,
            direccion: true,
            telefono: true,
          },
        } : false,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

export default router;

