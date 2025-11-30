import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { hashPassword } from '../utils/bcrypt.util';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/audit.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateToken);
router.use(requireRole('ADMIN')); // Solo ADMIN puede gestionar usuarios
router.use(auditLog);

const createUsuarioSchema = z.object({
  email: z.string().email('Email inválido'),
  nombre: z.string().min(1, 'El nombre es requerido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  role: z.nativeEnum(Role),
  localId: z.string().uuid('ID de local inválido').nullable().optional()
});

const updateUsuarioSchema = z.object({
  email: z.string().email('Email inválido').optional(),
  nombre: z.string().min(1, 'El nombre es requerido').optional(),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional(),
  role: z.nativeEnum(Role).optional(),
  localId: z.string().uuid('ID de local inválido').nullable().optional(),
  activo: z.boolean().optional()
});

// GET /api/usuarios - Listar usuarios
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { role, localId, activo } = req.query;

    const where: any = {};

    if (role) {
      where.role = role as Role;
    }

    if (localId) {
      where.localId = localId as string;
    }

    if (activo !== undefined) {
      where.activo = activo === 'true';
    }

    const usuarios = await prisma.user.findMany({
      where,
      include: {
        local: {
          select: {
            id: true,
            nombre: true,
            direccion: true,
            telefono: true
          }
        },
        _count: {
          select: {
            ventas: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ usuarios });
  } catch (error) {
    next(error);
  }
});

// GET /api/usuarios/:id - Obtener usuario por ID
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const usuario = await prisma.user.findUnique({
      where: { id },
      include: {
        local: {
          select: {
            id: true,
            nombre: true,
            direccion: true,
            telefono: true
          }
        },
        ventas: {
          take: 10,
          orderBy: { fecha: 'desc' },
          select: {
            id: true,
            fecha: true,
            total: true,
            estado: true
          }
        }
      }
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // No devolver la contraseña
    const { password, ...usuarioSinPassword } = usuario;
    res.json({ usuario: usuarioSinPassword });
  } catch (error) {
    next(error);
  }
});

// POST /api/usuarios - Crear usuario
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const data = createUsuarioSchema.parse(req.body);

    // Validar que si es VENDEDOR, debe tener localId
    if (data.role === 'VENDEDOR' && !data.localId) {
      return res.status(400).json({ error: 'Los vendedores deben tener un local asignado' });
    }

    // Validar que si es ADMIN, no debe tener localId
    if (data.role === 'ADMIN' && data.localId) {
      return res.status(400).json({ error: 'Los administradores no pueden tener local asignado' });
    }

    // Verificar que el local existe si se proporciona
    if (data.localId) {
      const local = await prisma.local.findUnique({
        where: { id: data.localId }
      });

      if (!local) {
        return res.status(404).json({ error: 'Local no encontrado' });
      }
    }

    // Verificar que el email no esté en uso
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Ya existe un usuario con este email' });
    }

    // Hashear contraseña
    const hashedPassword = await hashPassword(data.password);

    const usuario = await prisma.user.create({
      data: {
        email: data.email,
        nombre: data.nombre,
        password: hashedPassword,
        role: data.role,
        localId: data.role === 'ADMIN' ? null : data.localId || null
      },
      include: {
        local: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    });

    // No devolver la contraseña
    const { password, ...usuarioSinPassword } = usuario;
    res.status(201).json({ usuario: usuarioSinPassword });
  } catch (error) {
    next(error);
  }
});

// PUT /api/usuarios/:id - Actualizar usuario
router.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const data = updateUsuarioSchema.parse(req.body);

    // Verificar que el usuario existe
    const usuarioExistente = await prisma.user.findUnique({
      where: { id }
    });

    if (!usuarioExistente) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Validaciones
    if (data.role === 'VENDEDOR' && !data.localId && !usuarioExistente.localId) {
      return res.status(400).json({ error: 'Los vendedores deben tener un local asignado' });
    }

    if (data.role === 'ADMIN' && (data.localId || usuarioExistente.localId)) {
      return res.status(400).json({ error: 'Los administradores no pueden tener local asignado' });
    }

    // Verificar que el local existe si se proporciona
    if (data.localId) {
      const local = await prisma.local.findUnique({
        where: { id: data.localId }
      });

      if (!local) {
        return res.status(404).json({ error: 'Local no encontrado' });
      }
    }

    // Verificar que el email no esté en uso por otro usuario
    if (data.email && data.email !== usuarioExistente.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email }
      });

      if (existingUser) {
        return res.status(409).json({ error: 'Ya existe un usuario con este email' });
      }
    }

    // Preparar datos de actualización
    const updateData: any = {};

    if (data.email) updateData.email = data.email;
    if (data.nombre) updateData.nombre = data.nombre;
    if (data.role) updateData.role = data.role;
    if (data.activo !== undefined) updateData.activo = data.activo;
    if (data.localId !== undefined) {
      updateData.localId = data.role === 'ADMIN' ? null : data.localId;
    }

    // Hashear contraseña si se proporciona
    if (data.password) {
      updateData.password = await hashPassword(data.password);
    }

    const usuario = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        local: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    });

    // No devolver la contraseña
    const { password, ...usuarioSinPassword } = usuario;
    res.json({ usuario: usuarioSinPassword });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/usuarios/:id - Eliminar usuario (soft delete)
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    // No permitir eliminar a sí mismo
    if (id === req.user!.id) {
      return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });
    }

    const usuario = await prisma.user.findUnique({
      where: { id }
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Soft delete: marcar como inactivo
    const usuarioActualizado = await prisma.user.update({
      where: { id },
      data: { activo: false }
    });

    res.json({ message: 'Usuario eliminado exitosamente', usuario: usuarioActualizado });
  } catch (error) {
    next(error);
  }
});

export default router;

