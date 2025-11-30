export enum Role {
  ADMIN = 'ADMIN',
  VENDEDOR = 'VENDEDOR',
}

export enum EstadoVenta {
  PENDIENTE = 'PENDIENTE',
  COMPLETADA = 'COMPLETADA',
  CANCELADA = 'CANCELADA',
}

export enum EstadoPedido {
  PENDIENTE = 'PENDIENTE',
  AUTORIZADO = 'AUTORIZADO',
  RECHAZADO = 'RECHAZADO',
  PROCESADO = 'PROCESADO',
  CANCELADO = 'CANCELADO',
}

export enum TipoMovimiento {
  ENTRADA_DEPOSITO = 'ENTRADA_DEPOSITO',
  SALIDA_DEPOSITO = 'SALIDA_DEPOSITO',
  TRANSFERENCIA_LOCAL = 'TRANSFERENCIA_LOCAL',
}

export enum MetodoPago {
  EFECTIVO = 'EFECTIVO',
  CREDITO = 'CREDITO',
  MIXTO = 'MIXTO',
  DEBITO = 'DEBITO',
  QR = 'QR',
  TARJETA_CREDITO = 'TARJETA_CREDITO',
  TRANSFERENCIA = 'TRANSFERENCIA',
}

export enum EstadoCaja {
  ABIERTA = 'ABIERTA',
  CERRADA = 'CERRADA',
}

export interface User {
  id: string;
  username: string;
  nombre: string;
  role: Role;
  localId?: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  local?: Local | null;
}

