import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, filterByLocal } from '../middleware/auth';
import { createAuditLog } from '../utils/audit';
import { io } from '../index';

const router = Router();

const clienteCreateSchema = z.object({
  nombre: z.string().min(2),
  email: z.string().email().optional().nullable(),
  telefono: z.string().optional().nullable(),
});

const clienteUpdateSchema = clienteCreateSchema.partial();

// Aplicar autenticación a todas las rutas
router.use(authenticate);

// GET /clientes - Listar clientes (compartidos entre todos los locales)
router.get('/', filterByLocal, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, page = '1', limit = '50' } = req.query;

    const where: any = {};

    if (search) {
      where.OR = [
        { nombre: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { telefono: { contains: search as string } },
      ];
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [clientes, total] = await Promise.all([
      prisma.cliente.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { nombre: 'asc' },
        include: {
          _count: {
            select: { ventas: true },
          },
        },
      }),
      prisma.cliente.count({ where }),
    ]);

    res.json({
      clientes,
      paginacion: {
        total,
        pagina: parseInt(page as string),
        limite: parseInt(limit as string),
        totalPaginas: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /clientes/:id - Obtener un cliente
router.get('/:id', filterByLocal, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cliente = await prisma.cliente.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: { ventas: true },
        },
        ventas: {
          take: 10,
          orderBy: { fecha: 'desc' },
          select: {
            id: true,
            fecha: true,
            total: true,
            estado: true,
          },
        },
      },
    });

    if (!cliente) {
      res.status(404).json({ error: 'Cliente no encontrado' });
      return;
    }

    res.json(cliente);
  } catch (error) {
    next(error);
  }
});

// POST /clientes - Crear cliente (vendedores y admin pueden crear)
router.post('/', filterByLocal, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = clienteCreateSchema.parse(req.body);

    // Verificar si el email ya existe
    if (data.email) {
      const existing = await prisma.cliente.findUnique({
        where: { email: data.email },
      });

      if (existing) {
        res.status(400).json({ error: 'Ya existe un cliente con ese email' });
        return;
      }
    }

    const cliente = await prisma.cliente.create({
      data: {
        nombre: data.nombre,
        email: data.email || null,
        telefono: data.telefono || null,
      },
    });

    // Log de auditoría
    await createAuditLog({
      userId: req.user!.id,
      accion: 'CREATE',
      tabla: 'Cliente',
      datosNuevos: cliente,
    });

    // Emitir evento de nuevo cliente para actualizar dashboards
    if (io) {
      io.emit('nuevo-cliente', {
        clienteId: cliente.id,
        fecha: new Date(),
      });
    }

    res.status(201).json(cliente);
  } catch (error) {
    next(error);
  }
});

// PUT /clientes/:id - Actualizar cliente
router.put('/:id', filterByLocal, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clienteId = req.params.id;
    const data = clienteUpdateSchema.parse(req.body);

    const clienteAnterior = await prisma.cliente.findUnique({
      where: { id: clienteId },
    });

    if (!clienteAnterior) {
      res.status(404).json({ error: 'Cliente no encontrado' });
      return;
    }

    // Verificar si el email ya existe en otro cliente
    if (data.email && data.email !== clienteAnterior.email) {
      const existing = await prisma.cliente.findUnique({
        where: { email: data.email },
      });

      if (existing) {
        res.status(400).json({ error: 'Ya existe otro cliente con ese email' });
        return;
      }
    }

    const clienteActualizado = await prisma.cliente.update({
      where: { id: clienteId },
      data: {
        ...(data.nombre && { nombre: data.nombre }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.telefono !== undefined && { telefono: data.telefono || null }),
      },
    });

    // Log de auditoría
    await createAuditLog({
      userId: req.user!.id,
      accion: 'UPDATE',
      tabla: 'Cliente',
      datosAnteriores: clienteAnterior,
      datosNuevos: clienteActualizado,
    });

    // Emitir evento de cliente actualizado para actualizar dashboards
    if (io) {
      io.emit('cliente-actualizado', {
        clienteId: clienteActualizado.id,
        fecha: new Date(),
      });
    }

    res.json(clienteActualizado);
  } catch (error) {
    next(error);
  }
});

// GET /clientes/buscar/:termino - Buscar clientes rápidamente
router.get('/buscar/:termino', filterByLocal, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { termino } = req.params;

    const clientes = await prisma.cliente.findMany({
      where: {
        OR: [
          { nombre: { contains: termino, mode: 'insensitive' } },
          { email: { contains: termino, mode: 'insensitive' } },
          { telefono: { contains: termino } },
        ],
      },
      take: 10,
      orderBy: { nombre: 'asc' },
      select: {
        id: true,
        nombre: true,
        email: true,
        telefono: true,
        puntos: true,
      },
    });

    res.json(clientes);
  } catch (error) {
    next(error);
  }
});

export default router;

