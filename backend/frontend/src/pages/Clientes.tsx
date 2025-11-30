import { useState, useEffect } from 'react';
import { api, isDatabaseError } from '../utils/api';
import { Cliente } from '../types';
import { Plus, Edit2, Trash2, Users, History, X, Clock, UserCheck, Filter, Calendar, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import ConfirmDialog from '../components/ConfirmDialog';

const clienteSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  dni: z.string().optional().or(z.literal('')),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefono: z.string().optional(),
  credito: z.number().min(0, 'El crédito no puede ser negativo').optional(),
});

type ClienteForm = z.infer<typeof clienteSchema>;

const Clientes = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [clienteHistorial, setClienteHistorial] = useState<Cliente | null>(null);
  const [historialVentas, setHistorialVentas] = useState<any[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [mostrarHistorialAuditoria, setMostrarHistorialAuditoria] = useState(false);
  const [historialActividades, setHistorialActividades] = useState<any[]>([]);
  const [loadingHistorialAuditoria, setLoadingHistorialAuditoria] = useState(false);
  const [fechaInicioHistorial, setFechaInicioHistorial] = useState('');
  const [fechaFinHistorial, setFechaFinHistorial] = useState('');
  const [mostrarConfirmacionEliminar, setMostrarConfirmacionEliminar] = useState(false);
  const [clienteAEliminar, setClienteAEliminar] = useState<Cliente | null>(null);
  const [loadingEliminar, setLoadingEliminar] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClienteForm>({
    resolver: zodResolver(clienteSchema),
  });

  useEffect(() => {
    cargarClientes();
  }, []);

  useEffect(() => {
    if (clienteEditando) {
      reset({
        nombre: clienteEditando.nombre,
        dni: clienteEditando.dni || '',
        email: clienteEditando.email || '',
        telefono: clienteEditando.telefono || '',
        credito: clienteEditando.credito || 0,
      });
      setMostrarFormulario(true);
    }
  }, [clienteEditando, reset]);

  const cargarClientes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/clientes');
      // Normalizar los datos: convertir credito de string (Prisma Decimal) a number
      const clientesNormalizados = (response.data.clientes || []).map((cliente: any) => ({
        ...cliente,
        credito: typeof cliente.credito === 'string' ? Number(cliente.credito) : cliente.credito || 0,
      }));
      setClientes(clientesNormalizados);
    } catch (error: any) {
      console.error('Error al cargar clientes:', error);
      // Si es un error de base de datos, mostrar mensaje informativo pero no crítico
      if (isDatabaseError(error)) {
        // Si es error de conexión (503), mostrar mensaje más claro
        if (error.response?.status === 503) {
          toast.error('No se puede conectar a la base de datos. Verifica que MySQL esté corriendo.', {
            duration: 5000,
          });
        }
        // Para otros errores de DB, solo loguear en consola
      } else {
        // Para errores no de DB, mostrar toast normal
        toast.error(error.response?.data?.error || 'Error al cargar clientes');
      }
      // Asegurar que el array esté vacío en caso de error
      setClientes([]);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: ClienteForm) => {
    try {
      if (clienteEditando) {
        await api.put(`/clientes/${clienteEditando.id}`, data);
        toast.success('Cliente actualizado exitosamente');
      } else {
        await api.post('/clientes', data);
        toast.success('Cliente creado exitosamente');
      }
      cargarClientes();
      reset();
      setMostrarFormulario(false);
      setClienteEditando(null);
    } catch (error: any) {
      if (!isDatabaseError(error)) {
        toast.error(error.response?.data?.error || 'Error al guardar cliente');
      }
    }
  };

  const eliminarCliente = (cliente: Cliente) => {
    setClienteAEliminar(cliente);
    setMostrarConfirmacionEliminar(true);
  };

  const ejecutarEliminacion = async () => {
    if (!clienteAEliminar) return;

    setLoadingEliminar(true);
    try {
      await api.delete(`/clientes/${clienteAEliminar.id}`);
      toast.success('Cliente eliminado exitosamente');
      cargarClientes();
      setMostrarConfirmacionEliminar(false);
      setClienteAEliminar(null);
    } catch (error: any) {
      if (!isDatabaseError(error)) {
        toast.error(error.response?.data?.error || 'Error al eliminar cliente');
      }
    } finally {
      setLoadingEliminar(false);
    }
  };

  const verHistorial = async (cliente: Cliente) => {
    setClienteHistorial(cliente);
    setMostrarHistorial(true);
    setLoadingHistorial(true);
    
    try {
      // Obtener todas las ventas del cliente
      const ventasResponse = await api.get(`/ventas?clienteId=${cliente.id}`);
      setHistorialVentas(ventasResponse.data.ventas || []);
    } catch (error: any) {
      if (!isDatabaseError(error)) {
        toast.error('Error al cargar historial del cliente');
      }
      console.error(error);
    } finally {
      setLoadingHistorial(false);
    }
  };

  const cargarHistorialAuditoria = async (fechaInicio?: string, fechaFin?: string) => {
    try {
      setLoadingHistorialAuditoria(true);
      const params = new URLSearchParams();
      params.append('tabla', 'CLIENTES');
      if (fechaInicio) params.append('fechaInicio', fechaInicio);
      if (fechaFin) params.append('fechaFin', fechaFin);
      
      const response = await api.get(`/actividades?${params.toString()}`);
      setHistorialActividades(response.data.actividades || []);
    } catch (error: any) {
      if (!isDatabaseError(error)) {
        toast.error('Error al cargar historial');
      }
      console.error(error);
    } finally {
      setLoadingHistorialAuditoria(false);
    }
  };

  const abrirHistorialAuditoria = () => {
    setMostrarHistorialAuditoria(true);
    cargarHistorialAuditoria();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-600">Gestiona los clientes del sistema</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={abrirHistorialAuditoria}
            className="btn btn-secondary flex items-center gap-2"
          >
            <History className="h-5 w-5" />
            Ver Historial
          </button>
          <button
            onClick={() => {
              setClienteEditando(null);
              reset();
              setMostrarFormulario(true);
            }}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Nuevo Cliente
          </button>
        </div>
      </div>

      {mostrarFormulario && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">
            {clienteEditando ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Nombre y Apellido *</label>
              <input {...register('nombre')} className="input" placeholder="Juan Pérez" />
              {errors.nombre && (
                <p className="mt-1 text-sm text-red-600">{errors.nombre.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">DNI</label>
                <input {...register('dni')} className="input" placeholder="12345678" />
              </div>

              <div>
                <label className="label">Teléfono</label>
                <input {...register('telefono')} className="input" placeholder="1234567890" />
              </div>
            </div>

            <div>
              <label className="label">Email</label>
              <input {...register('email')} type="email" className="input" placeholder="email@ejemplo.com" />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="label">Crédito</label>
              <input
                {...register('credito', { valueAsNumber: true })}
                type="number"
                step="0.01"
                min="0"
                className="input"
                placeholder="0.00"
              />
              {errors.credito && (
                <p className="mt-1 text-sm text-red-600">{errors.credito.message}</p>
              )}
            </div>

            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">
                {clienteEditando ? 'Actualizar' : 'Crear'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMostrarFormulario(false);
                  setClienteEditando(null);
                  reset();
                }}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3">Nombre</th>
                <th className="text-left p-3">DNI</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Teléfono</th>
                <th className="text-left p-3">Crédito</th>
                <th className="text-left p-3">Puntos</th>
                <th className="text-left p-3">Fecha Registro</th>
                <th className="text-right p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center p-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>No hay clientes registrados</p>
                  </td>
                </tr>
              ) : (
                clientes.map((cliente) => (
                  <tr key={cliente.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-semibold">{cliente.nombre}</td>
                    <td className="p-3">
                      {cliente.dni ? (
                        <span className="font-mono text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded">
                          {cliente.dni}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="p-3">{cliente.email || '-'}</td>
                    <td className="p-3">{cliente.telefono || '-'}</td>
                    <td className="p-3 font-semibold text-blue-600">
                      ${Number(cliente.credito || 0).toFixed(2)}
                    </td>
                    <td className="p-3">{cliente.puntos}</td>
                    <td className="p-3">
                      {new Date(cliente.fecha_registro).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => verHistorial(cliente)}
                          className="btn-icon text-green-600 hover:text-green-700"
                          title="Ver historial"
                        >
                          <History className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setClienteEditando(cliente)}
                          className="btn-icon text-blue-600 hover:text-blue-700"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => eliminarCliente(cliente)}
                          className="btn-icon text-red-600 hover:text-red-700"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Historial */}
      {mostrarHistorial && clienteHistorial && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => setMostrarHistorial(false)}
            />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      Historial de {clienteHistorial.nombre}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {clienteHistorial.email && `${clienteHistorial.email} • `}
                      {clienteHistorial.telefono || 'Sin teléfono'}
                    </p>
                  </div>
                  <button
                    onClick={() => setMostrarHistorial(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Información del Cliente */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Crédito Disponible</p>
                    <p className="text-2xl font-bold text-blue-600">
                      ${Number(clienteHistorial.credito || 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total de Ventas</p>
                    <p className="text-2xl font-bold text-green-600">
                      {historialVentas.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Gastado</p>
                    <p className="text-2xl font-bold text-purple-600">
                      ${historialVentas.reduce((sum, v) => sum + Number(v.total || 0), 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Lista de Ventas */}
                {loadingHistorial ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  </div>
                ) : historialVentas.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p className="text-gray-500">Este cliente no tiene ventas registradas</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {historialVentas.map((venta) => (
                      <div
                        key={venta.id}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-900">
                              Venta #{venta.numero_venta || venta.id.slice(0, 8)}
                            </p>
                            <p className="text-sm text-gray-600">
                              {new Date(venta.fecha).toLocaleString('es-ES', {
                                dateStyle: 'long',
                                timeStyle: 'short'
                              })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-green-600">
                              ${Number(venta.total).toFixed(2)}
                            </p>
                            <span className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${
                              venta.metodoPago === 'EFECTIVO' ? 'bg-green-100 text-green-700' :
                              venta.metodoPago === 'CREDITO' ? 'bg-blue-100 text-blue-700' :
                              'bg-purple-100 text-purple-700'
                            }`}>
                              {venta.metodoPago || 'EFECTIVO'}
                            </span>
                          </div>
                        </div>

                        {/* Detalles de la venta */}
                        {venta.detalles && venta.detalles.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-xs font-semibold text-gray-600 mb-2">Productos:</p>
                            <div className="space-y-1">
                              {venta.detalles.map((detalle: any, idx: number) => (
                                <div key={idx} className="flex justify-between text-sm">
                                  <span className="text-gray-700">
                                    {detalle.cantidad}x {detalle.producto?.nombre || 'Producto eliminado'}
                                  </span>
                                  <span className="text-gray-600">
                                    ${Number(detalle.subtotal || 0).toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Información adicional */}
                        <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-4 text-xs text-gray-500">
                          {venta.local?.nombre && (
                            <span>📍 {venta.local.nombre}</span>
                          )}
                          {venta.vendedor?.nombre && (
                            <span>👤 {venta.vendedor.nombre}</span>
                          )}
                          {venta.creditoUsado && Number(venta.creditoUsado) > 0 && (
                            <span className="text-blue-600">
                              💳 Crédito usado: ${Number(venta.creditoUsado).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setMostrarHistorial(false)}
                  className="btn btn-primary w-full sm:w-auto sm:ml-3"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Historial de Auditoría */}
      {mostrarHistorialAuditoria && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <History className="h-6 w-6 text-primary-600" />
                <h2 className="text-2xl font-bold text-gray-900">Historial de Clientes</h2>
              </div>
              <button
                onClick={() => {
                  setMostrarHistorialAuditoria(false);
                  setHistorialActividades([]);
                  setFechaInicioHistorial('');
                  setFechaFinHistorial('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Filtros */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="h-5 w-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">Filtros</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Fecha Inicio
                  </label>
                  <input
                    type="date"
                    value={fechaInicioHistorial}
                    onChange={(e) => {
                      setFechaInicioHistorial(e.target.value);
                      cargarHistorialAuditoria(e.target.value, fechaFinHistorial);
                    }}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Fecha Fin
                  </label>
                  <input
                    type="date"
                    value={fechaFinHistorial}
                    onChange={(e) => {
                      setFechaFinHistorial(e.target.value);
                      cargarHistorialAuditoria(fechaInicioHistorial, e.target.value);
                    }}
                    className="input"
                  />
                </div>
              </div>
            </div>

            {/* Lista de actividades */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loadingHistorialAuditoria ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
              ) : historialActividades.length === 0 ? (
                <div className="text-center py-16">
                  <History className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No hay actividades registradas</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {historialActividades.map((actividad) => (
                    <div
                      key={actividad.id}
                      className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${
                            actividad.accion === 'CREAR' ? 'bg-green-100 text-green-700' :
                            actividad.accion === 'ACTUALIZAR' ? 'bg-blue-100 text-blue-700' :
                            actividad.accion === 'ELIMINAR' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            <Users className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold text-gray-900">
                                {actividad.datos_nuevos?.nombre || actividad.datos_anteriores?.nombre || 'Cliente'}
                              </span>
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                actividad.accion === 'CREAR' ? 'bg-green-100 text-green-800' :
                                actividad.accion === 'ACTUALIZAR' ? 'bg-blue-100 text-blue-800' :
                                actividad.accion === 'ELIMINAR' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {actividad.accion}
                              </span>
                            </div>
                            
                            {/* Detalles de cambios */}
                            {actividad.accion === 'ACTUALIZAR' && actividad.datos_anteriores && actividad.datos_nuevos && (
                              <div className="mt-2 space-y-1 text-sm">
                                {actividad.datos_anteriores.nombre !== actividad.datos_nuevos.nombre && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-600">Nombre:</span>
                                    <span className="text-gray-400">{actividad.datos_anteriores.nombre}</span>
                                    <span className="text-gray-400">→</span>
                                    <span className="font-semibold text-gray-900">{actividad.datos_nuevos.nombre}</span>
                                  </div>
                                )}
                                {actividad.datos_anteriores.credito !== actividad.datos_nuevos.credito && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-600">Crédito:</span>
                                    <span className="text-gray-400">${Number(actividad.datos_anteriores.credito || 0).toFixed(2)}</span>
                                    <span className="text-gray-400">→</span>
                                    <span className="font-semibold text-gray-900">${Number(actividad.datos_nuevos.credito || 0).toFixed(2)}</span>
                                  </div>
                                )}
                                {actividad.datos_anteriores.email !== actividad.datos_nuevos.email && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-600">Email:</span>
                                    <span className="text-gray-400">{actividad.datos_anteriores.email || '-'}</span>
                                    <span className="text-gray-400">→</span>
                                    <span className="font-semibold text-gray-900">{actividad.datos_nuevos.email || '-'}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Metadata */}
                            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{format(new Date(actividad.fecha), 'dd/MM/yyyy HH:mm:ss', { locale: es })}</span>
                              </div>
                              {actividad.user.local && (
                                <div className="flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  <span>{actividad.user.local.nombre}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <UserCheck className="h-3 w-3" />
                                <span>{actividad.user.nombre}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setMostrarHistorialAuditoria(false);
                  setHistorialActividades([]);
                  setFechaInicioHistorial('');
                  setFechaFinHistorial('');
                }}
                className="btn btn-primary w-full sm:w-auto"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo de confirmación para eliminar cliente */}
      {clienteAEliminar && (
        <ConfirmDialog
          isOpen={mostrarConfirmacionEliminar}
          onClose={() => {
            setMostrarConfirmacionEliminar(false);
            setClienteAEliminar(null);
          }}
          onConfirm={ejecutarEliminacion}
          title="Eliminar Cliente"
          message={`¿Estás seguro de que deseas eliminar al cliente "${clienteAEliminar.nombre}"?\n\n` +
            `Esta acción no se puede deshacer y eliminará permanentemente el cliente del sistema.`}
          confirmText="Sí, eliminar"
          cancelText="Cancelar"
          variant="danger"
          isLoading={loadingEliminar}
        />
      )}
    </div>
  );
};

export default Clientes;

