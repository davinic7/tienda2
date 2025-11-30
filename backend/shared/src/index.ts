// Enums compartidos
export enum Role {
  ADMIN = 'ADMIN',
  VENDEDOR = 'VENDEDOR',
}

export enum EstadoVenta {
  PENDIENTE = 'PENDIENTE',
  COMPLETADA = 'COMPLETADA',
  CANCELADA = 'CANCELADA',
}

// Interfaces compartidas
export interface JWTPayload {
  id: string;
  email: string;
  role: Role;
  localId: string | null;
}

export interface User {
  id: string;
  email: string;
  nombre: string;
  role: Role;
  localId: string | null;
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
  email?: string;
  telefono?: string;
  puntos: number;
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
}

export interface CarritoItem {
  producto: Producto;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

// Eventos Socket.io
export interface PriceUpdatedEvent {
  productoId: string;
  nuevoPrecio: number;
  nombre: string;
  fecha: Date;
}

export interface StockLowEvent {
  producto: Producto;
  local: Local;
  cantidad: number;
  stock_minimo: number;
}

export interface VentaCreatedEvent {
  ventaId: string;
  localId: string;
  total: number;
  fecha: Date;
}

