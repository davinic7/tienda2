import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/audit.middleware';

const router = Router();

router.use(authenticateToken);
router.use(auditLog);

const abrirTurnoSchema = z.object({
  localId: z.string().uuid('ID de local inválido'),
  efectivo_inicial: z.number().min(0, 'El efectivo inicial debe ser mayor o igual a 0')
});

const cerrarTurnoSchema = z.object({
  efectivo_final: z.number().min(0, 'El efectivo final debe ser mayor o igual a 0'),
  observaciones: z.string().optional()
});

// GET /api/turnos/activo - Obtener turno activo del vendedor
router.get('/activo', async (req: AuthRequest, res, next) => {
  try {
    const vendedorId = req.user!.id;

    const turnoActivo = await prisma.turno.findFirst({
      where: {
        vendedorId,
        estado: 'ABIERTO'
      },
      include: {
        local: {
          select: {
            id: true,
            nombre: true,
            direccion: true
          }
        },
        vendedor: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        },
        _count: {
          select: {
            ventas: true
          }
        }
      },
      orderBy: {
        fecha_apertura: 'desc'
      }
    });

    if (!turnoActivo) {
      return res.json({ turno: null });
    }

    // Calcular total de ventas del turno
    const ventasTurno = await prisma.venta.aggregate({
      where: {
        turnoId: turnoActivo.id,
        estado: 'COMPLETADA'
      },
      _sum: {
        total: true
      },
      _count: {
        id: true
      }
    });

    // Calcular efectivo esperado
    const ventasEfectivo = await prisma.venta.aggregate({
      where: {
        turnoId: turnoActivo.id,
        estado: 'COMPLETADA',
        metodoPago: {
          in: ['EFECTIVO', 'MIXTO']
        }
      },
      _sum: {
        efectivoRecibido: true
      }
    });

    const efectivoEsperado = Number(turnoActivo.efectivo_inicial) + 
      (Number(ventasEfectivo._sum.efectivoRecibido) || 0);

    res.json({
      turno: {
        ...turnoActivo,
        totalVentas: Number(ventasTurno._sum.total) || 0,
        cantidadVentas: ventasTurno._count.id || 0,
        efectivo_esperado: efectivoEsperado
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/turnos/abrir - Abrir un nuevo turno
router.post('/abrir', requireRole('VENDEDOR'), async (req: AuthRequest, res, next) => {
  try {
    const vendedorId = req.user!.id;
    const data = abrirTurnoSchema.parse(req.body);

    // Verificar que no tenga un turno abierto
    const turnoAbierto = await prisma.turno.findFirst({
      where: {
        vendedorId,
        estado: 'ABIERTO'
      }
    });

    if (turnoAbierto) {
      return res.status(400).json({
        error: 'Ya tienes un turno abierto. Debes cerrarlo antes de abrir uno nuevo.'
      });
    }

    // Verificar que el local existe y está activo
    const local = await prisma.local.findUnique({
      where: { id: data.localId }
    });

    if (!local || !local.activo) {
      return res.status(404).json({ error: 'Local no encontrado o inactivo' });
    }

    // Crear turno
    const turno = await prisma.turno.create({
      data: {
        vendedorId,
        localId: data.localId,
        efectivo_inicial: data.efectivo_inicial
      },
      include: {
        local: {
          select: {
            id: true,
            nombre: true,
            direccion: true
          }
        },
        vendedor: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      }
    });

    res.status(201).json({ turno });
  } catch (error) {
    next(error);
  }
});

// POST /api/turnos/:id/cerrar - Cerrar un turno
router.post('/:id/cerrar', requireRole('VENDEDOR'), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const vendedorId = req.user!.id;
    const data = cerrarTurnoSchema.parse(req.body);

    // Verificar que el turno existe y pertenece al vendedor
    const turno = await prisma.turno.findUnique({
      where: { id },
      include: {
        ventas: {
          where: {
            estado: 'COMPLETADA'
          }
        }
      }
    });

    if (!turno) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    if (turno.vendedorId !== vendedorId) {
      return res.status(403).json({ error: 'No tienes permiso para cerrar este turno' });
    }

    if (turno.estado === 'CERRADO') {
      return res.status(400).json({ error: 'Este turno ya está cerrado' });
    }

    // Calcular efectivo esperado
    const ventasEfectivo = await prisma.venta.aggregate({
      where: {
        turnoId: id,
        estado: 'COMPLETADA',
        metodoPago: {
          in: ['EFECTIVO', 'MIXTO']
        }
      },
      _sum: {
        efectivoRecibido: true
      }
    });

    const efectivoEsperado = Number(turno.efectivo_inicial) + 
      (Number(ventasEfectivo._sum.efectivoRecibido) || 0);
    const diferencia = data.efectivo_final - efectivoEsperado;

    // Cerrar turno
    const turnoCerrado = await prisma.turno.update({
      where: { id },
      data: {
        fecha_cierre: new Date(),
        efectivo_final: data.efectivo_final,
        efectivo_esperado: efectivoEsperado,
        diferencia: diferencia,
        estado: 'CERRADO',
        observaciones: data.observaciones
      },
      include: {
        local: {
          select: {
            id: true,
            nombre: true
          }
        },
        vendedor: {
          select: {
            id: true,
            nombre: true
          }
        },
        _count: {
          select: {
            ventas: true
          }
        }
      }
    });

    // Obtener estadísticas del turno
    const estadisticas = await prisma.venta.aggregate({
      where: {
        turnoId: id,
        estado: 'COMPLETADA'
      },
      _sum: {
        total: true
      },
      _count: {
        id: true
      }
    });

    res.json({
      turno: turnoCerrado,
      estadisticas: {
        totalVentas: Number(estadisticas._sum.total) || 0,
        cantidadVentas: estadisticas._count.id || 0,
        efectivo_inicial: Number(turno.efectivo_inicial),
        efectivo_final: data.efectivo_final,
        efectivo_esperado: efectivoEsperado,
        diferencia: diferencia
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/turnos - Listar turnos (ADMIN ve todos, VENDEDOR solo los suyos)
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { fechaInicio, fechaFin, localId } = req.query;
    const where: any = {};

    // Los vendedores solo ven sus turnos
    if (req.user!.role === 'VENDEDOR') {
      where.vendedorId = req.user!.id;
    }

    if (localId) {
      where.localId = localId as string;
    }

    if (fechaInicio || fechaFin) {
      where.fecha_apertura = {};
      if (fechaInicio) {
        where.fecha_apertura.gte = new Date(fechaInicio as string);
      }
      if (fechaFin) {
        where.fecha_apertura.lte = new Date(fechaFin as string);
      }
    }

    const turnos = await prisma.turno.findMany({
      where,
      include: {
        local: {
          select: {
            id: true,
            nombre: true
          }
        },
        vendedor: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        },
        _count: {
          select: {
            ventas: true
          }
        }
      },
      orderBy: {
        fecha_apertura: 'desc'
      },
      take: 100
    });

    res.json({ turnos });
  } catch (error) {
    next(error);
  }
});

// GET /api/turnos/:id - Obtener turno por ID
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const where: any = { id };

    // Los vendedores solo pueden ver sus turnos
    if (req.user!.role === 'VENDEDOR') {
      where.vendedorId = req.user!.id;
    }

    const turno = await prisma.turno.findUnique({
      where,
      include: {
        local: {
          select: {
            id: true,
            nombre: true,
            direccion: true
          }
        },
        vendedor: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        },
        ventas: {
          include: {
            cliente: {
              select: {
                id: true,
                nombre: true
              }
            },
            detalles: {
              include: {
                producto: {
                  select: {
                    id: true,
                    nombre: true
                  }
                }
              }
            }
          },
          orderBy: {
            fecha: 'desc'
          }
        }
      }
    });

    if (!turno) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    res.json({ turno });
  } catch (error) {
    next(error);
  }
});

export default router;

