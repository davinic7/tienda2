import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Layout from '@/components/Layout';
import type { Stock, Producto, Local } from '@shared/types';
import { Package, AlertTriangle, TrendingUp, TrendingDown, Edit2, Filter } from 'lucide-react';

interface StockCompleto extends Stock {
  producto: Producto;
  local: Local;
}

export default function Stock() {
  const { user } = useAuthStore();
  const [stocks, setStocks] = useState<StockCompleto[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarBajo, setMostrarBajo] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [stockEditar, setStockEditar] = useState<StockCompleto | null>(null);
  const [tipoActualizacion, setTipoActualizacion] = useState<'ENTRADA' | 'SALIDA' | 'AJUSTE'>('ENTRADA');
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    cargarStock();
  }, [mostrarBajo]);

  const cargarStock = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (mostrarBajo) params.append('stockBajo', 'true');
      
      const response = await api.get<StockCompleto[]>(`/stock?${params.toString()}`);
      setStocks(response.data);
    } catch (error: any) {
      toast.error('Error al cargar stock');
    } finally {
      setLoading(false);
    }
  };

  const abrirModalActualizar = (stock: StockCompleto) => {
    setStockEditar(stock);
    setTipoActualizacion('ENTRADA');
    setCantidad('');
    setMotivo('');
    setMostrarModal(true);
  };

  const actualizarStock = async () => {
    if (!stockEditar || !cantidad || parseInt(cantidad) <= 0) {
      toast.error('Ingresa una cantidad válida');
      return;
    }

    try {
      await api.put('/stock/actualizar', {
        productoId: stockEditar.productoId,
        cantidad: parseInt(cantidad),
        tipo: tipoActualizacion,
        motivo: motivo || undefined,
      });
      toast.success('Stock actualizado exitosamente');
      setMostrarModal(false);
      cargarStock();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al actualizar stock');
    }
  };

  const actualizarStockMinimo = async (productoId: string, localId: string, stockMinimo: number) => {
    try {
      await api.put(`/stock/${productoId}/${localId}/minimo`, {
        stockMinimo,
      });
      toast.success('Stock mínimo actualizado');
      cargarStock();
    } catch (error: any) {
      toast.error('Error al actualizar stock mínimo');
    }
  };

  const stockBajo = stocks.filter((s) => s.cantidad <= s.stockMinimo);

  return (
    <Layout>
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Stock</h1>
            <p className="text-gray-600 mt-1">Gestión de inventario</p>
          </div>
          <div className="flex items-center space-x-3">
            {stockBajo.length > 0 && (
              <div className="flex items-center px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                <span className="text-sm font-medium text-red-800">
                  {stockBajo.length} producto(s) con stock bajo
                </span>
              </div>
            )}
            <button
              onClick={() => setMostrarBajo(!mostrarBajo)}
              className={`flex items-center px-4 py-2 border rounded-lg transition-colors ${
                mostrarBajo
                  ? 'bg-green-50 border-green-300 text-green-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-5 h-5 mr-2" />
              {mostrarBajo ? 'Mostrar Todo' : 'Stock Bajo'}
            </button>
          </div>
        </div>

        {/* Lista de stock */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : stocks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No se encontraron productos en stock</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stocks.map((stock) => {
              const esStockBajo = stock.cantidad <= stock.stockMinimo;
              return (
                <div
                  key={stock.id}
                  className={`bg-white rounded-xl border-2 p-6 hover:shadow-lg transition-shadow ${
                    esStockBajo ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{stock.producto.nombre}</h3>
                      {stock.producto.codigoBarras && (
                        <p className="text-xs text-gray-500 mb-2">Código: {stock.producto.codigoBarras}</p>
                      )}
                      {user?.role === 'ADMIN' && (
                        <p className="text-sm text-gray-600">Local: {stock.local.nombre}</p>
                      )}
                    </div>
                    {esStockBajo && (
                      <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Stock actual:</span>
                      <span className={`text-xl font-bold ${esStockBajo ? 'text-red-600' : 'text-green-600'}`}>
                        {stock.cantidad}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Stock mínimo:</span>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          value={stock.stockMinimo}
                          onChange={(e) => {
                            const nuevoMinimo = parseInt(e.target.value) || 0;
                            if (nuevoMinimo !== stock.stockMinimo && nuevoMinimo >= 0) {
                              actualizarStockMinimo(stock.productoId, stock.localId, nuevoMinimo);
                            }
                          }}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:ring-2 focus:ring-green-500"
                          min="0"
                        />
                      </div>
                    </div>
                    {esStockBajo && (
                      <div className="p-2 bg-red-100 rounded text-xs text-red-800 font-medium text-center">
                        ¡Stock por debajo del mínimo!
                      </div>
                    )}
                    <button
                      onClick={() => abrirModalActualizar(stock)}
                      className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Actualizar Stock
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal de actualización */}
        {mostrarModal && stockEditar && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div
                className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                onClick={() => setMostrarModal(false)}
              />
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Actualizar Stock</h3>
                    <button
                      onClick={() => setMostrarModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-1">Producto:</p>
                    <p className="font-semibold text-gray-900">{stockEditar.producto.nombre}</p>
                    <p className="text-sm text-gray-500 mt-1">Stock actual: {stockEditar.cantidad}</p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de operación</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['ENTRADA', 'SALIDA', 'AJUSTE'] as const).map((tipo) => (
                          <button
                            key={tipo}
                            onClick={() => setTipoActualizacion(tipo)}
                            className={`px-4 py-2 border rounded-lg font-medium transition-colors ${
                              tipoActualizacion === tipo
                                ? 'bg-green-600 text-white border-green-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {tipo === 'ENTRADA' && <TrendingUp className="w-4 h-4 inline mr-1" />}
                            {tipo === 'SALIDA' && <TrendingDown className="w-4 h-4 inline mr-1" />}
                            {tipo === 'AJUSTE' && <Edit2 className="w-4 h-4 inline mr-1" />}
                            {tipo}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad *</label>
                      <input
                        type="number"
                        value={cantidad}
                        onChange={(e) => setCantidad(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        min="1"
                        required
                      />
                      {tipoActualizacion === 'SALIDA' && stockEditar && (
                        <p className="text-xs text-gray-500 mt-1">
                          Stock después: {stockEditar.cantidad - (parseInt(cantidad) || 0)}
                        </p>
                      )}
                      {tipoActualizacion === 'ENTRADA' && stockEditar && (
                        <p className="text-xs text-gray-500 mt-1">
                          Stock después: {stockEditar.cantidad + (parseInt(cantidad) || 0)}
                        </p>
                      )}
                      {tipoActualizacion === 'AJUSTE' && (
                        <p className="text-xs text-gray-500 mt-1">
                          Stock será ajustado a: {cantidad}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Motivo (opcional)</label>
                      <input
                        type="text"
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        placeholder="Ej: Compra, Devolución, etc."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    onClick={actualizarStock}
                    className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 sm:ml-3 sm:w-auto"
                  >
                    Actualizar
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

