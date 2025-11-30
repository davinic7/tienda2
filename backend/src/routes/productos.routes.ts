import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, authorize, filterByLocal } from '../middleware/auth';
import { createAuditLog } from '../utils/audit';
import { io } from '../index';
import { emitPriceUpdate } from '../config/socket';
import { calcularPrecioSugerido } from '../utils/precio.util';

const router = Router();

const productoCreateSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  codigo: z.string().optional(),
  codigoBarras: z.string().optional(),
  costo: z.number().positive(),
  iva: z.number().min(0).max(100).optional().default(21),
  porcentajeUtilidadDefault: z.number().min(0).max(100).optional().default(30),
  categoria: z.string().optional(),
  unidadMedida: z.string().optional().default('UNIDAD'),
  fechaVencimiento: z.string().datetime().optional().nullable(),
  imagenUrl: z.string().url().optional().or(z.literal('')),
});

const productoUpdateSchema = z.object({
  nombre: z.string().min(1).optional(),
  descripcion: z.string().optional(),
  codigo: z.string().optional().nullable(),
  codigoBarras: z.string().optional().nullable(),
  costo: z.number().positive().optional(),
  iva: z.number().min(0).max(100).optional(),
  porcentajeUtilidadDefault: z.number().min(0).max(100).optional(),
  categoria: z.string().optional().nullable(),
  unidadMedida: z.string().optional(),
  fechaVencimiento: z.string().datetime().optional().nullable(),
  imagenUrl: z.string().url().optional().or(z.literal('')).nullable(),
});

// Aplicar autenticación a todas las rutas
router.use(authenticate);

// GET /productos - Listar productos (ADMIN: todos, VENDEDOR: todos pero solo puede ver)
router.get('/', filterByLocal, async (req, res, next) => {
  try {
    const { search, categoria, activo } = req.query;

    const where: any = {};

    if (search) {
      where.OR = [
        { nombre: { contains: search as string, mode: 'insensitive' } },
        { codigo: { contains: search as string, mode: 'insensitive' } },
        { codigoBarras: { contains: search as string } },
      ];
    }

    if (categoria) {
      where.categoria = categoria;
    }

    if (activo !== undefined) {
      where.activo = activo === 'true';
    }

    const productos = await prisma.producto.findMany({
      where,
      orderBy: { nombre: 'asc' },
      include: {
        stocks: req.user?.localId
          ? {
              where: { localId: req.user.localId },
              select: {
                cantidad: true,
                stockMinimo: true,
              },
            }
          : true,
        preciosLocales: req.user?.localId
          ? {
              where: { localId: req.user.localId },
            }
          : false,
        preciosPorCantidad: {
          where: { activo: true },
          orderBy: { cantidad: 'asc' },
        },
      },
    });

    // Calcular precio final para cada producto según el local
    const productosConPrecio = productos.map((producto) => {
      let precioFinal = producto.precio ? Number(producto.precio) : null;
      
      // Si hay precio local aprobado, usarlo
      if (req.user?.localId && producto.preciosLocales && producto.preciosLocales.length > 0) {
        const precioLocal = producto.preciosLocales[0];
        if (precioLocal.precioAprobado) {
          precioFinal = Number(precioLocal.precio);
        }
      }

      // Si no hay precio aprobado, calcular sugerido
      if (!precioFinal && producto.precioAprobado === false) {
        precioFinal = calcularPrecioSugerido(
          Number(producto.costo),
          Number(producto.iva),
          req.user?.localId && producto.preciosLocales && producto.preciosLocales.length > 0
            ? Number(producto.preciosLocales[0].porcentajeUtilidad)
            : Number(producto.porcentajeUtilidadDefault)
        );
      }

      return {
        ...producto,
        precioFinal,
      };
    });

    res.json(productosConPrecio);
  } catch (error) {
    next(error);
  }
});

