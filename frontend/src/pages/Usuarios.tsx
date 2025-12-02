import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Layout from '@/components/Layout';
import type { Local, Deposito } from '@shared/types';
import { Role } from '@shared/types';
import { Plus, Users, Edit, Shield, UserCheck, Store, Trash2, Warehouse } from 'lucide-react';

interface UsuarioCompleto {
  id: string;
  username: string;
  nombre: string;
  role: Role;
  localId?: string | null;
  depositoId?: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  local?: Local;
  deposito?: Deposito;
}

export default function Usuarios() {
  const { user: currentUser } = useAuthStore();
  const [usuarios, setUsuarios] = useState<UsuarioCompleto[]>([]);
  const [locales, setLocales] = useState<Local[]>([]);
  const [depositos, setDepositos] = useState<Deposito[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [usuarioEditar, setUsuarioEditar] = useState<UsuarioCompleto | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    nombre: '',
    role: Role.VENDEDOR as Role,
    localId: '',
    depositoId: '',
    activo: true,
  });
  const [filtroRole, setFiltroRole] = useState('');

  useEffect(() => {
    if (currentUser?.role === 'ADMIN') {
      cargarUsuarios();
      cargarLocales();
      cargarDepositos();
    }
  }, [currentUser, filtroRole]);

  const cargarUsuarios = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtroRole) params.append('role', filtroRole);
      
      const response = await api.get<UsuarioCompleto[]>(`/usuarios?${params.toString()}`);
      setUsuarios(response.data);
    } catch (error: any) {
      toast.error('Error al cargar usuarios');
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

  const cargarDepositos = async () => {
    try {
      const response = await api.get<Deposito[]>('/depositos');
      setDepositos(response.data);
    } catch (error: any) {
      toast.error('Error al cargar depósitos');
    }
  };

  const abrirModalCrear = () => {
    setUsuarioEditar(null);
    setFormData({
      username: '',
      password: '',
      nombre: '',
      role: Role.VENDEDOR,
      localId: '',
      depositoId: '',
      activo: true,
    });
    setMostrarModal(true);
  };

  const abrirModalEditar = (usuario: UsuarioCompleto) => {
    setUsuarioEditar(usuario);
    setFormData({
      username: usuario.username,
      password: '',
      nombre: usuario.nombre,
      role: usuario.role,
      localId: usuario.localId || '',
      depositoId: usuario.depositoId || '',
      activo: usuario.activo,
    });
    setMostrarModal(true);
  };

  const guardarUsuario = async () => {
    try {
      if (!formData.username || !formData.nombre) {
        toast.error('Username y nombre son requeridos');
        return;
      }

      if (!usuarioEditar && !formData.password) {
        toast.error('La contraseña es requerida para nuevos usuarios');
        return;
      }

      if (formData.role === Role.VENDEDOR && !formData.localId) {
        toast.error('Los vendedores deben tener un local asignado');
        return;
      }

      const data: any = {
        nombre: formData.nombre,
        role: formData.role,
        localId: formData.role === Role.VENDEDOR ? formData.localId : null,
        depositoId: formData.role === Role.DEPOSITO ? formData.depositoId : null,
      };

      if (usuarioEditar) {
        if (formData.password) {
          data.password = formData.password;
        }
        data.activo = formData.activo;
        await api.put(`/usuarios/${usuarioEditar.id}`, data);
        toast.success('Usuario actualizado exitosamente');
      } else {
        data.username = formData.username;
        data.password = formData.password;
        await api.post('/usuarios', data);
        toast.success('Usuario creado exitosamente');
      }

      setMostrarModal(false);
      cargarUsuarios();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al guardar usuario');
    }
  };

  const eliminarUsuario = async (id: string, nombre: string) => {
    if (id === currentUser?.id) {
      toast.error('No puedes eliminar tu propio usuario');
      return;
    }
    
    if (!confirm(`¿Estás seguro de eliminar permanentemente al usuario "${nombre}"?\n\nEsta acción no se puede deshacer.`)) {
      return;
    }
    
    try {
      await api.delete(`/usuarios/${id}`);
      toast.success('Usuario eliminado exitosamente');
      cargarUsuarios();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al eliminar usuario');
    }
  };

  if (currentUser?.role !== 'ADMIN') {
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
            <h1 className="text-3xl font-bold text-gray-900">Usuarios</h1>
            <p className="text-gray-600 mt-1">Gestiona los usuarios del sistema</p>
          </div>
          <button
            onClick={abrirModalCrear}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Usuario
          </button>
        </div>

        {/* Filtro */}
        <div className="mb-6">
          <select
            value={filtroRole}
            onChange={(e) => setFiltroRole(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          >
            <option value="">Todos los roles</option>
            <option value="ADMIN">Administradores</option>
            <option value="VENDEDOR">Vendedores</option>
            <option value="DEPOSITO">Depósito</option>
          </select>
        </div>

        {/* Lista de usuarios */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : usuarios.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No hay usuarios registrados</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {usuarios.map((usuario) => (
              <div
                key={usuario.id}
                className={`bg-white rounded-xl border-2 p-6 hover:shadow-lg transition-shadow ${
                  usuario.activo ? 'border-gray-200' : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`p-3 rounded-lg ${
                        usuario.role === 'ADMIN'
                          ? 'bg-gradient-to-br from-emerald-600 to-green-700'
                          : 'bg-gradient-to-br from-green-500 to-emerald-600'
                      }`}
                    >
                      {usuario.role === 'ADMIN' ? (
                        <Shield className="w-6 h-6 text-white" />
                      ) : (
                        <UserCheck className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{usuario.nombre}</h3>
                      <p className="text-sm text-gray-500">{usuario.username}</p>
                      {!usuario.activo && (
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded mt-1">
                          Inactivo
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => abrirModalEditar(usuario)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    {usuario.id !== currentUser?.id && (
                      <button
                        onClick={() => eliminarUsuario(usuario.id, usuario.nombre)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <span
                      className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                        usuario.role === 'ADMIN'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {usuario.role}
                    </span>
                  </div>
                  {usuario.local && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Store className="w-4 h-4 mr-2 text-gray-400" />
                      {usuario.local.nombre}
                    </div>
                  )}
                  {usuario.deposito && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Warehouse className="w-4 h-4 mr-2 text-gray-400" />
                      {usuario.deposito.nombre}
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
                      {usuarioEditar ? 'Editar Usuario' : 'Nuevo Usuario'}
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        disabled={!!usuarioEditar}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        required
                      />
                    </div>
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {usuarioEditar ? 'Nueva Contraseña (dejar vacío para mantener)' : 'Contraseña *'}
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        required={!usuarioEditar}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rol *</label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value as Role, localId: '', depositoId: '' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      >
                        <option value={Role.VENDEDOR}>Vendedor</option>
                        <option value={Role.ADMIN}>Administrador</option>
                        <option value={Role.DEPOSITO}>Depósito</option>
                      </select>
                    </div>
                    {formData.role === Role.VENDEDOR && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Local *</label>
                        <select
                          value={formData.localId}
                          onChange={(e) => setFormData({ ...formData, localId: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                          required
                        >
                          <option value="">Selecciona un local</option>
                          {locales.map((local) => (
                            <option key={local.id} value={local.id}>
                              {local.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {formData.role === Role.DEPOSITO && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Depósito (Opcional)</label>
                        <select
                          value={formData.depositoId}
                          onChange={(e) => setFormData({ ...formData, depositoId: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        >
                          <option value="">Sin depósito asignado</option>
                          {depositos.map((deposito) => (
                            <option key={deposito.id} value={deposito.id}>
                              {deposito.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {usuarioEditar && (
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.activo}
                          onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 block text-sm text-gray-700">Usuario activo</label>
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    onClick={guardarUsuario}
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

