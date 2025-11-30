import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Layout from '@/components/Layout';
import type { StockDeposito, Deposito, Producto } from '@shared/types';
import { Search, Package, Warehouse, AlertTriangle, Edit, Plus } from 'lucide-react';

interface StockDepositoCompleto {
  id: string;
  productoId: string;
  depositoId: string;
  cantidad: number;
  stockMinimo: number;
  createdAt: string;
  updatedAt: string;
  producto?: Producto;
  deposito?: Deposito;
}

export default function StockDeposito() {
  const { user } = useAuthStore();
  const [stocks, setStocks] = useState<StockDepositoCompleto[]>([]);
  const [depositos, setDepositos] = useState<Deposito[]>([]);
  const [depositoSeleccionado, setDepositoSeleccionado] = useState<string>('');
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [mostrarAlertaStock, setMostrarAlertaStock] = useState(true);
  const [mostrarModalAgregar, setMostrarModalAgregar] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      cargarDepositos();
      cargarProductos();
    }
  }, [user]);

  useEffect(() => {
    if (depositoSeleccionado) {
      cargarStock();
    }
  }, [depositoSeleccionado]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (depositoSeleccionado) {
        cargarStock();
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [busqueda]);

  const cargarDepositos = async () => {
    try {
      const response = await api.get<Deposito[]>('/depositos');
      setDepositos(response.data);
      if (response.data.length > 0 && !depositoSeleccionado) {
        setDepositoSeleccionado(response.data[0].id);
      }
    } catch (error: any) {
      toast.error('Error al cargar depósitos');
    }
  };

  const cargarProductos = async () => {
    try {
      const response = await api.get<Producto[]>('/productos?activo=true');
      setProductos(response.data);
    } catch (error: any) {
      toast.error('Error al cargar productos');
    }
  };

  const cargarStock = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (depositoSeleccionado) params.append('depositoId', depositoSeleccionado);
      if (busqueda) params.append('productoId', busqueda);

      const response = await api.get<StockDepositoCompleto[]>(`/stock-deposito?${params.toString()}`);
      
      // Filtrar por búsqueda si es texto
      let stocksFiltrados = response.data;
      if (busqueda && !busqueda.match(/^[0-9a-f-]{36}$/i)) {
        stocksFiltrados = response.data.filter((s) =>
          s.producto?.nombre?.toLowerCase().includes(busqueda.toLowerCase())
        );
      }
      
      setStocks(stocksFiltrados);
    } catch (error: any) {
      toast.error('Error al cargar stock');
    } finally {
      setLoading(false);
    }
  };

  // Función eliminada - no se usa
  // const cargarAlertasStock = async () => {
  //   try {
  //     const params = new URLSearchParams();
  //     if (depositoSeleccionado) params.append('depositoId', depositoSeleccionado);
  //     const response = await api.get<StockDepositoCompleto[]>(
  //       `/stock-deposito/alerts/bajo-stock?${params.toString()}`
  //     );
  //     return response.data;
  //   } catch (error) {
  //     return [];
  //   }
  // };

  const actualizarStock = async (stockId: string, cantidad: number, stockMinimo: number) => {
    try {
      await api.put(`/stock-deposito/${stockId}`, { cantidad, stockMinimo });
      toast.success('Stock actualizado exitosamente');
      cargarStock();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al actualizar stock');
    }
  };

  const agregarProductoAlDeposito = async (productoId: string, cantidad: number, stockMinimo: number) => {
    if (!depositoSeleccionado) {
      toast.error('Selecciona un depósito primero');
      return;
    }

    try {
      await api.post('/stock-deposito', {
        productoId,
        depositoId: depositoSeleccionado,
        cantidad,
        stockMinimo,
      });
      toast.success('Producto agregado al depósito exitosamente');
      setMostrarModalAgregar(false);
      cargarStock();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al agregar producto');
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

  const stocksBajo = stocks.filter(
    (s) => s.cantidad <= s.stockMinimo && s.stockMinimo > 0
  );

  return (
    <Layout>
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Stock en Depósito</h1>
            <p className="mt-2 text-sm text-gray-600">Gestiona el inventario en depósitos centrales</p>
          </div>
          <button
            onClick={() => setMostrarModalAgregar(true)}
            disabled={!depositoSeleccionado}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5 mr-2" />
            Agregar Producto
          </button>
        </div>

        {/* Filtros */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar producto..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div className="relative sm:w-64">
            <Warehouse className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={depositoSeleccionado}
              onChange={(e) => setDepositoSeleccionado(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 appearance-none bg-white"
            >
              <option value="">Seleccionar depósito</option>
              {depositos.map((dep) => (
                <option key={dep.id} value={dep.id}>
                  {dep.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Alertas de stock bajo */}
        {mostrarAlertaStock && stocksBajo.length > 0 && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-red-900">
                    {stocksBajo.length} producto{stocksBajo.length !== 1 ? 's' : ''} con stock bajo
                  </h3>
                  <p className="text-sm text-red-700 mt-1">
                    Estos productos están por debajo del stock mínimo
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMostrarAlertaStock(false)}
                className="text-red-600 hover:text-red-800"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando stock...</p>
          </div>
        ) : stocks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay stock</h3>
            <p className="text-gray-600">
              {depositoSeleccionado
                ? 'No hay productos con stock en este depósito'
                : 'Selecciona un depósito para ver su stock'}
            </p>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock Actual
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock Mínimo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stocks.map((stock) => {
                  const esStockBajo = stock.cantidad <= stock.stockMinimo && stock.stockMinimo > 0;
                  return (
                    <tr
                      key={stock.id}
                      className={esStockBajo ? 'bg-red-50' : ''}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Package className="w-5 h-5 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {stock.producto?.nombre || 'Producto desconocido'}
                            </div>
                            {stock.producto?.codigoBarras && (
                              <div className="text-sm text-gray-500">
                                {stock.producto.codigoBarras}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-xl font-bold ${esStockBajo ? 'text-red-600' : 'text-green-600'}`}>
                          {stock.cantidad}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {stock.stockMinimo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {esStockBajo ? (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            Stock Bajo
                          </span>
                        ) : (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Normal
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <EditarStockModal
                          stock={stock}
                          onUpdate={(cantidad, stockMinimo) =>
                            actualizarStock(stock.id, cantidad, stockMinimo)
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal Agregar Producto */}
        {mostrarModalAgregar && (
          <ModalAgregarProducto
            depositos={depositos}
            depositoSeleccionado={depositoSeleccionado || ''}
            productos={productos}
            stocksExistentes={stocks}
            onClose={() => setMostrarModalAgregar(false)}
            onSave={agregarProductoAlDeposito}
          />
        )}
      </div>
    </Layout>
  );
}

function EditarStockModal({
  stock,
  onUpdate,
}: {
  stock: StockDepositoCompleto;
  onUpdate: (cantidad: number, stockMinimo: number) => void;
}) {
  const [mostrarModal, setMostrarModal] = useState(false);
  const [cantidad, setCantidad] = useState(stock.cantidad);
  const [stockMinimo, setStockMinimo] = useState(stock.stockMinimo);

  const handleGuardar = () => {
    if (cantidad < 0 || stockMinimo < 0) {
      toast.error('Los valores no pueden ser negativos');
      return;
    }
    onUpdate(cantidad, stockMinimo);
    setMostrarModal(false);
  };

  return (
    <>
      <button
        onClick={() => setMostrarModal(true)}
        className="text-green-600 hover:text-green-900"
      >
        <Edit className="w-5 h-5 inline" />
      </button>

      {mostrarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Editar Stock</h2>
            <p className="text-sm text-gray-600 mb-4">{stock.producto?.nombre}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad Actual
                </label>
                <input
                  type="number"
                  value={cantidad}
                  onChange={(e) => setCantidad(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock Mínimo
                </label>
                <input
                  type="number"
                  value={stockMinimo}
                  onChange={(e) => setStockMinimo(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  min="0"
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
                onClick={handleGuardar}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ModalAgregarProducto({
  depositos,
  depositoSeleccionado,
  productos,
  stocksExistentes,
  onClose,
  onSave,
}: {
  depositos: Deposito[];
  depositoSeleccionado: string;
  productos: Producto[];
  stocksExistentes: StockDepositoCompleto[];
  onClose: () => void;
  onSave: (productoId: string, cantidad: number, stockMinimo: number) => void;
}) {
  const [productoId, setProductoId] = useState('');
  const [cantidad, setCantidad] = useState(0);
  const [stockMinimo, setStockMinimo] = useState(0);

  // Filtrar productos que ya tienen stock en este depósito
  const productosDisponibles = productos.filter(
    (p) => !stocksExistentes.some((s) => s.productoId === p.id && s.depositoId === depositoSeleccionado)
  );

  const handleGuardar = () => {
    if (!productoId) {
      toast.error('Selecciona un producto');
      return;
    }

    if (cantidad < 0 || stockMinimo < 0) {
      toast.error('Los valores no pueden ser negativos');
      return;
    }

    onSave(productoId, cantidad, stockMinimo);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Agregar Producto al Depósito</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Depósito
            </label>
            <select
              value={depositoSeleccionado}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
            >
              {depositos.map((dep) => (
                <option key={dep.id} value={dep.id}>
                  {dep.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Producto *
            </label>
            <select
              value={productoId}
              onChange={(e) => setProductoId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="">Seleccionar producto</option>
              {productosDisponibles.map((producto) => (
                <option key={producto.id} value={producto.id}>
                  {producto.nombre} {producto.codigoBarras && `(${producto.codigoBarras})`}
                </option>
              ))}
            </select>
            {productosDisponibles.length === 0 && (
              <p className="text-sm text-gray-500 mt-1">
                Todos los productos ya tienen stock en este depósito
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cantidad Inicial *
            </label>
            <input
              type="number"
              value={cantidad}
              onChange={(e) => setCantidad(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              min="0"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stock Mínimo
            </label>
            <input
              type="number"
              value={stockMinimo}
              onChange={(e) => setStockMinimo(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              min="0"
              placeholder="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              Se enviará una alerta cuando el stock esté por debajo de este valor
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={!productoId || productosDisponibles.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}

