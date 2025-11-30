import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Layout from '@/components/Layout';
import type { PedidoAlmacen, Local, Producto, EstadoPedido } from '@shared/types';
import {
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Truck,
  ShoppingCart,
  AlertCircle,
} from 'lucide-react';

interface PedidoCompleto extends PedidoAlmacen {
  local?: Local;
  solicitante?: any;
  autorizador?: any;
  detalles?: Array<{
    id: string;
    pedidoId: string;
    productoId: string;
    cantidad: number;
    cantidadProcesada: number;
    createdAt: string;
    updatedAt?: string;
    producto?: Producto;
  }>;
}

export default function PedidosAlmacen() {
  const { user } = useAuthStore();
  const [pedidos, setPedidos] = useState<PedidoCompleto[]>([]);
  const [locales, setLocales] = useState<Local[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<EstadoPedido | ''>('');
  const [mostrarModal, setMostrarModal] = useState(false);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<PedidoCompleto | null>(null);
  const [formData, setFormData] = useState({
    localId: user?.localId || '',
    observaciones: '',
    detalles: [] as Array<{ productoId: string; cantidad: number }>,
  });

  useEffect(() => {
    cargarPedidos();
    if (user?.role === 'ADMIN') {
      cargarLocales();
    }
    cargarProductos();
  }, [user, filtroEstado]);

  const cargarPedidos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtroEstado) params.append('estado', filtroEstado);

      const response = await api.get<PedidoCompleto[]>(`/pedidos-almacen?${params.toString()}`);
      setPedidos(response.data);
    } catch (error: any) {
      toast.error('Error al cargar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const cargarLocales = async () => {
    try {
      const response = await api.get<Local[]>('/locales?activo=true');
      setLocales(response.data);
    } catch (error: any) {
      toast.error('Error al cargar locales');
    }
  };

  const cargarProductos = async () => {
    try {
      const response = await api.get<Producto[]>('/productos?activo=true');
      setProductos(response.data);
    } catch (error: any) {
      toast.error('Error al cargar productos');
    }
  };

  const abrirModalCrear = () => {
    setFormData({
      localId: user?.localId || '',
      observaciones: '',
      detalles: [],
    });
    setMostrarModal(true);
  };

  const agregarDetalle = () => {
    setFormData({
      ...formData,
      detalles: [...formData.detalles, { productoId: '', cantidad: 1 }],
    });
  };

  const actualizarDetalle = (index: number, campo: string, valor: any) => {
    const nuevosDetalles = [...formData.detalles];
    nuevosDetalles[index] = { ...nuevosDetalles[index], [campo]: valor };
    setFormData({ ...formData, detalles: nuevosDetalles });
  };

  const eliminarDetalle = (index: number) => {
    setFormData({
      ...formData,
      detalles: formData.detalles.filter((_, i) => i !== index),
    });
  };

  const crearPedido = async () => {
    try {
      if (!formData.localId) {
        toast.error('Debes seleccionar un local');
        return;
      }

      if (formData.detalles.length === 0) {
        toast.error('Debes agregar al menos un producto');
        return;
      }

      if (formData.detalles.some((d) => !d.productoId || d.cantidad <= 0)) {
        toast.error('Todos los productos deben tener cantidad mayor a 0');
        return;
      }

      await api.post('/pedidos-almacen', formData);
      toast.success('Pedido creado exitosamente');
      setMostrarModal(false);
      cargarPedidos();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al crear pedido');
    }
  };

  const autorizarPedido = async (id: string) => {
    try {
      await api.put(`/pedidos-almacen/${id}/autorizar`, {});
      toast.success('Pedido autorizado');
      cargarPedidos();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al autorizar pedido');
    }
  };

  const rechazarPedido = async (id: string) => {
    const motivo = prompt('Motivo del rechazo (opcional):');
    try {
      await api.put(`/pedidos-almacen/${id}/rechazar`, { motivo });
      toast.success('Pedido rechazado');
      cargarPedidos();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al rechazar pedido');
    }
  };

  const procesarPedido = async (id: string) => {
    if (!confirm('¿Estás seguro de procesar este pedido? Se transferirá el stock del depósito al local.')) {
      return;
    }

    try {
      await api.put(`/pedidos-almacen/${id}/procesar`, {});
      toast.success('Pedido procesado exitosamente');
      cargarPedidos();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al procesar pedido');
    }
  };

  const verDetalle = (pedido: PedidoCompleto) => {
    setPedidoSeleccionado(pedido);
  };

  const getEstadoIcon = (estado: EstadoPedido) => {
    switch (estado) {
      case 'PENDIENTE':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'AUTORIZADO':
        return <CheckCircle className="w-5 h-5 text-blue-600" />;
      case 'PROCESADO':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'RECHAZADO':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'CANCELADO':
        return <XCircle className="w-5 h-5 text-gray-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getEstadoColor = (estado: EstadoPedido) => {
    switch (estado) {
      case 'PENDIENTE':
        return 'bg-yellow-100 text-yellow-800';
      case 'AUTORIZADO':
        return 'bg-blue-100 text-blue-800';
      case 'PROCESADO':
        return 'bg-green-100 text-green-800';
      case 'RECHAZADO':
        return 'bg-red-100 text-red-800';
      case 'CANCELADO':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Layout>
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pedidos al Almacén</h1>
            <p className="mt-2 text-sm text-gray-600">
              {user?.role === 'ADMIN'
                ? 'Gestiona los pedidos de stock desde los locales al depósito'
                : 'Solicita productos desde el depósito para tu local'}
            </p>
          </div>
          <button
            onClick={abrirModalCrear}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Pedido
          </button>
        </div>

        {/* Filtros */}
        <div className="mb-6 flex gap-4">
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value as EstadoPedido | '')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
          >
            <option value="">Todos los estados</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="AUTORIZADO">Autorizado</option>
            <option value="PROCESADO">Procesado</option>
            <option value="RECHAZADO">Rechazado</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando pedidos...</p>
          </div>
        ) : pedidos.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay pedidos</h3>
            <p className="text-gray-600 mb-4">Crea tu primer pedido al almacén</p>
            <button
              onClick={abrirModalCrear}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              Crear Pedido
            </button>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Local
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Solicitante
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Productos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pedidos.map((pedido) => (
                  <tr key={pedido.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      #{pedido.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {pedido.local?.nombre || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {pedido.solicitante?.nombre || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {pedido.detalles?.length || 0} producto{pedido.detalles?.length !== 1 ? 's' : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(pedido.fechaSolicitud).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${getEstadoColor(
                          pedido.estado
                        )}`}
                      >
                        {getEstadoIcon(pedido.estado)}
                        <span className="ml-1">{pedido.estado}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => verDetalle(pedido)}
                          className="text-green-600 hover:text-green-900"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        {user?.role === 'ADMIN' && pedido.estado === 'PENDIENTE' && (
                          <>
                            <button
                              onClick={() => autorizarPedido(pedido.id)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Autorizar"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => rechazarPedido(pedido.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Rechazar"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </>
                        )}
                        {user?.role === 'ADMIN' && pedido.estado === 'AUTORIZADO' && (
                          <button
                            onClick={() => procesarPedido(pedido.id)}
                            className="text-green-600 hover:text-green-900"
                            title="Procesar"
                          >
                            <Truck className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal Crear Pedido */}
        {mostrarModal && (
          <ModalCrearPedido
            formData={formData}
            setFormData={setFormData}
            locales={locales}
            productos={productos}
            user={user}
            onClose={() => setMostrarModal(false)}
            onSave={crearPedido}
            agregarDetalle={agregarDetalle}
            actualizarDetalle={actualizarDetalle}
            eliminarDetalle={eliminarDetalle}
          />
        )}

        {/* Modal Ver Detalle */}
        {pedidoSeleccionado && (
          <ModalDetallePedido
            pedido={pedidoSeleccionado}
            onClose={() => setPedidoSeleccionado(null)}
          />
        )}
      </div>
    </Layout>
  );
}

function ModalCrearPedido({
  formData,
  setFormData,
  locales,
  productos,
  user,
  onClose,
  onSave,
  agregarDetalle,
  actualizarDetalle,
  eliminarDetalle,
}: any) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Nuevo Pedido al Almacén</h2>

        <div className="space-y-4">
          {user?.role === 'ADMIN' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Local *
              </label>
              <select
                value={formData.localId}
                onChange={(e) => setFormData({ ...formData, localId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="">Seleccionar local</option>
                {locales.map((local: Local) => (
                  <option key={local.id} value={local.id}>
                    {local.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observaciones
            </label>
            <textarea
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              rows={3}
              placeholder="Notas adicionales sobre el pedido..."
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Productos *
              </label>
              <button
                onClick={agregarDetalle}
                className="text-sm text-green-600 hover:text-green-800 flex items-center"
              >
                <Plus className="w-4 h-4 mr-1" />
                Agregar
              </button>
            </div>

            <div className="space-y-2">
              {formData.detalles.map((detalle: any, index: number) => (
                <div key={index} className="flex gap-2 items-start">
                  <select
                    value={detalle.productoId}
                    onChange={(e) => actualizarDetalle(index, 'productoId', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Seleccionar producto</option>
                    {productos.map((producto: Producto) => (
                      <option key={producto.id} value={producto.id}>
                        {producto.nombre}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={detalle.cantidad}
                    onChange={(e) => actualizarDetalle(index, 'cantidad', parseInt(e.target.value) || 1)}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    min="1"
                    placeholder="Cant."
                  />
                  <button
                    onClick={() => eliminarDetalle(index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Crear Pedido
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalDetallePedido({ pedido, onClose }: { pedido: PedidoCompleto; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Detalle del Pedido</h2>

        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">ID</p>
              <p className="font-semibold">#{pedido.id.slice(0, 8)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Estado</p>
              <p className="font-semibold">{pedido.estado}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Local</p>
              <p className="font-semibold">{pedido.local?.nombre || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Solicitante</p>
              <p className="font-semibold">{pedido.solicitante?.nombre || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Fecha Solicitud</p>
              <p className="font-semibold">
                {new Date(pedido.fechaSolicitud).toLocaleString()}
              </p>
            </div>
            {pedido.fechaAutorizacion && (
              <div>
                <p className="text-sm text-gray-500">Fecha Autorización</p>
                <p className="font-semibold">
                  {new Date(pedido.fechaAutorizacion).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {pedido.observaciones && (
            <div>
              <p className="text-sm text-gray-500">Observaciones</p>
              <p className="font-semibold">{pedido.observaciones}</p>
            </div>
          )}
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">Productos</h3>
          <div className="space-y-2">
            {pedido.detalles?.map((detalle) => (
              <div
                key={detalle.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium">{detalle.producto?.nombre || 'Producto desconocido'}</p>
                  <p className="text-sm text-gray-500">
                    Cantidad: {detalle.cantidad}
                    {detalle.cantidadProcesada > 0 && (
                      <span className="ml-2 text-green-600">
                        (Procesado: {detalle.cantidadProcesada})
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

