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
});

const usuarioUpdateSchema = z.object({
  nombre: z.string().min(2).optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['ADMIN', 'VENDEDOR', 'ALMACEN']).optional(),
  localId: z.string().uuid().optional().nullable(),
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
        activo: true,
        createdAt: true,
        updatedAt: true,
        local: {
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
        activo: true,
        createdAt: true,
        updatedAt: true,
        local: true,
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
    // DEPOSITO no requiere localId (trabaja en el depósito central)
    if (data.role === 'VENDEDOR' && !data.localId) {
      res.status(400).json({ error: 'Los vendedores deben tener un local asignado' });
      return;
    }
    
    // DEPOSITO no debe tener localId asignado
    if (data.role === 'DEPOSITO' && data.localId) {
      res.status(400).json({ error: 'Los usuarios de depósito no deben tener un local asignado' });
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

    const usuario = await prisma.user.create({
      data: {
        username: data.username,
        password: hashedPassword,
        nombre: data.nombre,
        role: data.role,
        localId: data.localId || null,
      },
      select: {
        id: true,
        username: true,
        nombre: true,
        role: true,
        localId: true,
        activo: true,
        createdAt: true,
        local: true,
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
    
    // Si es DEPOSITO, no debe tener localId
    if (nuevoRol === 'DEPOSITO' && data.localId !== undefined && data.localId !== null) {
      res.status(400).json({ error: 'Los usuarios de depósito no deben tener un local asignado' });
      return;
    }
    
    // Si se cambia a DEPOSITO, quitar localId
    if (data.role === 'DEPOSITO' && usuarioAnterior.localId) {
      data.localId = null;
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
        activo: true,
        updatedAt: true,
        local: true,
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

// DELETE /usuarios/:id - Desactivar usuario
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const usuarioId = req.params.id;

    // No permitir desactivarse a sí mismo
    if (usuarioId === req.user!.id) {
      res.status(400).json({ error: 'No puedes desactivar tu propio usuario' });
      return;
    }

    const usuario = await prisma.user.findUnique({
      where: { id: usuarioId },
    });

    if (!usuario) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    // Soft delete: marcar como inactivo
    const usuarioDesactivado = await prisma.user.update({
      where: { id: usuarioId },
      data: { activo: false },
      select: {
        id: true,
        username: true,
        nombre: true,
        role: true,
        activo: true,
      },
    });

    // Log de auditoría
    await createAuditLog({
      userId: req.user!.id,
      accion: 'DELETE',
      tabla: 'User',
      datosAnteriores: usuario,
      datosNuevos: usuarioDesactivado,
    });

    res.json({ message: 'Usuario desactivado correctamente', usuario: usuarioDesactivado });
  } catch (error) {
    next(error);
  }
});

export default router;