// GET /productos/codigo/:codigo - Buscar producto por código de barras
router.get('/codigo/:codigo', filterByLocal, async (req, res, next) => {
  try {
    const { codigo } = req.params;

    const producto = await prisma.producto.findFirst({
      where: {
        OR: [
          { codigoBarras: codigo },
          { codigo: codigo },
        ],
        activo: true,
      },
      include: {
        stocks: req.user?.localId
          ? {
              where: { localId: req.user.localId },
              select: {
                cantidad: true,
                stockMinimo: true,
              },
            }
          : true,
        preciosLocales: req.user?.localId
          ? {
              where: { localId: req.user.localId },
            }
          : false,
        preciosPorCantidad: {
          where: { activo: true },
          orderBy: { cantidad: 'asc' },
        },
      },
    });

    if (!producto) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    // Calcular precio final
    let precioFinal = producto.precio ? Number(producto.precio) : null;
    
    if (req.user?.localId && producto.preciosLocales && producto.preciosLocales.length > 0) {
      const precioLocal = producto.preciosLocales[0];
      if (precioLocal.precioAprobado) {
        precioFinal = Number(precioLocal.precio);
      }
    }

    if (!precioFinal && producto.precioAprobado === false) {
      precioFinal = calcularPrecioSugerido(
        Number(producto.costo),
        Number(producto.iva),
        req.user?.localId && producto.preciosLocales && producto.preciosLocales.length > 0
          ? Number(producto.preciosLocales[0].porcentajeUtilidad)
          : Number(producto.porcentajeUtilidadDefault)
      );
    }

    res.json({
      ...producto,
      precioFinal,
    });
  } catch (error) {
    next(error);
  }
});

// GET /productos/:id - Obtener un producto
router.get('/:id', filterByLocal, async (req, res, next) => {
  try {
    const producto = await prisma.producto.findUnique({
      where: { id: req.params.id },
      include: {
        stocks: req.user?.localId
          ? {
              where: { localId: req.user.localId },
            }
          : true,
      },
    });

    if (!producto) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    res.json(producto);
  } catch (error) {
    next(error);
  }
});

