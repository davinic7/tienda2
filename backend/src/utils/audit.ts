import { prisma } from '../config/database';

interface AuditLogData {
  userId: string;
  accion: string;
  tabla: string;
  datosAnteriores?: any;
  datosNuevos?: any;
}

export const createAuditLog = async (data: AuditLogData): Promise<void> => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        accion: data.accion,
        tabla: data.tabla,
        datosAnteriores: data.datosAnteriores || null,
        datosNuevos: data.datosNuevos || null,
      },
    });
  } catch (error) {
    console.error('Error creating audit log:', error);
    // No lanzar error para no interrumpir el flujo principal
  }
};

