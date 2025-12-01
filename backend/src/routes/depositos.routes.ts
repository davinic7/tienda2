import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

const depositoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  activo: z.boolean().default(true),
});

// GET /api/depositos - Listar depósitos
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const depositos = await prisma.deposito.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
    });
    res.json(depositos);
  } catch (error) {
    next(error);
  }
});

// GET /api/depositos/:id - Obtener depósito por ID
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const deposito = await prisma.deposito.findUnique({
      where: { id },
    });

    if (!deposito) {
      return res.status(404).json({ error: 'Depósito no encontrado' });
    }

    res.json(deposito);
  } catch (error) {
    next(error);
  }
});

// POST /api/depositos - Crear depósito (solo ADMIN)
router.post('/', authenticate, authorize('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = depositoSchema.parse(req.body);
    const deposito = await prisma.deposito.create({
      data,
    });
    res.status(201).json(deposito);
  } catch (error) {
    next(error);
  }
});

// PUT /api/depositos/:id - Actualizar depósito (solo ADMIN)
router.put('/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = depositoSchema.parse(req.body);

    const deposito = await prisma.deposito.update({
      where: { id },
      data,
    });

    res.json(deposito);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/depositos/:id - Desactivar depósito (solo ADMIN)
router.delete('/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await prisma.deposito.update({
      where: { id },
      data: { activo: false },
    });

    res.json({ message: 'Depósito desactivado' });
  } catch (error) {
    next(error);
  }
});

export default router;

