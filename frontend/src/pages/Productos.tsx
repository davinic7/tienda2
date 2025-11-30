import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Layout from '@/components/Layout';
import type { Producto, Local } from '@shared/types';
import { Plus, Search, Edit, Trash2, Package, Filter, X, CheckCircle, AlertCircle, DollarSign, Settings, History } from 'lucide-react';

// Función para calcular precio sugerido
function calcularPrecioSugerido(costo: number, iva: number, utilidad: number): number {
  const costoConIva = costo * (1 + iva / 100);
  const precio = costoConIva * (1 + utilidad / 100);
  return Math.round(precio * 100) / 100;
}

export default function Productos() {
  const { user } = useAuthStore();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [locales, setLocales] = useState<Local[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);
  const [mostrarModalPrecio, setMostrarModalPrecio] = useState(false);
  const [mostrarModalPreciosCantidad, setMostrarModalPreciosCantidad] = useState(false);
  const [mostrarModalHistorial, setMostrarModalHistorial] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [productoEditar, setProductoEditar] = useState<Producto | null>(null);
  const [precioSugerido, setPrecioSugerido] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    codigo: '',
    codigoBarras: '',
    costo: '',
    iva: '21',
    porcentajeUtilidadDefault: '30',
    categoria: '',
    unidadMedida: 'UNIDAD',
    fechaVencimiento: '',
    imagenUrl: '',
  });
  const [precioFormData, setPrecioFormData] = useState({
    precio: '',
    porcentajeUtilidad: '',
    localId: '',
    motivo: '',
  });

  useEffect(() => {
    cargarProductos();
    if (user?.role === 'ADMIN') {
      cargarLocales();
    }
  }, []);

  const cargarLocales = async () => {
    try {
      const response = await api.get<Local[]>('/locales');
      setLocales(response.data);
    } catch (error) {
      console.error('Error al cargar locales:', error);
    }
  };

  const cargarProductos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (busqueda) params.append('search', busqueda);
      if (categoria) params.append('categoria', categoria);
      params.append('activo', 'true');
      
      const response = await api.get<Producto[]>(`/productos?${params.toString()}`);
      setProductos(response.data);
    } catch (error: any) {
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      cargarProductos();
    }, 300);
    return () => clearTimeout(timeout);
  }, [busqueda, categoria]);

  // Calcular precio sugerido cuando cambian costo, IVA o utilidad
  useEffect(() => {
    if (formData.costo && formData.iva && formData.porcentajeUtilidadDefault) {
      const sugerido = calcularPrecioSugerido(
        parseFloat(formData.costo) || 0,
        parseFloat(formData.iva) || 21,
        parseFloat(formData.porcentajeUtilidadDefault) || 30
      );
      setPrecioSugerido(sugerido);
    } else {
      setPrecioSugerido(null);
    }
  }, [formData.costo, formData.iva, formData.porcentajeUtilidadDefault]);

  const abrirModalCrear = () => {
    setProductoEditar(null);
    setFormData({
      nombre: '',
      descripcion: '',
      codigo: '',
      codigoBarras: '',
      costo: '',
      iva: '21',
      porcentajeUtilidadDefault: '30',
      categoria: '',
      unidadMedida: 'UNIDAD',
      fechaVencimiento: '',
      imagenUrl: '',
    });
    setMostrarModal(true);
  };

  const abrirModalEditar = (producto: Producto) => {
    setProductoEditar(producto);
    setFormData({
      nombre: producto.nombre,
      descripcion: producto.descripcion || '',
      codigo: producto.codigo || '',
      codigoBarras: producto.codigoBarras || '',
      costo: Number(producto.costo).toString(),
      iva: Number(producto.iva).toString(),
      porcentajeUtilidadDefault: Number(producto.porcentajeUtilidadDefault).toString(),
      categoria: producto.categoria || '',
      unidadMedida: producto.unidadMedida || 'UNIDAD',
      fechaVencimiento: producto.fechaVencimiento ? producto.fechaVencimiento.split('T')[0] : '',
      imagenUrl: producto.imagenUrl || '',
    });
    setMostrarModal(true);
  };

  const abrirModalAprobarPrecio = (producto: Producto) => {
    setProductoSeleccionado(producto);
    setPrecioFormData({
      precio: producto.precio ? Number(producto.precio).toFixed(2) : '',
      porcentajeUtilidad: producto.porcentajeUtilidadDefault ? Number(producto.porcentajeUtilidadDefault).toString() : '30',
      localId: '',
      motivo: '',
    });
    setMostrarModalPrecio(true);
  };

  const guardarProducto = async () => {
    try {
      if (!formData.nombre || !formData.costo) {
        toast.error('Nombre y costo son requeridos');
        return;
      }

      const data: any = {
        nombre: formData.nombre,
        descripcion: formData.descripcion || undefined,
        codigo: formData.codigo || undefined,
        codigoBarras: formData.codigoBarras || undefined,
        costo: parseFloat(formData.costo),
        iva: parseFloat(formData.iva) || 21,
        porcentajeUtilidadDefault: parseFloat(formData.porcentajeUtilidadDefault) || 30,
        categoria: formData.categoria || undefined,
        unidadMedida: formData.unidadMedida || 'UNIDAD',
        fechaVencimiento: formData.fechaVencimiento || undefined,
        imagenUrl: formData.imagenUrl || undefined,
      };

      if (productoEditar) {
        await api.put(`/productos/${productoEditar.id}`, data);
        toast.success('Producto actualizado exitosamente');
      } else {
        await api.post('/productos', data);
        toast.success('Producto creado exitosamente. El precio sugerido debe ser aprobado.');
      }

      setMostrarModal(false);
      cargarProductos();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al guardar producto');
    }
  };

  const aprobarPrecio = async () => {
    if (!productoSeleccionado) return;

    try {
      if (!precioFormData.precio || parseFloat(precioFormData.precio) <= 0) {
        toast.error('El precio debe ser mayor a 0');
        return;
      }

      await api.post(`/productos/${productoSeleccionado.id}/aprobar-precio`, {
        precio: parseFloat(precioFormData.precio),
        porcentajeUtilidad: precioFormData.porcentajeUtilidad ? parseFloat(precioFormData.porcentajeUtilidad) : undefined,
        localId: precioFormData.localId || undefined,
        motivo: precioFormData.motivo || undefined,
      });

      toast.success(precioFormData.localId ? 'Precio aprobado para el local' : 'Precio aprobado');
      setMostrarModalPrecio(false);
      cargarProductos();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al aprobar precio');
    }
  };

  const eliminarProducto = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;

    try {
      await api.delete(`/productos/${id}`);
      toast.success('Producto eliminado exitosamente');
      cargarProductos();
    } catch (error: any) {
      toast.error('Error al eliminar producto');
    }
  };

  const categorias = Array.from(new Set(productos.map((p) => p.categoria).filter(Boolean)));

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
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Productos</h1>
            <p className="text-gray-600 mt-1">Gestiona tu catálogo de productos</p>
          </div>
          <button
            onClick={abrirModalCrear}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Producto
          </button>
        </div>

        {/* Filtros */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar producto por nombre o código..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div className="relative sm:w-48">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="">Todas las categorías</option>
              {categorias.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Lista de productos */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : productos.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No se encontraron productos</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {productos.map((producto) => {
              const precioFinal = producto.precioFinal || producto.precio || 0;
              const precioAprobado = producto.precioAprobado;
              
              return (
                <div
                  key={producto.id}
                  className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
                >
                  {producto.imagenUrl ? (
                    <img
                      src={producto.imagenUrl}
                      alt={producto.nombre}
                      className="w-full h-32 object-cover rounded-lg mb-4"
                    />
                  ) : (
                    <div className="w-full h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg mb-4 flex items-center justify-center">
                      <Package className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 flex-1">{producto.nombre}</h3>
                    {precioAprobado ? (
                        <CheckCircle className="w-5 h-5 text-green-500 ml-2" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-500 ml-2" title="Precio pendiente de aprobación" />
                    )}
                  </div>
                  {producto.descripcion && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{producto.descripcion}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {producto.categoria && (
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                        {producto.categoria}
                      </span>
                    )}
                    {producto.codigo && (
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                        {producto.codigo}
                      </span>
                    )}
                  </div>
                  <div className="mb-2">
                    <p className="text-xs text-gray-500">Costo: ${Number(producto.costo).toFixed(2)}</p>
                    {producto.precioFinal && (
                      <p className="text-xs text-gray-500">
                        IVA: {Number(producto.iva)}% | Utilidad: {Number(producto.porcentajeUtilidadDefault)}%
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                    <div>
                      <span className="text-2xl font-bold text-green-600">
                        ${precioFinal.toFixed(2)}
                      </span>
                      {!precioAprobado && (
                        <p className="text-xs text-yellow-600 mt-1">Pendiente aprobación</p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => abrirModalAprobarPrecio(producto)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <DollarSign className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => abrirModalEditar(producto)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => eliminarProducto(producto.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal Crear/Editar Producto */}
        {mostrarModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setMostrarModal(false)} />
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">
                      {productoEditar ? 'Editar Producto' : 'Nuevo Producto'}
                    </h3>
                    <button
                      onClick={() => setMostrarModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                        <input
                          type="text"
                          value={formData.codigo}
                          onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                      <textarea
                        value={formData.descripcion}
                        onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Costo *</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.costo}
                          onChange={(e) => setFormData({ ...formData, costo: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">IVA (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.iva}
                          onChange={(e) => setFormData({ ...formData, iva: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Utilidad (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.porcentajeUtilidadDefault}
                          onChange={(e) => setFormData({ ...formData, porcentajeUtilidadDefault: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    </div>
                    {precioSugerido && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm font-medium text-blue-900">
                          Precio sugerido: <span className="text-lg font-bold">${precioSugerido.toFixed(2)}</span>
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                          Este precio deberá ser aprobado después de crear el producto
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                        <input
                          type="text"
                          value={formData.categoria}
                          onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Unidad de Medida</label>
                        <select
                          value={formData.unidadMedida}
                          onChange={(e) => setFormData({ ...formData, unidadMedida: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        >
                          <option value="UNIDAD">Unidad</option>
                          <option value="KG">Kilogramo</option>
                          <option value="L">Litro</option>
                          <option value="M">Metro</option>
                          <option value="M2">Metro cuadrado</option>
                          <option value="M3">Metro cúbico</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Código de Barras</label>
                        <input
                          type="text"
                          value={formData.codigoBarras}
                          onChange={(e) => setFormData({ ...formData, codigoBarras: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Vencimiento</label>
                        <input
                          type="date"
                          value={formData.fechaVencimiento}
                          onChange={(e) => setFormData({ ...formData, fechaVencimiento: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">URL de Imagen</label>
                      <input
                        type="url"
                        value={formData.imagenUrl}
                        onChange={(e) => setFormData({ ...formData, imagenUrl: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder="https://ejemplo.com/imagen.jpg"
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    onClick={guardarProducto}
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

        {/* Modal Aprobar Precio */}
        {mostrarModalPrecio && productoSeleccionado && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setMostrarModalPrecio(false)} />
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Aprobar/Ajustar Precio</h3>
                    <button
                      onClick={() => setMostrarModalPrecio(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Producto: <span className="font-semibold">{productoSeleccionado.nombre}</span></p>
                      <p className="text-xs text-gray-500">Costo: ${Number(productoSeleccionado.costo).toFixed(2)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Precio *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={precioFormData.precio}
                        onChange={(e) => setPrecioFormData({ ...precioFormData, precio: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">% Utilidad</label>
                      <input
                        type="number"
                        step="0.01"
                        value={precioFormData.porcentajeUtilidad}
                        onChange={(e) => setPrecioFormData({ ...precioFormData, porcentajeUtilidad: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Local (opcional - dejar vacío para precio general)</label>
                      <select
                        value={precioFormData.localId}
                        onChange={(e) => setPrecioFormData({ ...precioFormData, localId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      >
                        <option value="">Precio general</option>
                        {locales.map((local) => (
                          <option key={local.id} value={local.id}>
                            {local.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Motivo del ajuste (opcional)</label>
                      <textarea
                        value={precioFormData.motivo}
                        onChange={(e) => setPrecioFormData({ ...precioFormData, motivo: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        rows={3}
                        placeholder="Ej: Ajuste por competencia, promoción, etc."
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    onClick={aprobarPrecio}
                    className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 sm:ml-3 sm:w-auto"
                  >
                    Aprobar Precio
                  </button>
                  <button
                    onClick={() => setMostrarModalPrecio(false)}
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
