import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

const stockSchema = z.object({
  productoId: z.string(),
  depositoId: z.string(),
  cantidad: z.number().int().min(0),
  stockMinimo: z.number().int().min(0).default(0),
});

// GET /api/stock-deposito - Listar stock de depósito
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { depositoId, productoId } = req.query;

    const where: any = {};
    if (depositoId) where.depositoId = depositoId as string;
    if (productoId) where.productoId = productoId as string;

    const stocks = await prisma.stockDeposito.findMany({
      where,
      include: {
        producto: true,
        deposito: true,
      },
      orderBy: { producto: { nombre: 'asc' } },
    });

    res.json(stocks);
  } catch (error) {
    next(error);
  }
});

// GET /api/stock-deposito/:id - Obtener stock por ID
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const stock = await prisma.stockDeposito.findUnique({
      where: { id },
      include: {
        producto: true,
        deposito: true,
      },
    });

    if (!stock) {
      return res.status(404).json({ error: 'Stock no encontrado' });
    }

    res.json(stock);
  } catch (error) {
    next(error);
  }
});

// POST /api/stock-deposito - Crear o actualizar stock (ADMIN o ALMACEN)
router.post('/', authenticate, authorize('ADMIN', 'ALMACEN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = stockSchema.parse(req.body);

    const stock = await prisma.stockDeposito.upsert({
      where: {
        productoId_depositoId: {
          productoId: data.productoId,
          depositoId: data.depositoId,
        },
      },
      update: {
        cantidad: data.cantidad,
        stockMinimo: data.stockMinimo,
      },
      create: data,
      include: {
        producto: true,
        deposito: true,
      },
    });

    res.status(201).json(stock);
  } catch (error) {
    next(error);
  }
});

// PUT /api/stock-deposito/:id - Actualizar stock (ADMIN o ALMACEN)
router.put('/:id', authenticate, authorize('ADMIN', 'ALMACEN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { cantidad, stockMinimo } = z.object({
      cantidad: z.number().int().min(0).optional(),
      stockMinimo: z.number().int().min(0).optional(),
    }).parse(req.body);

    const stock = await prisma.stockDeposito.update({
      where: { id },
      data: {
        ...(cantidad !== undefined && { cantidad }),
        ...(stockMinimo !== undefined && { stockMinimo }),
      },
      include: {
        producto: true,
        deposito: true,
      },
    });

    res.json(stock);
  } catch (error) {
    next(error);
  }
});

// GET /api/stock-deposito/alerts/bajo-stock - Alertas de stock bajo
router.get('/alerts/bajo-stock', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { depositoId } = req.query;

    const where: any = {
      cantidad: { lte: prisma.stockDeposito.fields.stockMinimo },
    };
    if (depositoId) where.depositoId = depositoId as string;

    const stocks = await prisma.stockDeposito.findMany({
      where,
      include: {
        producto: true,
        deposito: true,
      },
      orderBy: { cantidad: 'asc' },
    });

    res.json(stocks);
  } catch (error) {
    next(error);
  }
});

export default router;

