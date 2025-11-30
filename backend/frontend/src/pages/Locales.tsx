import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { Local } from '../types';
import { Plus, Edit2, Trash2, MapPin, Building2, Users, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import ConfirmDialog from '../components/ConfirmDialog';

const localSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
});

type LocalForm = z.infer<typeof localSchema>;

const Locales = () => {
  const { user } = useAuth();
  const [locales, setLocales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [localEditando, setLocalEditando] = useState<Local | null>(null);
  const [mostrarConfirmacionEliminar, setMostrarConfirmacionEliminar] = useState(false);
  const [localAEliminar, setLocalAEliminar] = useState<Local | null>(null);
  const [loadingEliminar, setLoadingEliminar] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LocalForm>({
    resolver: zodResolver(localSchema),
  });

  useEffect(() => {
    cargarLocales();
    // Actualizar cada 10 segundos para ver cambios en tiempo real
    const interval = setInterval(cargarLocales, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (localEditando) {
      reset({
        nombre: localEditando.nombre,
        direccion: localEditando.direccion || '',
        telefono: localEditando.telefono || '',
      });
      setMostrarFormulario(true);
    }
  }, [localEditando, reset]);

  const cargarLocales = async () => {
    try {
      const response = await api.get('/locales');
      setLocales(response.data.locales || []);
    } catch (error: any) {
      toast.error('Error al cargar locales');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: LocalForm) => {
    try {
      if (localEditando) {
        await api.put(`/locales/${localEditando.id}`, data);
        toast.success('Local actualizado exitosamente');
      } else {
        await api.post('/locales', data);
        toast.success('Local creado exitosamente');
      }
      cargarLocales();
      reset();
      setMostrarFormulario(false);
      setLocalEditando(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al guardar local');
    }
  };

  const eliminarLocal = (local: Local) => {
    setLocalAEliminar(local);
    setMostrarConfirmacionEliminar(true);
  };

  const ejecutarEliminacion = async () => {
    if (!localAEliminar) return;

    setLoadingEliminar(true);
    try {
      await api.put(`/locales/${localAEliminar.id}`, { activo: false });
      toast.success('Local desactivado exitosamente');
      cargarLocales();
      setMostrarConfirmacionEliminar(false);
      setLocalAEliminar(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al eliminar local');
    } finally {
      setLoadingEliminar(false);
    }
  };

  // Solo ADMIN puede ver esta página
  if (user?.role !== 'ADMIN') {
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
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Locales</h1>
          <p className="text-gray-600">Administra las sucursales del sistema</p>
        </div>
        <button
          onClick={() => {
            setLocalEditando(null);
            reset();
            setMostrarFormulario(true);
          }}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Nuevo Local
        </button>
      </div>

      {mostrarFormulario && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">
            {localEditando ? 'Editar Local' : 'Nuevo Local'}
          </h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Nombre *</label>
              <input {...register('nombre')} className="input" />
              {errors.nombre && (
                <p className="mt-1 text-sm text-red-600">{errors.nombre.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Dirección</label>
                <input {...register('direccion')} className="input" />
              </div>

              <div>
                <label className="label">Teléfono</label>
                <input {...register('telefono')} className="input" />
              </div>
            </div>

            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">
                {localEditando ? 'Actualizar' : 'Crear'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMostrarFormulario(false);
                  setLocalEditando(null);
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {locales.length === 0 ? (
          <div className="col-span-full card text-center py-12">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">No hay locales registrados</p>
          </div>
        ) : (
          locales.map((local) => (
            <div key={local.id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary-600" />
                    {local.nombre}
                  </h3>
                  {local.direccion && (
                    <p className="text-sm text-gray-600 mt-1">{local.direccion}</p>
                  )}
                  {local.telefono && (
                    <p className="text-sm text-gray-500 mt-1">📞 {local.telefono}</p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setLocalEditando(local)}
                    className="btn-icon text-blue-600 hover:text-blue-700"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => eliminarLocal(local)}
                    className="btn-icon text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="border-t pt-4 space-y-3">
                {/* Estado basado en turnos activos */}
                <div className="flex items-center justify-between">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
                    (local.turnosActivos && local.turnosActivos > 0)
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {(local.turnosActivos && local.turnosActivos > 0) ? (
                      <>
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Activo
                      </>
                    ) : (
                      'Sin vendedores'
                    )}
                  </span>
                  <span className="text-xs text-gray-500">
                    Creado: {new Date(local.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Información de vendedores activos */}
                {local.turnosActivos && local.turnosActivos > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-semibold text-green-800">
                        {local.turnosActivos} {local.turnosActivos === 1 ? 'Vendedor activo' : 'Vendedores activos'}
                      </span>
                    </div>
                    {local.vendedoresActivos && local.vendedoresActivos.length > 0 && (
                      <div className="space-y-1">
                        {local.vendedoresActivos.map((vendedor: any) => (
                          <div key={vendedor.id} className="flex items-center justify-between text-xs">
                            <span className="text-gray-700">{vendedor.nombre}</span>
                            <span className="text-gray-500 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(vendedor.fechaApertura).toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Estadísticas del local */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {local._count && (
                    <>
                      <div className="text-gray-600">
                        <span className="font-semibold">{local._count.usuarios || 0}</span> usuarios
                      </div>
                      <div className="text-gray-600">
                        <span className="font-semibold">{local._count.ventas || 0}</span> ventas
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Diálogo de confirmación para eliminar local */}
      {localAEliminar && (
        <ConfirmDialog
          isOpen={mostrarConfirmacionEliminar}
          onClose={() => {
            setMostrarConfirmacionEliminar(false);
            setLocalAEliminar(null);
          }}
          onConfirm={ejecutarEliminacion}
          title="Desactivar Local"
          message={`¿Estás seguro de que deseas desactivar el local "${localAEliminar.nombre}"?\n\n` +
            `Esta acción desactivará el local y no se podrán realizar ventas en él hasta que se reactive.\n\n` +
            (localAEliminar.turnosActivos && localAEliminar.turnosActivos > 0
              ? `⚠️ ADVERTENCIA: Este local tiene ${localAEliminar.turnosActivos} turno(s) activo(s). Debes cerrar los turnos antes de desactivar el local.`
              : 'El stock y los productos asociados se mantendrán.')}
          confirmText="Sí, desactivar"
          cancelText="Cancelar"
          variant="warning"
          isLoading={loadingEliminar}
        />
      )}
    </div>
  );
};

export default Locales;

