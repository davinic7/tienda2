import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

// GET /api/movimientos-stock - Listar movimientos
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tipo, productoId, depositoId, localId, fechaDesde, fechaHasta } = req.query;
    const user = (req as any).user;

    const where: any = {};
    if (tipo) where.tipo = tipo;
    if (productoId) where.productoId = productoId as string;
    if (depositoId) where.depositoId = depositoId as string;
    if (localId) {
      where.OR = [
        { localOrigenId: localId as string },
        { localDestinoId: localId as string },
      ];
    }

    // Filtro por fechas
    if (fechaDesde || fechaHasta) {
      where.fecha = {};
      if (fechaDesde) where.fecha.gte = new Date(fechaDesde as string);
      if (fechaHasta) where.fecha.lte = new Date(fechaHasta as string);
    }

    // Los vendedores solo ven movimientos de su local
    if (user.role === 'VENDEDOR' && user.localId) {
      where.OR = [
        { localOrigenId: user.localId },
        { localDestinoId: user.localId },
      ];
    }

    const movimientos = await prisma.movimientoStock.findMany({
      where,
      include: {
        producto: true,
        deposito: true,
        localOrigen: true,
        localDestino: true,
        usuario: { select: { id: true, nombre: true, username: true } },
        pedido: true,
      },
      orderBy: { fecha: 'desc' },
    });

    res.json(movimientos);
  } catch (error) {
    next(error);
  }
});

// GET /api/movimientos-stock/:id - Obtener movimiento por ID
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const movimiento = await prisma.movimientoStock.findUnique({
      where: { id },
      include: {
        producto: true,
        deposito: true,
        localOrigen: true,
        localDestino: true,
        usuario: { select: { id: true, nombre: true, username: true } },
        pedido: true,
      },
    });

    if (!movimiento) {
      return res.status(404).json({ error: 'Movimiento no encontrado' });
    }

    res.json(movimiento);
  } catch (error) {
    next(error);
  }
});

export default router;

