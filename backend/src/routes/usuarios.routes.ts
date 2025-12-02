import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { createAuditLog } from '../utils/audit';
import { hashPassword } from '../utils/bcrypt';

const router = Router();

const usuarioCreateSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  nombre: z.string().min(2),
  role: z.enum(['ADMIN', 'VENDEDOR', 'DEPOSITO']),
  localId: z.string().uuid().optional().nullable(),
  depositoId: z.string().uuid().optional().nullable(),
});

const usuarioUpdateSchema = z.object({
  nombre: z.string().min(2).optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['ADMIN', 'VENDEDOR', 'DEPOSITO']).optional(),
  localId: z.string().uuid().optional().nullable(),
  depositoId: z.string().uuid().optional().nullable(),
  activo: z.boolean().optional(),
});

// Solo ADMIN puede gestionar usuarios
router.use(authenticate);
router.use(authorize('ADMIN'));

// GET /usuarios - Listar todos los usuarios
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role, localId, activo } = req.query;

    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (localId) {
      where.localId = localId;
    }

    if (activo !== undefined) {
      where.activo = activo === 'true';
    }

    const usuarios = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        nombre: true,
        role: true,
        localId: true,
        depositoId: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
        local: {
          select: {
            id: true,
            nombre: true,
          },
        },
        deposito: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(usuarios);
  } catch (error) {
    next(error);
  }
});

// GET /usuarios/:id - Obtener un usuario
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const usuario = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        username: true,
        nombre: true,
        role: true,
        localId: true,
        depositoId: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
        local: true,
        deposito: {
          select: {
            id: true,
            nombre: true,
          },
        },
        _count: {
          select: {
            ventas: true,
          },
        },
      },
    });

    if (!usuario) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    res.json(usuario);
  } catch (error) {
    next(error);
  }
});

// POST /usuarios - Crear usuario
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = usuarioCreateSchema.parse(req.body);

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
    
    // DEPOSITO no debe tener localId pero puede tener depositoId
    if (data.role === 'DEPOSITO') {
      if (data.localId) {
        res.status(400).json({ error: 'Los usuarios de depósito no deben tener un local asignado' });
        return;
      }
      // Si se proporciona depositoId, verificar que existe
      if (data.depositoId) {
        const deposito = await prisma.deposito.findUnique({
          where: { id: data.depositoId },
        });
        if (!deposito) {
          res.status(400).json({ error: 'El depósito especificado no existe' });
          return;
        }
      }
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

    const usuario = await prisma.user.create({
      data: {
        username: data.username,
        password: hashedPassword,
        nombre: data.nombre,
        role: data.role,
        localId: data.localId || null,
        depositoId: data.depositoId || null,
      },
      select: {
        id: true,
        username: true,
        nombre: true,
        role: true,
        localId: true,
        depositoId: true,
        activo: true,
        createdAt: true,
        local: true,
        deposito: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });

    // Log de auditoría
    await createAuditLog({
      userId: req.user!.id,
      accion: 'CREATE',
      tabla: 'User',
      datosNuevos: usuario,
    });

    res.status(201).json(usuario);
  } catch (error) {
    next(error);
  }
});

// PUT /usuarios/:id - Actualizar usuario
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const usuarioId = req.params.id;
    const data = usuarioUpdateSchema.parse(req.body);

    const usuarioAnterior = await prisma.user.findUnique({
      where: { id: usuarioId },
    });

    if (!usuarioAnterior) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    // Validaciones de localId según el rol
    const nuevoRol = data.role || usuarioAnterior.role;
    
    // Si es VENDEDOR, debe tener localId
    if (nuevoRol === 'VENDEDOR') {
      if (data.localId === null) {
        res.status(400).json({ error: 'Los vendedores deben tener un local asignado' });
        return;
      }
      // Si no se envía localId, mantener el actual (solo si ya es vendedor)
      if (!data.localId && usuarioAnterior.role !== 'VENDEDOR') {
        res.status(400).json({ error: 'Los vendedores deben tener un local asignado' });
        return;
      }
    }
    
    // Si es DEPOSITO, no debe tener localId pero puede tener depositoId
    if (nuevoRol === 'DEPOSITO') {
      if (data.localId !== undefined && data.localId !== null) {
        res.status(400).json({ error: 'Los usuarios de depósito no deben tener un local asignado' });
        return;
      }
      // Si se cambia a DEPOSITO, quitar localId
      if (data.role === 'DEPOSITO' && usuarioAnterior.localId) {
        data.localId = null;
      }
      // Verificar que el depósito existe (si se proporciona)
      if (data.depositoId) {
        const deposito = await prisma.deposito.findUnique({
          where: { id: data.depositoId },
        });
        if (!deposito) {
          res.status(400).json({ error: 'El depósito especificado no existe' });
          return;
        }
      }
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

    const updateData: any = {};

    if (data.nombre) updateData.nombre = data.nombre;
    if (data.password) updateData.password = await hashPassword(data.password);
    if (data.role) updateData.role = data.role;
    if (data.localId !== undefined) updateData.localId = data.localId;
    if (data.depositoId !== undefined) updateData.depositoId = data.depositoId;
    if (data.activo !== undefined) updateData.activo = data.activo;

    const usuarioActualizado = await prisma.user.update({
      where: { id: usuarioId },
      data: updateData,
      select: {
        id: true,
        username: true,
        nombre: true,
        role: true,
        localId: true,
        depositoId: true,
        activo: true,
        updatedAt: true,
        local: true,
        deposito: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });

    // Log de auditoría
    await createAuditLog({
      userId: req.user!.id,
      accion: 'UPDATE',
      tabla: 'User',
      datosAnteriores: usuarioAnterior,
      datosNuevos: usuarioActualizado,
    });

    res.json(usuarioActualizado);
  } catch (error) {
    next(error);
  }
});

// DELETE /usuarios/:id - Eliminar usuario (solo ADMIN, con validaciones)
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const usuarioId = req.params.id;

    // No permitir eliminarse a sí mismo
    if (usuarioId === req.user!.id) {
      res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });
      return;
    }

    const usuario = await prisma.user.findUnique({
      where: { id: usuarioId },
      include: {
        _count: {
          select: {
            ventas: true,
            auditLogs: true,
            pedidosSolicitados: true,
            pedidosAutorizados: true,
            movimientos: true,
            aperturasCaja: true,
          },
        },
      },
    });

    if (!usuario) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    // Verificar si tiene datos asociados (opcional: solo advertir, no bloquear)
    const tieneDatos = 
      usuario._count.ventas > 0 ||
      usuario._count.pedidosSolicitados > 0 ||
      usuario._count.pedidosAutorizados > 0 ||
      usuario._count.movimientos > 0 ||
      usuario._count.aperturasCaja > 0;

    if (tieneDatos) {
      // Eliminar usuario y sus relaciones (cascade)
      await prisma.user.delete({
        where: { id: usuarioId },
      });
    } else {
      // Si no tiene datos, eliminar directamente
      await prisma.user.delete({
        where: { id: usuarioId },
      });
    }

    // Log de auditoría
    await createAuditLog({
      userId: req.user!.id,
      accion: 'DELETE',
      tabla: 'User',
      datosAnteriores: usuario,
      datosNuevos: null,
    });

    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error: any) {
    // Si hay error de foreign key, informar
    if (error.code === 'P2003') {
      res.status(400).json({ 
        error: 'No se puede eliminar el usuario porque tiene datos asociados. Intenta desactivarlo primero.' 
      });
      return;
    }
    next(error);
  }
});

export default router;

