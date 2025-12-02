import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Layout from '@/components/Layout';
import type { Local } from '@shared/types';
import { Plus, Store, Edit, MapPin, Phone, Trash2 } from 'lucide-react';

export default function Locales() {
  const { user } = useAuthStore();
  const [locales, setLocales] = useState<Local[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [localEditar, setLocalEditar] = useState<Local | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    direccion: '',
    telefono: '',
  });

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      cargarLocales();
    }
  }, [user]);

  const cargarLocales = async () => {
    try {
      setLoading(true);
      const response = await api.get<Local[]>('/locales');
      setLocales(response.data);
    } catch (error: any) {
      toast.error('Error al cargar locales');
    } finally {
      setLoading(false);
    }
  };

  const abrirModalCrear = () => {
    setLocalEditar(null);
    setFormData({ nombre: '', direccion: '', telefono: '' });
    setMostrarModal(true);
  };

  const abrirModalEditar = (local: Local) => {
    setLocalEditar(local);
    setFormData({
      nombre: local.nombre,
      direccion: local.direccion || '',
      telefono: local.telefono || '',
    });
    setMostrarModal(true);
  };

  const guardarLocal = async () => {
    try {
      if (!formData.nombre) {
        toast.error('El nombre es requerido');
        return;
      }

      const data = {
        nombre: formData.nombre,
        direccion: formData.direccion || undefined,
        telefono: formData.telefono || undefined,
      };

      if (localEditar) {
        await api.put(`/locales/${localEditar.id}`, data);
        toast.success('Local actualizado exitosamente');
      } else {
        await api.post('/locales', data);
        toast.success('Local creado exitosamente');
      }

      setMostrarModal(false);
      cargarLocales();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al guardar local');
    }
  };

  const eliminarLocal = async (id: string, nombre: string) => {
    if (!confirm(`¿Estás seguro de eliminar permanentemente el local "${nombre}"?\n\nEsta acción no se puede deshacer. Si el local tiene datos asociados (usuarios, ventas, stock), no se podrá eliminar.`)) {
      return;
    }
    
    try {
      await api.delete(`/locales/${id}`);
      toast.success('Local eliminado exitosamente');
      cargarLocales();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al eliminar local');
    }
  };

  if (user?.role !== 'ADMIN') {
    return (
      <Layout>
        <div className="p-8 text-center">
          <p className="text-gray-600">No tienes permisos para acceder a esta sección</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Locales</h1>
            <p className="text-gray-600 mt-1">Gestiona tus sucursales</p>
          </div>
          <button
            onClick={abrirModalCrear}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Local
          </button>
        </div>

        {/* Lista de locales */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : locales.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Store className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No hay locales registrados</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {locales.map((local) => (
              <div
                key={local.id}
                className={`bg-white rounded-xl border-2 p-6 hover:shadow-lg transition-shadow ${
                  local.activo ? 'border-gray-200' : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg">
                      <Store className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">{local.nombre}</h3>
                      {!local.activo && (
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded mt-1">
                          Inactivo
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => abrirModalEditar(local)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => eliminarLocal(local.id, local.nombre)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  {local.direccion && (
                    <div className="flex items-start text-sm text-gray-600">
                      <MapPin className="w-4 h-4 mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
                      <span className="break-words">{local.direccion}</span>
                    </div>
                  )}
                  {local.telefono && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="w-4 h-4 mr-2 text-gray-400" />
                      {local.telefono}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {mostrarModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div
                className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                onClick={() => setMostrarModal(false)}
              />
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">
                      {localEditar ? 'Editar Local' : 'Nuevo Local'}
                    </h3>
                    <button
                      onClick={() => setMostrarModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                      <input
                        type="text"
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                      <input
                        type="text"
                        value={formData.direccion}
                        onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                      <input
                        type="tel"
                        value={formData.telefono}
                        onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    onClick={guardarLocal}
                    className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 sm:ml-3 sm:w-auto"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => setMostrarModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

