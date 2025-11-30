import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, filterByLocal } from '../middleware/auth';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

const aperturaSchema = z.object({
  montoInicial: z.number().min(0, 'El monto inicial debe ser mayor o igual a 0'),
  observaciones: z.string().optional(),
});

const cierreSchema = z.object({
  montoFinal: z.number().min(0, 'El monto final debe ser mayor o igual a 0'),
  observaciones: z.string().optional(),
});

// GET /api/caja/estado - Obtener estado actual de la caja (solo VENDEDOR)
router.get('/estado', authenticate, filterByLocal, async (req, res, next) => {
  try {
    const user = req.user!;

    if (user.role !== 'VENDEDOR') {
      return res.status(403).json({ error: 'Solo los vendedores pueden acceder a la caja' });
    }

    if (!user.localId) {
      return res.status(403).json({ error: 'Debes tener un local asignado' });
    }

    // Buscar caja abierta del vendedor
    const cajaAbierta = await prisma.aperturaCaja.findFirst({
      where: {
        vendedorId: user.id,
        localId: user.localId,
        estado: 'ABIERTA',
      },
      include: {
        ventas: {
          where: {
            estado: 'COMPLETADA',
          },
          select: {
            id: true,
            total: true,
            metodoPago: true,
            montoEfectivo: true,
            montoOtro: true,
            fecha: true,
          },
        },
      },
      orderBy: {
        fechaApertura: 'desc',
      },
    });

    if (!cajaAbierta) {
      return res.json({ 
        cajaAbierta: false,
        mensaje: 'No hay caja abierta. Debes abrir una caja para realizar ventas.',
      });
    }

    // Calcular totales por método de pago
    const totales = {
      efectivo: 0,
      credito: 0,
      mixto: 0,
      debito: 0,
      qr: 0,
      tarjetaCredito: 0,
      transferencia: 0,
      total: 0,
    };

    cajaAbierta.ventas.forEach((venta) => {
      const monto = Number(venta.total);
      totales.total += monto;

      switch (venta.metodoPago) {
        case 'EFECTIVO':
          totales.efectivo += monto;
          break;
        case 'CREDITO':
          totales.credito += monto;
          break;
        case 'MIXTO':
          totales.mixto += monto;
          break;
        case 'DEBITO':
          totales.debito += monto;
          break;
        case 'QR':
          totales.qr += monto;
          break;
        case 'TARJETA_CREDITO':
          totales.tarjetaCredito += monto;
          break;
        case 'TRANSFERENCIA':
          totales.transferencia += monto;
          break;
      }
    });

    res.json({
      cajaAbierta: true,
      caja: {
        id: cajaAbierta.id,
        fechaApertura: cajaAbierta.fechaApertura,
        montoInicial: Number(cajaAbierta.montoInicial),
        totalVentas: totales.total,
        cantidadVentas: cajaAbierta.ventas.length,
        totales,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/caja/apertura - Abrir caja (solo VENDEDOR)
router.post('/apertura', authenticate, filterByLocal, async (req, res, next) => {
  try {
    const user = req.user!;

    if (user.role !== 'VENDEDOR') {
      return res.status(403).json({ error: 'Solo los vendedores pueden abrir caja' });
    }

    if (!user.localId) {
      return res.status(403).json({ error: 'Debes tener un local asignado' });
    }

    // Verificar si ya hay una caja abierta
    const cajaExistente = await prisma.aperturaCaja.findFirst({
      where: {
        vendedorId: user.id,
        localId: user.localId,
        estado: 'ABIERTA',
      },
    });

    if (cajaExistente) {
      return res.status(400).json({ 
        error: 'Ya tienes una caja abierta. Debes cerrarla antes de abrir una nueva.',
        cajaId: cajaExistente.id,
      });
    }

    const data = aperturaSchema.parse(req.body);

    const caja = await prisma.aperturaCaja.create({
      data: {
        vendedorId: user.id,
        localId: user.localId,
        montoInicial: data.montoInicial,
        observaciones: data.observaciones,
        estado: 'ABIERTA',
      },
      include: {
        local: true,
        vendedor: {
          select: {
            id: true,
            nombre: true,
            username: true,
          },
        },
      },
    });

    res.status(201).json(caja);
  } catch (error) {
    next(error);
  }
});

// POST /api/caja/cierre/:id - Cerrar caja (solo VENDEDOR)
router.post('/cierre/:id', authenticate, filterByLocal, async (req, res, next) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    if (user.role !== 'VENDEDOR') {
      return res.status(403).json({ error: 'Solo los vendedores pueden cerrar caja' });
    }

    if (!user.localId) {
      return res.status(403).json({ error: 'Debes tener un local asignado' });
    }

    const caja = await prisma.aperturaCaja.findUnique({
      where: { id },
      include: {
        ventas: {
          where: {
            estado: 'COMPLETADA',
          },
        },
      },
    });

    if (!caja) {
      return res.status(404).json({ error: 'Caja no encontrada' });
    }

    if (caja.vendedorId !== user.id) {
      return res.status(403).json({ error: 'Solo puedes cerrar tu propia caja' });
    }

    if (caja.estado === 'CERRADA') {
      return res.status(400).json({ error: 'Esta caja ya está cerrada' });
    }

    const data = cierreSchema.parse(req.body);

    // Calcular totales por método de pago
    const totales = {
      efectivo: 0,
      credito: 0,
      mixto: 0,
      debito: 0,
      qr: 0,
      tarjetaCredito: 0,
      transferencia: 0,
      total: 0,
    };

    caja.ventas.forEach((venta) => {
      const monto = Number(venta.total);
      totales.total += monto;

      switch (venta.metodoPago) {
        case 'EFECTIVO':
          totales.efectivo += monto;
          break;
        case 'CREDITO':
          totales.credito += monto;
          break;
        case 'MIXTO':
          totales.mixto += monto;
          break;
        case 'DEBITO':
          totales.debito += monto;
          break;
        case 'QR':
          totales.qr += monto;
          break;
        case 'TARJETA_CREDITO':
          totales.tarjetaCredito += monto;
          break;
        case 'TRANSFERENCIA':
          totales.transferencia += monto;
          break;
      }
    });

    // Calcular monto esperado (monto inicial + ventas en efectivo)
    const montoEsperado = Number(caja.montoInicial) + totales.efectivo;
    const diferencia = data.montoFinal - montoEsperado;

    const cajaCerrada = await prisma.aperturaCaja.update({
      where: { id },
      data: {
        estado: 'CERRADA',
        fechaCierre: new Date(),
        montoFinal: data.montoFinal,
        montoEsperado,
        diferencia,
        observaciones: data.observaciones || caja.observaciones,
      },
      include: {
        local: true,
        vendedor: {
          select: {
            id: true,
            nombre: true,
            username: true,
          },
        },
        ventas: {
          where: {
            estado: 'COMPLETADA',
          },
          include: {
            cliente: {
              select: {
                id: true,
                nombre: true,
              },
            },
          },
        },
      },
    });

    res.json({
      ...cajaCerrada,
      resumen: {
        montoInicial: Number(cajaCerrada.montoInicial),
        montoFinal: Number(cajaCerrada.montoFinal),
        montoEsperado: Number(cajaCerrada.montoEsperado),
        diferencia: Number(cajaCerrada.diferencia),
        totalVentas: totales.total,
        cantidadVentas: cajaCerrada.ventas.length,
        totales,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/caja/historial - Obtener historial de cajas (solo VENDEDOR)
router.get('/historial', authenticate, filterByLocal, async (req, res, next) => {
  try {
    const user = req.user!;
    const { fechaDesde, fechaHasta } = req.query;

    if (user.role !== 'VENDEDOR') {
      return res.status(403).json({ error: 'Solo los vendedores pueden ver el historial' });
    }

    if (!user.localId) {
      return res.status(403).json({ error: 'Debes tener un local asignado' });
    }

    const where: any = {
      vendedorId: user.id,
      localId: user.localId,
    };

    if (fechaDesde || fechaHasta) {
      where.fechaApertura = {};
      if (fechaDesde) where.fechaApertura.gte = new Date(fechaDesde as string);
      if (fechaHasta) where.fechaApertura.lte = new Date(fechaHasta as string);
    }

    const cajas = await prisma.aperturaCaja.findMany({
      where,
      include: {
        ventas: {
          where: {
            estado: 'COMPLETADA',
          },
        },
      },
      orderBy: {
        fechaApertura: 'desc',
      },
    });

    res.json(cajas);
  } catch (error) {
    next(error);
  }
});

export default router;

