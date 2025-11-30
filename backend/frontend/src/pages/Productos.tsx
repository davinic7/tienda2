import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api, isDatabaseError } from '../utils/api';
import { Producto } from '../types';
import { Package, Plus, Search, Edit, Trash2, X, Building2, History, Clock, UserCheck, Filter, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import ConfirmDialog from '../components/ConfirmDialog';

const productoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string().optional(),
  precio: z.number().positive('El precio debe ser positivo'),
  categoria: z.string().optional(),
  codigo_barras: z.string().optional(),
  imagen_url: z.string().url('URL inválida').optional().or(z.literal('')),
  stockInicial: z.number().int().min(0).optional(),
  stockMinimo: z.number().int().min(0).optional(),
});

const updateProductoSchema = productoSchema.extend({
  precio: z.number().positive('El precio debe ser positivo').optional(),
});

type ProductoForm = z.infer<typeof productoSchema>;
type UpdateProductoForm = z.infer<typeof updateProductoSchema>;

const Productos = () => {
  const { user } = useAuth();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null);
  const [mostrarInicializarStock, setMostrarInicializarStock] = useState(false);
  const [productoParaStock, setProductoParaStock] = useState<Producto | null>(null);
  const [stockInicial, setStockInicial] = useState('');
  const [stockMinimo, setStockMinimo] = useState('10');
  const [mostrarConfirmacionEliminar, setMostrarConfirmacionEliminar] = useState(false);
  const [productoAEliminar, setProductoAEliminar] = useState<Producto | null>(null);
  const [loadingEliminar, setLoadingEliminar] = useState(false);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [historialActividades, setHistorialActividades] = useState<any[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [fechaInicioHistorial, setFechaInicioHistorial] = useState('');
  const [fechaFinHistorial, setFechaFinHistorial] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductoForm | UpdateProductoForm>({
    resolver: zodResolver(productoEditando ? updateProductoSchema : productoSchema),
  });

  useEffect(() => {
    loadProductos();
  }, [search]);

  useEffect(() => {
    if (productoEditando) {
      reset({
        nombre: productoEditando.nombre,
        descripcion: productoEditando.descripcion || '',
        precio: Number(productoEditando.precio),
        categoria: productoEditando.categoria || '',
        codigo_barras: productoEditando.codigo_barras || '',
        imagen_url: productoEditando.imagen_url || '',
      });
      setMostrarFormulario(true);
    }
  }, [productoEditando, reset]);

  const loadProductos = async () => {
    try {
      setLoading(true);
      const response = await api.get('/productos', {
        params: { search, activo: true },
      });
      setProductos(response.data.productos);
    } catch (error: any) {
      if (!isDatabaseError(error)) {
        toast.error(error.response?.data?.error || 'Error al cargar productos');
      }
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: any) => {
    try {
      if (productoEditando) {
        // Los vendedores no pueden modificar precio
        if (user?.role === 'VENDEDOR' && data.precio !== undefined) {
          delete data.precio;
        }
        // No enviar stockInicial ni stockMinimo al actualizar
        delete data.stockInicial;
        delete data.stockMinimo;
        await api.put(`/productos/${productoEditando.id}`, data);
        toast.success('Producto actualizado exitosamente');
      } else {
        // Al crear, enviar stockInicial y stockMinimo si están definidos
        const productoData: any = { ...data };
        if (productoData.stockInicial === undefined || productoData.stockInicial === '') {
          delete productoData.stockInicial;
        }
        if (productoData.stockMinimo === undefined || productoData.stockMinimo === '') {
          delete productoData.stockMinimo;
        }
        await api.post('/productos', productoData);
        toast.success('Producto creado exitosamente');
        if (productoData.stockInicial) {
          toast.success(`Stock inicial de ${productoData.stockInicial} unidades creado para todos los locales`);
        }
      }
      loadProductos();
      reset();
      setMostrarFormulario(false);
      setProductoEditando(null);
    } catch (error: any) {
      if (!isDatabaseError(error)) {
        toast.error(error.response?.data?.error || 'Error al guardar producto');
      }
    }
  };

  const eliminarProducto = (producto: Producto) => {
    // Solo ADMIN puede eliminar
    if (user?.role !== 'ADMIN') {
      toast.error('Solo los administradores pueden eliminar productos');
      return;
    }
    setProductoAEliminar(producto);
    setMostrarConfirmacionEliminar(true);
  };

  const ejecutarEliminacion = async () => {
    if (!productoAEliminar) return;

    setLoadingEliminar(true);
    try {
      await api.delete(`/productos/${productoAEliminar.id}`);
      toast.success('Producto eliminado exitosamente');
      loadProductos();
      setMostrarConfirmacionEliminar(false);
      setProductoAEliminar(null);
    } catch (error: any) {
      if (!isDatabaseError(error)) {
        toast.error(error.response?.data?.error || 'Error al eliminar producto');
      }
    } finally {
      setLoadingEliminar(false);
    }
  };

  const inicializarStock = async () => {
    if (!productoParaStock || !stockInicial) {
      toast.error('Ingresa una cantidad de stock inicial');
      return;
    }

    try {
      await api.post(`/productos/${productoParaStock.id}/inicializar-stock`, {
        cantidad: Number(stockInicial),
        stockMinimo: stockMinimo ? Number(stockMinimo) : 10
      });
      toast.success(`Stock inicializado en todos los locales: ${stockInicial} unidades`);
      setMostrarInicializarStock(false);
      setProductoParaStock(null);
      setStockInicial('');
      setStockMinimo('10');
      loadProductos();
    } catch (error: any) {
      if (!isDatabaseError(error)) {
        toast.error(error.response?.data?.error || 'Error al inicializar stock');
      }
    }
  };

  const cargarHistorial = async (fechaInicio?: string, fechaFin?: string) => {
    if (user?.role !== 'ADMIN') return;
    
    try {
      setLoadingHistorial(true);
      const params = new URLSearchParams();
      params.append('tabla', 'PRODUCTOS');
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
      setLoadingHistorial(false);
    }
  };

  const abrirHistorial = () => {
    setMostrarHistorial(true);
    cargarHistorial();
  };


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
          <p className="text-gray-600">
            {user?.role === 'ADMIN'
              ? 'Gestiona los productos del sistema'
              : 'Crea y actualiza productos'}
          </p>
        </div>
        <div className="flex gap-2">
          {user?.role === 'ADMIN' && (
            <button
              onClick={abrirHistorial}
              className="btn btn-secondary flex items-center gap-2"
            >
              <History className="h-5 w-5" />
              Ver Historial
            </button>
          )}
          <button
            onClick={() => {
              setProductoEditando(null);
              reset();
              setMostrarFormulario(true);
            }}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Nuevo Producto
          </button>
        </div>
      </div>

      {mostrarFormulario && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {productoEditando ? 'Editar Producto' : 'Nuevo Producto'}
            </h2>
            <button
              onClick={() => {
                setMostrarFormulario(false);
                setProductoEditando(null);
                reset();
              }}
              className="btn-icon"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Nombre *</label>
              <input {...register('nombre')} className="input" />
              {errors.nombre && (
                <p className="mt-1 text-sm text-red-600">{errors.nombre.message}</p>
              )}
            </div>

            <div>
              <label className="label">Descripción</label>
              <textarea
                {...register('descripcion')}
                className="input"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">
                  Precio * {user?.role === 'VENDEDOR' && productoEditando && '(solo ADMIN puede modificar)'}
                </label>
                <input
                  {...register('precio', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0"
                  className="input"
                  disabled={user?.role === 'VENDEDOR' && !!productoEditando}
                />
                {errors.precio && (
                  <p className="mt-1 text-sm text-red-600">{errors.precio.message}</p>
                )}
              </div>

              <div>
                <label className="label">Categoría</label>
                <input {...register('categoria')} className="input" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Código de Barras</label>
                <input {...register('codigo_barras')} className="input" />
              </div>

              <div>
                <label className="label">URL de Imagen</label>
                <input {...register('imagen_url')} type="url" className="input" />
                {errors.imagen_url && (
                  <p className="mt-1 text-sm text-red-600">{errors.imagen_url.message}</p>
                )}
              </div>
            </div>

            {/* Campos de stock inicial (solo al crear) */}
            {!productoEditando && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div>
                  <label className="label">
                    Stock Inicial (opcional)
                    <span className="text-xs text-gray-500 block mt-1">
                      Se creará en todos los locales activos
                    </span>
                  </label>
                  <input
                    {...register('stockInicial', { valueAsNumber: true })}
                    type="number"
                    min="0"
                    step="1"
                    className="input"
                    placeholder="0"
                  />
                  {errors.stockInicial && (
                    <p className="mt-1 text-sm text-red-600">{errors.stockInicial.message}</p>
                  )}
                </div>

                <div>
                  <label className="label">
                    Stock Mínimo (opcional)
                    <span className="text-xs text-gray-500 block mt-1">
                      Alerta cuando el stock esté por debajo de este valor
                    </span>
                  </label>
                  <input
                    {...register('stockMinimo', { valueAsNumber: true })}
                    type="number"
                    min="0"
                    step="1"
                    className="input"
                    placeholder="10"
                  />
                  {errors.stockMinimo && (
                    <p className="mt-1 text-sm text-red-600">{errors.stockMinimo.message}</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">
                {productoEditando ? 'Actualizar' : 'Crear'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMostrarFormulario(false);
                  setProductoEditando(null);
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

      <div className="card mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o código de barras..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {productos.map((producto) => (
            <div key={producto.id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{producto.nombre}</h3>
                  {producto.categoria && (
                    <p className="text-sm text-gray-500">{producto.categoria}</p>
                  )}
                  {producto.descripcion && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {producto.descripcion}
                    </p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setProductoEditando(producto)}
                    className="btn-icon text-blue-600 hover:text-blue-700"
                    title="Editar"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  {user?.role === 'ADMIN' && (
                    <button
                      onClick={() => eliminarProducto(producto)}
                      className="btn-icon text-red-600 hover:text-red-700"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Precio:</span>
                  <span className="text-xl font-bold text-primary-600">
                    ${Number(producto.precio).toFixed(2)}
                  </span>
                </div>
                {producto.codigo_barras && (
                  <div className="mt-2 text-xs text-gray-500">
                    Código: {producto.codigo_barras}
                  </div>
                )}
                {/* Mostrar stock por local */}
                <div className="mt-3 space-y-2">
                  {user?.role === 'ADMIN' ? (
                    // ADMIN ve stock de todos los locales
                    producto.stocks && producto.stocks.length > 0 ? (
                      <div className="space-y-1">
                        {producto.stocks.map((stock) => (
                          <div key={stock.id} className="flex justify-between items-center text-sm">
                            <span className="text-gray-600 flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {stock.local?.nombre || 'Local'}
                            </span>
                            <span className={`font-semibold ${
                              stock.cantidad === 0
                                ? 'text-red-600'
                                : stock.cantidad <= stock.stock_minimo
                                ? 'text-yellow-600'
                                : 'text-green-600'
                            }`}>
                              {stock.cantidad} unidades
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          Sin stock
                        </span>
                        <button
                          onClick={() => {
                            setProductoParaStock(producto);
                            setMostrarInicializarStock(true);
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
                        >
                          Inicializar
                        </button>
                      </div>
                    )
                  ) : (
                    // VENDEDOR ve solo stock de su local
                    (() => {
                      const stock = producto.stocks?.find(s => s.localId === user?.localId);
                      return stock ? (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600 flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            Stock:
                          </span>
                          <span className={`font-semibold ${
                            stock.cantidad === 0
                              ? 'text-red-600'
                              : stock.cantidad <= stock.stock_minimo
                              ? 'text-yellow-600'
                              : 'text-green-600'
                          }`}>
                            {stock.cantidad} unidades
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            Sin stock
                          </span>
                          <button
                            onClick={() => {
                              setProductoParaStock(producto);
                              setMostrarInicializarStock(true);
                            }}
                            className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
                          >
                            Inicializar
                          </button>
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && productos.length === 0 && (
        <div className="card text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No se encontraron productos</p>
        </div>
      )}

      {/* Modal para inicializar stock */}
      {mostrarInicializarStock && productoParaStock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Inicializar Stock</h3>
              <button
                onClick={() => {
                  setMostrarInicializarStock(false);
                  setProductoParaStock(null);
                  setStockInicial('');
                  setStockMinimo('10');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Producto: <span className="font-semibold">{productoParaStock.nombre}</span>
                </p>
                <p className="text-xs text-gray-500">
                  Se creará stock en todos los locales activos
                </p>
              </div>

              <div>
                <label className="label">Cantidad de Stock Inicial *</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={stockInicial}
                  onChange={(e) => setStockInicial(e.target.value)}
                  className="input"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="label">Stock Mínimo</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={stockMinimo}
                  onChange={(e) => setStockMinimo(e.target.value)}
                  className="input"
                  placeholder="10"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Alerta cuando el stock esté por debajo de este valor
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setMostrarInicializarStock(false);
                    setProductoParaStock(null);
                    setStockInicial('');
                    setStockMinimo('10');
                  }}
                  className="btn btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button
                  onClick={inicializarStock}
                  className="btn btn-primary flex-1"
                >
                  Inicializar Stock
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo de confirmación para eliminar producto */}
      {productoAEliminar && (
        <ConfirmDialog
          isOpen={mostrarConfirmacionEliminar}
          onClose={() => {
            setMostrarConfirmacionEliminar(false);
            setProductoAEliminar(null);
          }}
          onConfirm={ejecutarEliminacion}
          title="Eliminar Producto"
          message={`¿Estás seguro de que deseas eliminar el producto "${productoAEliminar.nombre}"?\n\n` +
            `Esta acción no se puede deshacer y eliminará permanentemente el producto del sistema.`}
          confirmText="Sí, eliminar"
          cancelText="Cancelar"
          variant="danger"
          isLoading={loadingEliminar}
        />
      )}

      {/* Modal de Historial */}
      {mostrarHistorial && user?.role === 'ADMIN' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <History className="h-6 w-6 text-primary-600" />
                <h2 className="text-2xl font-bold text-gray-900">Historial de Productos</h2>
              </div>
              <button
                onClick={() => {
                  setMostrarHistorial(false);
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
                      cargarHistorial(e.target.value, fechaFinHistorial);
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
                      cargarHistorial(fechaInicioHistorial, e.target.value);
                    }}
                    className="input"
                  />
                </div>
              </div>
            </div>

            {/* Lista de actividades */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loadingHistorial ? (
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
                            <Package className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold text-gray-900">
                                {actividad.datos_nuevos?.nombre || actividad.datos_anteriores?.nombre || 'Producto'}
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
                                {actividad.datos_anteriores.precio !== actividad.datos_nuevos.precio && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-600">Precio:</span>
                                    <span className="text-gray-400">${Number(actividad.datos_anteriores.precio || 0).toFixed(2)}</span>
                                    <span className="text-gray-400">→</span>
                                    <span className="font-semibold text-gray-900">${Number(actividad.datos_nuevos.precio || 0).toFixed(2)}</span>
                                  </div>
                                )}
                                {actividad.datos_anteriores.nombre !== actividad.datos_nuevos.nombre && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-600">Nombre:</span>
                                    <span className="text-gray-400">{actividad.datos_anteriores.nombre}</span>
                                    <span className="text-gray-400">→</span>
                                    <span className="font-semibold text-gray-900">{actividad.datos_nuevos.nombre}</span>
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
                  setMostrarHistorial(false);
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
    </div>
  );
};

export default Productos;