// POST /productos - Crear producto (solo ADMIN)
// Al crear solo se ingresa el costo, el sistema calcula el precio sugerido
router.post('/', authorize('ADMIN'), async (req, res, next) => {
  try {
    const data = productoCreateSchema.parse(req.body);

    // Verificar si el código ya existe
    if (data.codigo) {
      const existingCodigo = await prisma.producto.findUnique({
        where: { codigo: data.codigo },
      });
      if (existingCodigo) {
        res.status(400).json({ error: 'El código ya existe' });
        return;
      }
    }

    // Verificar si el código de barras ya existe
    if (data.codigoBarras) {
      const existing = await prisma.producto.findUnique({
        where: { codigoBarras: data.codigoBarras },
      });

      if (existing) {
        res.status(400).json({ error: 'El código de barras ya existe' });
        return;
      }
    }

    // Calcular precio sugerido
    const precioSugerido = calcularPrecioSugerido(
      data.costo,
      data.iva || 21,
      data.porcentajeUtilidadDefault || 30
    );

    const producto = await prisma.producto.create({
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        codigo: data.codigo || null,
        codigoBarras: data.codigoBarras || null,
        costo: data.costo,
        iva: data.iva || 21,
        porcentajeUtilidadDefault: data.porcentajeUtilidadDefault || 30,
        precio: precioSugerido, // Precio sugerido (no aprobado aún)
        precioAprobado: false,
        categoria: data.categoria || null,
        unidadMedida: data.unidadMedida || 'UNIDAD',
        fechaVencimiento: data.fechaVencimiento ? new Date(data.fechaVencimiento) : null,
        imagenUrl: data.imagenUrl || null,
      },
    });

    // Log de auditoría
    await createAuditLog({
      userId: req.user!.id,
      accion: 'CREATE',
      tabla: 'Producto',
      datosNuevos: producto,
    });

    res.status(201).json({
      ...producto,
      precioSugerido,
      precioFinal: precioSugerido,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /productos/:id - Actualizar producto (solo ADMIN)
// Solo permite actualizar datos básicos, no el precio (ese se hace con la ruta de aprobación)
router.put('/:id', authorize('ADMIN'), async (req, res, next) => {
  try {
    const productoId = req.params.id;
    const data = productoUpdateSchema.parse(req.body);

    // Verificar que el producto existe
    const productoAnterior = await prisma.producto.findUnique({
      where: { id: productoId },
    });

    if (!productoAnterior) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    // Verificar si el código ya existe en otro producto
    if (data.codigo !== undefined && data.codigo !== productoAnterior.codigo) {
      if (data.codigo) {
        const existingCodigo = await prisma.producto.findUnique({
          where: { codigo: data.codigo },
        });
        if (existingCodigo) {
          res.status(400).json({ error: 'El código ya existe' });
          return;
        }
      }
    }

    // Verificar si el código de barras ya existe en otro producto
    if (data.codigoBarras !== undefined && data.codigoBarras !== productoAnterior.codigoBarras) {
      if (data.codigoBarras) {
        const existing = await prisma.producto.findUnique({
          where: { codigoBarras: data.codigoBarras },
        });

        if (existing) {
          res.status(400).json({ error: 'El código de barras ya existe' });
          return;
        }
      }
    }

    // Si cambia el costo, recalcular precio sugerido
    let precioSugerido = productoAnterior.precio ? Number(productoAnterior.precio) : null;
    if (data.costo !== undefined) {
      precioSugerido = calcularPrecioSugerido(
        data.costo,
        data.iva !== undefined ? data.iva : Number(productoAnterior.iva),
        data.porcentajeUtilidadDefault !== undefined 
          ? data.porcentajeUtilidadDefault 
          : Number(productoAnterior.porcentajeUtilidadDefault)
      );
    } else if (data.iva !== undefined || data.porcentajeUtilidadDefault !== undefined) {
      precioSugerido = calcularPrecioSugerido(
        Number(productoAnterior.costo),
        data.iva !== undefined ? data.iva : Number(productoAnterior.iva),
        data.porcentajeUtilidadDefault !== undefined 
          ? data.porcentajeUtilidadDefault 
          : Number(productoAnterior.porcentajeUtilidadDefault)
      );
    }

    const updateData: any = {
      ...(data.nombre && { nombre: data.nombre }),
      ...(data.descripcion !== undefined && { descripcion: data.descripcion }),
      ...(data.codigo !== undefined && { codigo: data.codigo || null }),
      ...(data.codigoBarras !== undefined && { codigoBarras: data.codigoBarras || null }),
      ...(data.costo !== undefined && { costo: data.costo }),
      ...(data.iva !== undefined && { iva: data.iva }),
      ...(data.porcentajeUtilidadDefault !== undefined && { porcentajeUtilidadDefault: data.porcentajeUtilidadDefault }),
      ...(data.categoria !== undefined && { categoria: data.categoria || null }),
      ...(data.unidadMedida !== undefined && { unidadMedida: data.unidadMedida }),
      ...(data.fechaVencimiento !== undefined && { fechaVencimiento: data.fechaVencimiento ? new Date(data.fechaVencimiento) : null }),
      ...(data.imagenUrl !== undefined && { imagenUrl: data.imagenUrl || null }),
    };

    // Si se recalcula el precio sugerido, actualizarlo pero mantener precioAprobado en false
    if (precioSugerido !== null && precioSugerido !== Number(productoAnterior.precio)) {
      updateData.precio = precioSugerido;
      updateData.precioAprobado = false; // Requiere nueva aprobación
    }

    const productoActualizado = await prisma.producto.update({
      where: { id: productoId },
      data: updateData,
    });

    // Log de auditoría
    await createAuditLog({
      userId: req.user!.id,
      accion: 'UPDATE',
      tabla: 'Producto',
      datosAnteriores: productoAnterior,
      datosNuevos: productoActualizado,
    });

    // Emitir evento de actualización de precio en tiempo real (solo si cambió el precio)
    if (precioSugerido !== null && precioSugerido !== Number(productoAnterior.precio)) {
      emitPriceUpdate(io, {
        ...productoActualizado,
        precio: Number(productoActualizado.precio),
      });
    }

    res.json({
      ...productoActualizado,
      precioSugerido: precioSugerido || Number(productoActualizado.precio),
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /productos/:id - Eliminar producto (solo ADMIN)
router.delete('/:id', authorize('ADMIN'), async (req, res, next) => {
  try {
    const productoId = req.params.id;

    const producto = await prisma.producto.findUnique({
      where: { id: productoId },
    });

    if (!producto) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    // Soft delete: marcar como inactivo
    const productoEliminado = await prisma.producto.update({
      where: { id: productoId },
      data: { activo: false },
    });

    // Log de auditoría
    await createAuditLog({
      userId: req.user!.id,
      accion: 'DELETE',
      tabla: 'Producto',
      datosAnteriores: producto,
      datosNuevos: productoEliminado,
    });

    res.json({ message: 'Producto eliminado correctamente', producto: productoEliminado });
  } catch (error) {
    next(error);
  }
});

// GET /productos/codigo/:codigoBarras - Buscar por código de barras
router.get('/codigo/:codigoBarras', filterByLocal, async (req, res, next) => {
  try {
    const producto = await prisma.producto.findUnique({
      where: { codigoBarras: req.params.codigoBarras },
      include: {
        stocks: req.user?.localId
          ? {
              where: { localId: req.user.localId },
            }
          : true,
        preciosLocales: req.user?.localId
          ? {
              where: { localId: req.user.localId },
            }
          : false,
        preciosPorCantidad: {
          where: { activo: true },
          orderBy: { cantidad: 'asc' },
        },
      },
    });

    if (!producto) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    res.json(producto);
  } catch (error) {
    next(error);
  }
});

// POST /productos/:id/aprobar-precio - Aprobar o ajustar precio (solo ADMIN)
router.post('/:id/aprobar-precio', authorize('ADMIN'), async (req, res, next) => {
  try {
    const productoId = req.params.id;
    const { precio, porcentajeUtilidad, localId, motivo } = req.body;

    if (!precio || precio <= 0) {
      res.status(400).json({ error: 'El precio debe ser mayor a 0' });
      return;
    }

    const producto = await prisma.producto.findUnique({
      where: { id: productoId },
    });

    if (!producto) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    const precioAnterior = producto.precio ? Number(producto.precio) : null;
    const porcentajeUtilidadAnterior = producto.porcentajeUtilidadDefault 
      ? Number(producto.porcentajeUtilidadDefault) 
      : null;

    // Si se especifica un local, crear/actualizar precio local
    if (localId) {
      const local = await prisma.local.findUnique({ where: { id: localId } });
      if (!local) {
        res.status(404).json({ error: 'Local no encontrado' });
        return;
      }

      const porcentajeUtilidadFinal = porcentajeUtilidad || Number(local.porcentajeUtilidadDefault);

      // Crear o actualizar precio local
      const precioLocal = await prisma.precioLocal.upsert({
        where: {
          productoId_localId: {
            productoId,
            localId,
          },
        },
        create: {
          productoId,
          localId,
          porcentajeUtilidad: porcentajeUtilidadFinal,
          precio: precio,
          precioAprobado: true,
          aprobadoPor: req.user!.id,
          fechaAprobacion: new Date(),
        },
        update: {
          porcentajeUtilidad: porcentajeUtilidadFinal,
          precio: precio,
          precioAprobado: true,
          aprobadoPor: req.user!.id,
          fechaAprobacion: new Date(),
        },
      });

      // Registrar en historial
      await prisma.historialPrecio.create({
        data: {
          productoId,
          localId,
          precioAnterior: precioLocal.precioAprobado ? precioAnterior : null,
          precioNuevo: precio,
          porcentajeUtilidadAnterior,
          porcentajeUtilidadNuevo: porcentajeUtilidadFinal,
          motivo: motivo || null,
          usuarioId: req.user!.id,
        },
      });

      res.json({
        message: 'Precio aprobado para el local',
        precioLocal,
      });
    } else {
      // Aprobar precio general del producto
      const productoActualizado = await prisma.producto.update({
        where: { id: productoId },
        data: {
          precio: precio,
          precioAprobado: true,
          ...(porcentajeUtilidad && { porcentajeUtilidadDefault: porcentajeUtilidad }),
        },
      });

      // Registrar en historial
      await prisma.historialPrecio.create({
        data: {
          productoId,
          precioAnterior,
          precioNuevo: precio,
          porcentajeUtilidadAnterior,
          porcentajeUtilidadNuevo: porcentajeUtilidad || porcentajeUtilidadAnterior,
          motivo: motivo || null,
          usuarioId: req.user!.id,
        },
      });

      // Log de auditoría
      await createAuditLog({
        userId: req.user!.id,
        accion: 'APPROVE_PRICE',
        tabla: 'Producto',
        datosAnteriores: producto,
        datosNuevos: productoActualizado,
      });

      // Emitir evento de actualización de precio
      emitPriceUpdate(io, {
        ...productoActualizado,
        precio: Number(productoActualizado.precio),
      });

      res.json({
        message: 'Precio aprobado',
        producto: productoActualizado,
      });
    }
  } catch (error) {
    next(error);
  }
});

// GET /productos/:id/precios-local - Obtener precios por local de un producto
router.get('/:id/precios-local', authorize('ADMIN'), async (req, res, next) => {
  try {
    const precios = await prisma.precioLocal.findMany({
      where: { productoId: req.params.id },
      include: {
        local: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
      orderBy: { local: { nombre: 'asc' } },
    });

    res.json(precios);
  } catch (error) {
    next(error);
  }
});

// GET /productos/:id/historial-precios - Obtener historial de precios
router.get('/:id/historial-precios', authorize('ADMIN'), async (req, res, next) => {
  try {
    const historial = await prisma.historialPrecio.findMany({
      where: { productoId: req.params.id },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            username: true,
          },
        },
        local: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
      orderBy: { fecha: 'desc' },
      take: 50,
    });

    res.json(historial);
  } catch (error) {
    next(error);
  }
});

// POST /productos/:id/precios-cantidad - Crear precio por cantidad
router.post('/:id/precios-cantidad', authorize('ADMIN'), async (req, res, next) => {
  try {
    const { cantidad, precio } = req.body;

    if (!cantidad || cantidad <= 0 || !precio || precio <= 0) {
      res.status(400).json({ error: 'Cantidad y precio deben ser mayores a 0' });
      return;
    }

    const precioCantidad = await prisma.precioPorCantidad.upsert({
      where: {
        productoId_cantidad: {
          productoId: req.params.id,
          cantidad,
        },
      },
      create: {
        productoId: req.params.id,
        cantidad,
        precio,
      },
      update: {
        precio,
        activo: true,
      },
    });

    res.json(precioCantidad);
  } catch (error) {
    next(error);
  }
});

// DELETE /productos/:id/precios-cantidad/:precioId - Eliminar precio por cantidad
router.delete('/:id/precios-cantidad/:precioId', authorize('ADMIN'), async (req, res, next) => {
  try {
    await prisma.precioPorCantidad.update({
      where: { id: req.params.precioId },
      data: { activo: false },
    });

    res.json({ message: 'Precio por cantidad desactivado' });
  } catch (error) {
    next(error);
  }
});

export default router;

