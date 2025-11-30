import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Layout from '@/components/Layout';
import type { Cliente } from '@shared/types';
import { Plus, Search, Edit, User, Mail, Phone, Gift } from 'lucide-react';

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);
  const [clienteEditar, setClienteEditar] = useState<Cliente | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
  });

  useEffect(() => {
    cargarClientes();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      cargarClientes();
    }, 300);
    return () => clearTimeout(timeout);
  }, [busqueda]);

  const cargarClientes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (busqueda) params.append('search', busqueda);
      
      const response = await api.get(`/clientes?${params.toString()}`);
      setClientes(response.data.clientes);
    } catch (error: any) {
      toast.error('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  const abrirModalCrear = () => {
    setClienteEditar(null);
    setFormData({ nombre: '', email: '', telefono: '' });
    setMostrarModal(true);
  };

  const abrirModalEditar = (cliente: Cliente) => {
    setClienteEditar(cliente);
    setFormData({
      nombre: cliente.nombre,
      email: cliente.email || '',
      telefono: cliente.telefono || '',
    });
    setMostrarModal(true);
  };

  const guardarCliente = async () => {
    try {
      if (!formData.nombre) {
        toast.error('El nombre es requerido');
        return;
      }

      const data = {
        nombre: formData.nombre,
        email: formData.email || null,
        telefono: formData.telefono || null,
      };

      if (clienteEditar) {
        await api.put(`/clientes/${clienteEditar.id}`, data);
        toast.success('Cliente actualizado exitosamente');
      } else {
        await api.post('/clientes', data);
        toast.success('Cliente creado exitosamente');
      }

      setMostrarModal(false);
      cargarClientes();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al guardar cliente');
    }
  };

  return (
    <Layout>
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
            <p className="text-gray-600 mt-1">Gestiona tu base de clientes</p>
          </div>
          <button
            onClick={abrirModalCrear}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Cliente
          </button>
        </div>

        {/* Búsqueda */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar cliente por nombre, email o teléfono..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {/* Lista de clientes */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : clientes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No se encontraron clientes</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clientes.map((cliente) => (
              <div
                key={cliente.id}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {cliente.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{cliente.nombre}</h3>
                      <p className="text-sm text-gray-500">
                        {cliente.puntos} puntos
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => abrirModalEditar(cliente)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-2">
                  {cliente.email && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="w-4 h-4 mr-2 text-gray-400" />
                      {cliente.email}
                    </div>
                  )}
                  {cliente.telefono && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="w-4 h-4 mr-2 text-gray-400" />
                      {cliente.telefono}
                    </div>
                  )}
                  <div className="flex items-center text-sm text-green-600 mt-3 pt-3 border-t border-gray-200">
                    <Gift className="w-4 h-4 mr-2" />
                    <span className="font-medium">{cliente.puntos} puntos acumulados</span>
                  </div>
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
                      {clienteEditar ? 'Editar Cliente' : 'Nuevo Cliente'}
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                    onClick={guardarCliente}
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

