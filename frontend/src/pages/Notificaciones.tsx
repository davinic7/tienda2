import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Layout from '@/components/Layout';
import type { Notificacion, TipoNotificacion, EstadoNotificacion } from '@shared/types';
import { Bell, CheckCircle, Calendar, Package, DollarSign, ShoppingCart, Archive } from 'lucide-react';

const tipoIconos = {
  CAMBIO_PRECIO: DollarSign,
  BAJA_ROTACION: Package,
  VENCIMIENTO: Calendar,
  VENTA_REMOTA: ShoppingCart,
};

const tipoColores = {
  CAMBIO_PRECIO: 'bg-blue-100 text-blue-800',
  BAJA_ROTACION: 'bg-yellow-100 text-yellow-800',
  VENCIMIENTO: 'bg-red-100 text-red-800',
  VENTA_REMOTA: 'bg-purple-100 text-purple-800',
};

export default function Notificaciones() {
  // const { user } = useAuthStore();
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<EstadoNotificacion | ''>('');
  const [filtroTipo, setFiltroTipo] = useState<TipoNotificacion | ''>('');

  useEffect(() => {
    cargarNotificaciones();
    // Recargar cada 30 segundos
    const interval = setInterval(cargarNotificaciones, 30000);
    return () => clearInterval(interval);
  }, [filtroEstado, filtroTipo]);

  const cargarNotificaciones = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtroEstado) params.append('estado', filtroEstado);
      if (filtroTipo) params.append('tipo', filtroTipo);
      
      const response = await api.get<Notificacion[]>(`/notificaciones?${params.toString()}`);
      setNotificaciones(response.data);
    } catch (error: any) {
      toast.error('Error al cargar notificaciones');
    } finally {
      setLoading(false);
    }
  };

  const marcarLeida = async (id: string) => {
    try {
      await api.put(`/notificaciones/${id}/marcar-leida`);
      toast.success('Notificación marcada como leída');
      cargarNotificaciones();
    } catch (error: any) {
      toast.error('Error al marcar notificación');
    }
  };

  const archivar = async (id: string) => {
    try {
      await api.put(`/notificaciones/${id}/archivar`);
      toast.success('Notificación archivada');
      cargarNotificaciones();
    } catch (error: any) {
      toast.error('Error al archivar notificación');
    }
  };

  const pendientes = notificaciones.filter((n) => n.estado === 'PENDIENTE').length;

  return (
    <Layout>
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notificaciones</h1>
            <p className="text-gray-600 mt-1">
              {pendientes > 0 && (
                <span className="text-red-600 font-semibold">{pendientes} pendiente(s)</span>
              )}
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative sm:w-48">
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as EstadoNotificacion | '')}
              className="w-full pl-4 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="">Todos los estados</option>
              <option value="PENDIENTE">Pendientes</option>
              <option value="LEIDA">Leídas</option>
              <option value="ARCHIVADA">Archivadas</option>
            </select>
          </div>
          <div className="relative sm:w-48">
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as TipoNotificacion | '')}
              className="w-full pl-4 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="">Todos los tipos</option>
              <option value="CAMBIO_PRECIO">Cambio de Precio</option>
              <option value="BAJA_ROTACION">Baja Rotación</option>
              <option value="VENCIMIENTO">Vencimiento</option>
              <option value="VENTA_REMOTA">Venta Remota</option>
            </select>
          </div>
        </div>

        {/* Lista de notificaciones */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : notificaciones.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Bell className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No hay notificaciones</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notificaciones.map((notificacion) => {
              const Icono = tipoIconos[notificacion.tipo as keyof typeof tipoIconos] || Bell;
              const colorClase = tipoColores[notificacion.tipo as keyof typeof tipoColores] || 'bg-gray-100 text-gray-800';
              const fecha = new Date(notificacion.createdAt).toLocaleString('es-ES');

              return (
                <div
                  key={notificacion.id}
                  className={`bg-white rounded-lg border-2 p-4 ${
                    notificacion.estado === 'PENDIENTE'
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Icono className={`w-5 h-5 ${notificacion.estado === 'PENDIENTE' ? 'text-blue-600' : 'text-gray-400'}`} />
                        <h3 className="font-semibold text-gray-900">{notificacion.titulo}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${colorClase}`}>
                          {notificacion.tipo.replace('_', ' ')}
                        </span>
                        {notificacion.estado === 'PENDIENTE' && (
                          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
                            Nuevo
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{notificacion.mensaje}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{fecha}</span>
                        {notificacion.local && (
                          <span>Local: {notificacion.local.nombre}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {notificacion.estado === 'PENDIENTE' && (
                        <button
                          onClick={() => marcarLeida(notificacion.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Marcar como leída"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => archivar(notificacion.id)}
                        className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                        title="Archivar"
                      >
                        <Archive className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}

