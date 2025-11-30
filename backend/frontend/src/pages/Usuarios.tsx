import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { User, Local, Role } from '../types';
import { Plus, Edit2, Trash2, UserPlus, Shield, User as UserIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import ConfirmDialog from '../components/ConfirmDialog';

const createUsuarioSchema = z.object({
  email: z.string().email('Email inválido'),
  nombre: z.string().min(1, 'El nombre es requerido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  role: z.nativeEnum(Role),
  localId: z.string().uuid('Selecciona un local').nullable().optional(),
});

const updateUsuarioSchema = createUsuarioSchema.extend({
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional().or(z.literal('')),
});

type UsuarioForm = z.infer<typeof createUsuarioSchema> | z.infer<typeof updateUsuarioSchema>;

const Usuarios = () => {
  const { user: currentUser } = useAuth();
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [locales, setLocales] = useState<Local[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<User | null>(null);
  const [mostrarConfirmacionEliminar, setMostrarConfirmacionEliminar] = useState(false);
  const [usuarioAEliminar, setUsuarioAEliminar] = useState<User | null>(null);
  const [loadingEliminar, setLoadingEliminar] = useState(false);

  const [isEditing, setIsEditing] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<UsuarioForm>({
    resolver: zodResolver(isEditing ? updateUsuarioSchema : createUsuarioSchema),
  });

  const roleSeleccionado = watch('role');

  useEffect(() => {
    cargarUsuarios();
    cargarLocales();
  }, []);

  useEffect(() => {
    if (usuarioEditando) {
      setIsEditing(true);
      reset({
        email: usuarioEditando.email,
        nombre: usuarioEditando.nombre,
        password: '', // Campo vacío para edición
        role: usuarioEditando.role,
        localId: usuarioEditando.localId || undefined,
      });
      setMostrarFormulario(true);
    } else {
      setIsEditing(false);
    }
  }, [usuarioEditando, reset]);

  const cargarUsuarios = async () => {
    try {
      const response = await api.get('/usuarios');
      setUsuarios(response.data.usuarios || []);
    } catch (error: any) {
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const cargarLocales = async () => {
    try {
      const response = await api.get('/locales');
      setLocales(response.data.locales || []);
    } catch (error: any) {
      toast.error('Error al cargar locales');
    }
  };

  const onSubmit = async (data: any) => {
    try {
      // Preparar datos para enviar
      const dataToSend: any = {
        email: data.email,
        nombre: data.nombre,
        role: data.role,
        localId: data.localId || null,
      };

      // Solo incluir contraseña si se proporciona (y no está vacía)
      if (data.password && data.password.trim() !== '') {
        dataToSend.password = data.password;
      }

      if (usuarioEditando) {
        await api.put(`/usuarios/${usuarioEditando.id}`, dataToSend);
        toast.success('Usuario actualizado exitosamente');
      } else {
        // Al crear, la contraseña es requerida
        if (!data.password || data.password.trim() === '') {
          toast.error('La contraseña es requerida al crear un usuario');
          return;
        }
        await api.post('/usuarios', dataToSend);
        toast.success('Usuario creado exitosamente');
      }
      cargarUsuarios();
      reset();
      setMostrarFormulario(false);
      setUsuarioEditando(null);
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al guardar usuario');
    }
  };

  const eliminarUsuario = (usuario: User) => {
    setUsuarioAEliminar(usuario);
    setMostrarConfirmacionEliminar(true);
  };

  const ejecutarEliminacion = async () => {
    if (!usuarioAEliminar) return;

    setLoadingEliminar(true);
    try {
      await api.delete(`/usuarios/${usuarioAEliminar.id}`);
      toast.success('Usuario desactivado exitosamente');
      cargarUsuarios();
      setMostrarConfirmacionEliminar(false);
      setUsuarioAEliminar(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al eliminar usuario');
    } finally {
      setLoadingEliminar(false);
    }
  };

  // Solo ADMIN puede ver esta página
  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="card">
        <p className="text-red-600">No tienes permisos para ver esta página.</p>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-600">Administra usuarios y vendedores del sistema</p>
        </div>
        <button
          onClick={() => {
            setUsuarioEditando(null);
            setIsEditing(false);
            reset({
              role: Role.VENDEDOR,
              localId: undefined,
              password: '',
            });
            setMostrarFormulario(true);
          }}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Nuevo Usuario
        </button>
      </div>

      {mostrarFormulario && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">
            {usuarioEditando ? 'Editar Usuario' : 'Nuevo Usuario'}
          </h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Email *</label>
                <input {...register('email')} type="email" className="input" />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="label">Nombre *</label>
                <input {...register('nombre')} className="input" />
                {errors.nombre && (
                  <p className="mt-1 text-sm text-red-600">{errors.nombre.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="label">
                Contraseña {usuarioEditando ? '(dejar vacío para no cambiar)' : '*'}
              </label>
              <input
                {...register('password')}
                type="password"
                className="input"
                placeholder={usuarioEditando ? 'Dejar vacío para mantener la actual' : 'Mínimo 6 caracteres'}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Rol *</label>
                <select {...register('role')} className="input">
                  <option value="VENDEDOR">Vendedor</option>
                  <option value="ADMIN">Administrador</option>
                </select>
                {errors.role && (
                  <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
                )}
              </div>

              <div>
                <label className="label">
                  Local {roleSeleccionado === 'VENDEDOR' ? '*' : '(solo para vendedores)'}
                </label>
                <select
                  {...register('localId')}
                  className="input"
                  disabled={roleSeleccionado === 'ADMIN'}
                >
                  <option value="">Selecciona un local</option>
                  {locales
                    .filter((l) => l.activo)
                    .map((local) => (
                      <option key={local.id} value={local.id}>
                        {local.nombre}
                      </option>
                    ))}
                </select>
                {errors.localId && (
                  <p className="mt-1 text-sm text-red-600">{errors.localId.message}</p>
                )}
                {roleSeleccionado === 'ADMIN' && (
                  <p className="mt-1 text-sm text-gray-500">
                    Los administradores no tienen local asignado
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">
                {usuarioEditando ? 'Actualizar' : 'Crear'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMostrarFormulario(false);
                  setUsuarioEditando(null);
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
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Rol</th>
                <th className="text-left p-3">Local</th>
                <th className="text-center p-3">Estado</th>
                <th className="text-right p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-gray-500">
                    <UserPlus className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>No hay usuarios registrados</p>
                  </td>
                </tr>
              ) : (
                usuarios.map((usuario) => (
                  <tr key={usuario.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-semibold">{usuario.nombre}</td>
                    <td className="p-3">{usuario.email}</td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                          usuario.role === 'ADMIN'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {usuario.role === 'ADMIN' ? (
                          <Shield className="h-3 w-3" />
                        ) : (
                          <UserIcon className="h-3 w-3" />
                        )}
                        {usuario.role}
                      </span>
                    </td>
                    <td className="p-3">{usuario.local?.nombre || '-'}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          usuario.activo
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {usuario.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setUsuarioEditando(usuario)}
                          className="btn-icon text-blue-600 hover:text-blue-700"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        {usuario.id !== currentUser?.id && (
                          <button
                            onClick={() => eliminarUsuario(usuario)}
                            className="btn-icon text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Diálogo de confirmación para eliminar usuario */}
      {usuarioAEliminar && (
        <ConfirmDialog
          isOpen={mostrarConfirmacionEliminar}
          onClose={() => {
            setMostrarConfirmacionEliminar(false);
            setUsuarioAEliminar(null);
          }}
          onConfirm={ejecutarEliminacion}
          title="Desactivar Usuario"
          message={`¿Estás seguro de que deseas desactivar al usuario "${usuarioAEliminar.nombre}" (${usuarioAEliminar.email})?\n\n` +
            `Rol: ${usuarioAEliminar.role}\n` +
            `Esta acción desactivará el usuario y no podrá iniciar sesión hasta que se reactive.\n\n` +
            `Esta acción no se puede deshacer.`}
          confirmText="Sí, desactivar"
          cancelText="Cancelar"
          variant="danger"
          isLoading={loadingEliminar}
        />
      )}
    </div>
  );
};

export default Usuarios;

