import { Decimal } from '@prisma/client/runtime/library';

/**
 * Calcula el precio sugerido de un producto basado en:
 * Precio = (Costo + IVA) * (1 + %Utilidad/100)
 * 
 * @param costo - Costo del producto
 * @param iva - Porcentaje de IVA (ej: 21 para 21%)
 * @param porcentajeUtilidad - Porcentaje de utilidad (ej: 30 para 30%)
 * @returns Precio calculado redondeado a 2 decimales
 */
export function calcularPrecioSugerido(
  costo: number | Decimal,
  iva: number | Decimal = 21,
  porcentajeUtilidad: number | Decimal = 30
): number {
  const costoNum = typeof costo === 'number' ? costo : Number(costo);
  const ivaNum = typeof iva === 'number' ? iva : Number(iva);
  const utilidadNum = typeof porcentajeUtilidad === 'number' ? porcentajeUtilidad : Number(porcentajeUtilidad);

  // Calcular costo con IVA
  const costoConIva = costoNum * (1 + ivaNum / 100);
  
  // Aplicar porcentaje de utilidad
  const precio = costoConIva * (1 + utilidadNum / 100);
  
  // Redondear a 2 decimales
  return Math.round(precio * 100) / 100;
}

/**
 * Calcula el precio para una cantidad específica
 * Si existe un precio por cantidad, lo usa; sino calcula basado en precio unitario
 */
export function calcularPrecioPorCantidad(
  precioUnitario: number | Decimal,
  cantidad: number,
  preciosPorCantidad?: Array<{ cantidad: number; precio: number | Decimal }>
): number {
  const precioUnitarioNum = typeof precioUnitario === 'number' ? precioUnitario : Number(precioUnitario);

  // Buscar precio específico para esta cantidad
  if (preciosPorCantidad && preciosPorCantidad.length > 0) {
    // Ordenar por cantidad descendente para encontrar el precio más cercano
    const preciosOrdenados = [...preciosPorCantidad]
      .filter(p => p.cantidad <= cantidad)
      .sort((a, b) => b.cantidad - a.cantidad);

    if (preciosOrdenados.length > 0) {
      const precioEspecifico = preciosOrdenados[0];
      const precioNum = typeof precioEspecifico.precio === 'number' 
        ? precioEspecifico.precio 
        : Number(precioEspecifico.precio);
      return precioNum;
    }
  }

  // Si no hay precio específico, calcular basado en precio unitario
  return precioUnitarioNum * cantidad;
}

