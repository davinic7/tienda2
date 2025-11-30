import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Layout from '@/components/Layout';
import type { Deposito } from '@shared/types';
import { Plus, Warehouse, Edit, MapPin, Phone, Trash2 } from 'lucide-react';

export default function Depositos() {
  const { user } = useAuthStore();
  const [depositos, setDepositos] = useState<Deposito[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [depositoEditar, setDepositoEditar] = useState<Deposito | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    direccion: '',
    telefono: '',
  });

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      cargarDepositos();
    }
  }, [user]);

  const cargarDepositos = async () => {
    try {
      setLoading(true);
      const response = await api.get<Deposito[]>('/depositos');
      setDepositos(response.data);
    } catch (error: any) {
      toast.error('Error al cargar depósitos');
    } finally {
      setLoading(false);
    }
  };

  const abrirModalCrear = () => {
    setDepositoEditar(null);
    setFormData({ nombre: '', direccion: '', telefono: '' });
    setMostrarModal(true);
  };

  const abrirModalEditar = (deposito: Deposito) => {
    setDepositoEditar(deposito);
    setFormData({
      nombre: deposito.nombre,
      direccion: deposito.direccion || '',
      telefono: deposito.telefono || '',
    });
    setMostrarModal(true);
  };

  const guardarDeposito = async () => {
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

      if (depositoEditar) {
        await api.put(`/depositos/${depositoEditar.id}`, data);
        toast.success('Depósito actualizado exitosamente');
      } else {
        await api.post('/depositos', data);
        toast.success('Depósito creado exitosamente');
      }

      setMostrarModal(false);
      cargarDepositos();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al guardar depósito');
    }
  };

  const eliminarDeposito = async (id: string) => {
    if (!confirm('¿Estás seguro de desactivar este depósito?')) return;

    try {
      await api.delete(`/depositos/${id}`);
      toast.success('Depósito desactivado exitosamente');
      cargarDepositos();
    } catch (error: any) {
      toast.error('Error al desactivar depósito');
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
            <h1 className="text-3xl font-bold text-gray-900">Depósitos</h1>
            <p className="mt-2 text-sm text-gray-600">Gestiona los depósitos centrales</p>
          </div>
          <button
            onClick={abrirModalCrear}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Depósito
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando depósitos...</p>
          </div>
        ) : depositos.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Warehouse className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay depósitos</h3>
            <p className="text-gray-600 mb-4">Crea tu primer depósito para comenzar</p>
            <button
              onClick={abrirModalCrear}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              Crear Depósito
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {depositos.map((deposito) => (
              <div
                key={deposito.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg">
                      <Warehouse className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">{deposito.nombre}</h3>
                      <p className="text-sm text-gray-500">
                        {deposito.activo ? (
                          <span className="text-green-600">Activo</span>
                        ) : (
                          <span className="text-red-600">Inactivo</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => abrirModalEditar(deposito)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => eliminarDeposito(deposito.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {deposito.direccion && (
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                    {deposito.direccion}
                  </div>
                )}

                {deposito.telefono && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="w-4 h-4 mr-2 text-gray-400" />
                    {deposito.telefono}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {mostrarModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {depositoEditar ? 'Editar Depósito' : 'Nuevo Depósito'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="Nombre del depósito"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección
                  </label>
                  <input
                    type="text"
                    value={formData.direccion}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="Dirección"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="Teléfono"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setMostrarModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarDeposito}
                  className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 sm:ml-3 sm:w-auto"
                >
                  {depositoEditar ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

