export enum Role {
  ADMIN = 'ADMIN',
  VENDEDOR = 'VENDEDOR',
}

export enum EstadoVenta {
  PENDIENTE = 'PENDIENTE',
  COMPLETADA = 'COMPLETADA',
  CANCELADA = 'CANCELADA',
}

export enum MetodoPago {
  EFECTIVO = 'EFECTIVO',
  CREDITO = 'CREDITO',
  MIXTO = 'MIXTO',
}

export interface User {
  id: string;
  email: string;
  nombre: string;
  role: Role;
  localId: string | null;
  activo?: boolean;
  local?: {
    id: string;
    nombre: string;
    direccion?: string;
    telefono?: string;
  };
}

export interface Local {
  id: string;
  nombre: string;
  direccion?: string;
  telefono?: string;
  activo: boolean;
  turnosActivos?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Producto {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  categoria?: string;
  codigo_barras?: string;
  imagen_url?: string;
  activo: boolean;
  stocks?: (Stock & { local?: Local })[];
  createdAt: string;
  updatedAt: string;
}

export interface Stock {
  id: string;
  productoId: string;
  localId: string;
  cantidad: number;
  stock_minimo: number;
  producto?: Producto;
  local?: Local;
  createdAt: string;
  updatedAt: string;
}

export interface Cliente {
  id: string;
  nombre: string;
  dni?: string;
  email?: string;
  telefono?: string;
  puntos: number;
  credito: number;
  fecha_registro: string;
  createdAt: string;
  updatedAt: string;
}

export interface VentaDetalle {
  id: string;
  ventaId: string;
  productoId: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  producto?: Producto;
}

export interface Venta {
  id: string;
  localId: string;
  vendedorId: string;
  clienteId?: string;
  fecha: string;
  total: number;
  estado: EstadoVenta;
  metodoPago?: MetodoPago;
  creditoUsado?: number;
  efectivoRecibido?: number;
  local?: Local;
  vendedor?: User;
  cliente?: Cliente;
  detalles?: VentaDetalle[];
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  localesDisponibles?: Local[];
}

export enum EstadoTurno {
  ABIERTO = 'ABIERTO',
  CERRADO = 'CERRADO',
}

export interface Turno {
  id: string;
  vendedorId: string;
  localId: string;
  fecha_apertura: string;
  fecha_cierre?: string;
  efectivo_inicial: number;
  efectivo_final?: number;
  efectivo_esperado?: number;
  diferencia?: number;
  estado: EstadoTurno;
  observaciones?: string;
  local?: Local;
  vendedor?: User;
  totalVentas?: number;
  cantidadVentas?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CarritoItem {
  producto: Producto;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface Actividad {
  id: string;
  userId: string;
  accion: string;
  tabla: string;
  fecha: string;
  datos_anteriores?: any;
  datos_nuevos?: any;
  user: {
    id: string;
    nombre: string;
    email: string;
    role: Role;
    local?: {
      id: string;
      nombre: string;
    };
  };
}

