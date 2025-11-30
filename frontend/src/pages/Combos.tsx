import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Layout from '@/components/Layout';
import type { Combo, Producto } from '@shared/types';
import { Plus, Search, Edit, Trash2, X, ShoppingCart } from 'lucide-react';

export default function Combos() {
  const { user } = useAuthStore();
  const [combos, setCombos] = useState<Combo[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);
  const [comboEditar, setComboEditar] = useState<Combo | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precioPromocional: '',
    imagenUrl: '',
  });
  const [productosCombo, setProductosCombo] = useState<Array<{ productoId: string; cantidad: number }>>([]);

  useEffect(() => {
    cargarCombos();
    cargarProductos();
  }, []);

  const cargarCombos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (busqueda) params.append('search', busqueda);
      params.append('activo', 'true');
      
      const response = await api.get<Combo[]>(`/combos?${params.toString()}`);
      setCombos(response.data);
    } catch (error: any) {
      toast.error('Error al cargar combos');
    } finally {
      setLoading(false);
    }
  };

  const cargarProductos = async () => {
    try {
      const response = await api.get<Producto[]>('/productos?activo=true');
      setProductos(response.data);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      cargarCombos();
    }, 300);
    return () => clearTimeout(timeout);
  }, [busqueda]);

  const abrirModalCrear = () => {
    setComboEditar(null);
    setFormData({
      nombre: '',
      descripcion: '',
      precioPromocional: '',
      imagenUrl: '',
    });
    setProductosCombo([]);
    setMostrarModal(true);
  };

  const abrirModalEditar = (combo: Combo) => {
    setComboEditar(combo);
    setFormData({
      nombre: combo.nombre,
      descripcion: combo.descripcion || '',
      precioPromocional: Number(combo.precioPromocional).toString(),
      imagenUrl: combo.imagenUrl || '',
    });
    setProductosCombo(
      combo.productos?.map((p: { productoId: string; cantidad: number }) => ({
        productoId: p.productoId,
        cantidad: p.cantidad,
      })) || []
    );
    setMostrarModal(true);
  };

  const agregarProducto = () => {
    setProductosCombo([...productosCombo, { productoId: '', cantidad: 1 }]);
  };

  const eliminarProducto = (index: number) => {
    setProductosCombo(productosCombo.filter((_, i) => i !== index));
  };

  const actualizarProducto = (index: number, field: 'productoId' | 'cantidad', value: string | number) => {
    const nuevos = [...productosCombo];
    nuevos[index] = { ...nuevos[index], [field]: value };
    setProductosCombo(nuevos);
  };

  const guardarCombo = async () => {
    try {
      if (!formData.nombre || !formData.precioPromocional) {
        toast.error('Nombre y precio promocional son requeridos');
        return;
      }

      if (productosCombo.length === 0) {
        toast.error('Debe incluir al menos un producto');
        return;
      }

      if (productosCombo.some((p) => !p.productoId || p.cantidad <= 0)) {
        toast.error('Todos los productos deben tener una cantidad válida');
        return;
      }

      const data = {
        nombre: formData.nombre,
        descripcion: formData.descripcion || undefined,
        precioPromocional: parseFloat(formData.precioPromocional),
        imagenUrl: formData.imagenUrl || undefined,
        productos: productosCombo,
      };

      if (comboEditar) {
        await api.put(`/combos/${comboEditar.id}`, {
          ...data,
          activo: true,
        });
        await api.put(`/combos/${comboEditar.id}/productos`, {
          productos: productosCombo,
        });
        toast.success('Combo actualizado exitosamente');
      } else {
        await api.post('/combos', data);
        toast.success('Combo creado exitosamente');
      }

      setMostrarModal(false);
      cargarCombos();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al guardar combo');
    }
  };

  const eliminarCombo = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este combo?')) return;

    try {
      await api.delete(`/combos/${id}`);
      toast.success('Combo eliminado exitosamente');
      cargarCombos();
    } catch (error: any) {
      toast.error('Error al eliminar combo');
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
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Combos</h1>
            <p className="text-gray-600 mt-1">Gestiona combos promocionales</p>
          </div>
          <button
            onClick={abrirModalCrear}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Combo
          </button>
        </div>

        {/* Búsqueda */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar combo..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Lista de combos */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : combos.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <ShoppingCart className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No se encontraron combos</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {combos.map((combo) => {
              const precioTotalProductos = combo.productos?.reduce((sum: number, p: { producto?: { precioFinal?: number | null; precio?: number | null }; cantidad: number }) => {
                const precio = p.producto?.precioFinal || p.producto?.precio || 0;
                return sum + precio * p.cantidad;
              }, 0) || 0;
              const ahorro = precioTotalProductos - Number(combo.precioPromocional);

              return (
                <div
                  key={combo.id}
                  className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
                >
                  {combo.imagenUrl ? (
                    <img
                      src={combo.imagenUrl}
                      alt={combo.nombre}
                      className="w-full h-32 object-cover rounded-lg mb-4"
                    />
                  ) : (
                    <div className="w-full h-32 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg mb-4 flex items-center justify-center">
                      <ShoppingCart className="w-12 h-12 text-purple-400" />
                    </div>
                  )}
                  <h3 className="font-semibold text-gray-900 mb-1">{combo.nombre}</h3>
                  {combo.descripcion && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{combo.descripcion}</p>
                  )}
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">Incluye:</p>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {combo.productos?.map((p: { producto?: { nombre?: string }; cantidad: number }, idx: number) => (
                        <li key={idx}>
                          • {p.producto?.nombre} x{p.cantidad}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                    <div>
                      <span className="text-2xl font-bold text-purple-600">
                        ${Number(combo.precioPromocional).toFixed(2)}
                      </span>
                      {ahorro > 0 && (
                        <p className="text-xs text-green-600 mt-1">
                          Ahorro: ${ahorro.toFixed(2)}
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => abrirModalEditar(combo)}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => eliminarCombo(combo.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
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

        {/* Modal */}
        {mostrarModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setMostrarModal(false)} />
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">
                      {comboEditar ? 'Editar Combo' : 'Nuevo Combo'}
                    </h3>
                    <button
                      onClick={() => setMostrarModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                      <input
                        type="text"
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                      <textarea
                        value={formData.descripcion}
                        onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Precio Promocional *</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.precioPromocional}
                          onChange={(e) => setFormData({ ...formData, precioPromocional: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">URL de Imagen</label>
                        <input
                          type="url"
                          value={formData.imagenUrl}
                          onChange={(e) => setFormData({ ...formData, imagenUrl: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                          placeholder="https://ejemplo.com/imagen.jpg"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">Productos del Combo *</label>
                        <button
                          type="button"
                          onClick={agregarProducto}
                          className="text-sm text-purple-600 hover:text-purple-700 flex items-center"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Agregar Producto
                        </button>
                      </div>
                      <div className="space-y-2">
                        {productosCombo.map((item, index) => (
                          <div key={index} className="flex gap-2 items-center">
                            <select
                              value={item.productoId}
                              onChange={(e) => actualizarProducto(index, 'productoId', e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            >
                              <option value="">Seleccionar producto</option>
                              {productos.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.nombre} - ${(p.precioFinal || p.precio || 0).toFixed(2)}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              min="1"
                              value={item.cantidad}
                              onChange={(e) => actualizarProducto(index, 'cantidad', parseInt(e.target.value) || 1)}
                              className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                              placeholder="Cant."
                            />
                            <button
                              type="button"
                              onClick={() => eliminarProducto(index)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    onClick={guardarCombo}
                    className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 sm:ml-3 sm:w-auto"
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