export interface Local {
  id: string;
  nombre: string;
  direccion?: string | null;
  telefono?: string | null;
  porcentajeUtilidadDefault: number;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Producto {
  id: string;
  nombre: string;
  descripcion?: string | null;
  codigo?: string | null;
  codigoBarras?: string | null;
  costo: number;
  iva: number;
  porcentajeUtilidadDefault: number;
  precio?: number | null;
  precioAprobado: boolean;
  categoria?: string | null;
  unidadMedida?: string | null;
  fechaVencimiento?: string | null;
  imagenUrl?: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  stocks?: Stock[];
  preciosLocales?: PrecioLocal[];
  preciosPorCantidad?: PrecioPorCantidad[];
  precioFinal?: number | null;
  precioSugerido?: number | null;
}

export interface Stock {
  id: string;
  productoId: string;
  localId: string;
  cantidad: number;
  stockMinimo: number;
  createdAt: string;
  updatedAt: string;
  producto?: Producto;
  local?: Local;
}

export interface Cliente {
  id: string;
  nombre: string;
  email?: string | null;
  telefono?: string | null;
  puntos: number;
  fechaRegistro: string;
  createdAt: string;
  updatedAt: string;
}

export interface Venta {
  id: string;
  localId: string;
  localOrigenId?: string | null;
  vendedorId: string;
  clienteId?: string | null;
  nombreComprador?: string | null;
  aperturaCajaId?: string | null;
  fecha: string;
  total: number;
  metodoPago: MetodoPago;
  montoEfectivo?: number | null;
  montoOtro?: number | null;
  estado: EstadoVenta;
  esVentaRemota: boolean;
  createdAt: string;
  updatedAt: string;
  local?: Local;
  localOrigen?: Local;
  vendedor?: User;
  cliente?: Cliente;
  detalles?: VentaDetalle[];
  aperturaCaja?: AperturaCaja;
}

export interface VentaDetalle {
  id: string;
  ventaId: string;
  productoId: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  createdAt: string;
  producto?: Producto;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface LoginRequest {
  username: string;
  password: string;
}

// Eventos de Socket.io
export interface PrecioActualizadoEvent {
  productoId: string;
  nuevoPrecio: number;
  nombre: string;
  fecha: string;
}

export interface StockBajoEvent {
  productoId: string;
  nombre: string;
  stockActual: number;
  stockMinimo: number;
  localId: string;
  fecha: string;
}

export interface Deposito {
  id: string;
  nombre: string;
  direccion?: string | null;
  telefono?: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StockDeposito {
  id: string;
  productoId: string;
  depositoId: string;
  cantidad: number;
  stockMinimo: number;
  createdAt: string;
  updatedAt: string;
  producto?: Producto;
  deposito?: Deposito;
}

export interface PedidoAlmacen {
  id: string;
  localId: string;
  solicitanteId: string;
  autorizadorId?: string | null;
  estado: EstadoPedido;
  observaciones?: string | null;
  fechaSolicitud: string;
  fechaAutorizacion?: string | null;
  fechaProcesamiento?: string | null;
  createdAt: string;
  updatedAt: string;
  local?: Local;
  solicitante?: User;
  autorizador?: User;
  detalles?: PedidoAlmacenDetalle[];
}

export interface PedidoAlmacenDetalle {
  id: string;
  pedidoId: string;
  productoId: string;
  cantidad: number;
  cantidadProcesada: number;
  createdAt: string;
  producto?: Producto;
}

export interface MovimientoStock {
  id: string;
  tipo: TipoMovimiento;
  productoId: string;
  depositoId?: string | null;
  localOrigenId?: string | null;
  localDestinoId?: string | null;
  cantidad: number;
  motivo?: string | null;
  usuarioId: string;
  pedidoId?: string | null;
  fecha: string;
  createdAt: string;
  producto?: Producto;
  deposito?: Deposito;
  localOrigen?: Local;
  localDestino?: Local;
  usuario?: User;
}

export interface AperturaCaja {
  id: string;
  vendedorId: string;
  localId: string;
  fechaApertura: string;
  montoInicial: number;
  fechaCierre?: string | null;
  montoFinal?: number | null;
  montoEsperado?: number | null;
  diferencia?: number | null;
  observaciones?: string | null;
  estado: EstadoCaja;
  createdAt: string;
  updatedAt: string;
  vendedor?: User;
  local?: Local;
  ventas?: Venta[];
}

export interface ResumenCaja {
  montoInicial: number;
  montoFinal: number;
  montoEsperado: number;
  diferencia: number;
  totalVentas: number;
  cantidadVentas: number;
  totales: {
    efectivo: number;
    credito: number;
    mixto: number;
    debito: number;
    qr: number;
    tarjetaCredito: number;
    transferencia: number;
    total: number;
  };
}

export enum TipoNotificacion {
  CAMBIO_PRECIO = 'CAMBIO_PRECIO',
  BAJA_ROTACION = 'BAJA_ROTACION',
  VENCIMIENTO = 'VENCIMIENTO',
  VENTA_REMOTA = 'VENTA_REMOTA',
}

export enum EstadoNotificacion {
  PENDIENTE = 'PENDIENTE',
  LEIDA = 'LEIDA',
  ARCHIVADA = 'ARCHIVADA',
}

export interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  localId?: string | null;
  productoId?: string | null;
  ventaId?: string | null;
  estado: EstadoNotificacion;
  leidaEn?: string | null;
  createdAt: string;
  updatedAt: string;
  local?: Local;
}

export interface PrecioPorCantidad {
  id: string;
  productoId: string;
  cantidad: number;
  precio: number;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PrecioLocal {
  id: string;
  productoId: string;
  localId: string;
  porcentajeUtilidad: number;
  precio: number;
  precioAprobado: boolean;
  aprobadoPor?: string | null;
  fechaAprobacion?: string | null;
  createdAt: string;
  updatedAt: string;
  local?: Local;
}

export interface HistorialPrecio {
  id: string;
  productoId: string;
  localId?: string | null;
  precioAnterior?: number | null;
  precioNuevo: number;
  porcentajeUtilidadAnterior?: number | null;
  porcentajeUtilidadNuevo?: number | null;
  motivo?: string | null;
  usuarioId: string;
  fecha: string;
  createdAt: string;
  usuario?: User;
  local?: Local;
}

export interface Combo {
  id: string;
  nombre: string;
  descripcion?: string | null;
  precioPromocional: number;
  imagenUrl?: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  productos?: ComboProducto[];
}

export interface ComboProducto {
  id: string;
  comboId: string;
  productoId: string;
  cantidad: number;
  createdAt: string;
  producto?: Producto;
}

