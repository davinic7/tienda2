import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import { prisma } from '../config/database';

// Extender Request para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload & { id: string };
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Token no proporcionado' });
      return;
    }

    const token = authHeader.substring(7);

    try {
      const payload = verifyAccessToken(token);

      // Verificar que el usuario aún existe y está activo
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, username: true, role: true, localId: true, activo: true },
      });

      if (!user || !user.activo) {
        res.status(401).json({ error: 'Usuario no válido o inactivo' });
        return;
      }

      req.user = {
        id: user.id,
        userId: user.id,
        username: user.username,
        role: user.role,
        localId: user.localId,
      };

      next();
    } catch (error) {
      res.status(401).json({ error: 'Token inválido o expirado' });
      return;
    }
  } catch (error) {
    res.status(500).json({ error: 'Error en autenticación' });
    return;
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'No tienes permisos para esta acción' });
      return;
    }

    next();
  };
};

// Middleware para filtrar por local (para vendedores)
export const filterByLocal = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user && req.user.role === 'VENDEDOR' && req.user.localId) {
    // Agregar localId a query para que los endpoints lo usen
    req.query.localId = req.user.localId;
    req.body.localId = req.body.localId || req.user.localId;
  }
  next();
};

