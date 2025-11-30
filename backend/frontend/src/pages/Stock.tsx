import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api, isDatabaseError } from '../utils/api';
import { Stock as StockType, Producto } from '../types';
import { Package, AlertTriangle, TrendingUp, History, Clock, UserCheck, Filter, Calendar, Building2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const Stock = () => {
  const { user } = useAuth();
  const [stocks, setStocks] = useState<(StockType & { producto: Producto; local?: { id: string; nombre: string } })[]>([]);
  const [locales, setLocales] = useState<any[]>([]);
  const [localFiltro, setLocalFiltro] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<'todos' | 'bajo' | 'critico'>('todos');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [stockEditando, setStockEditando] = useState<StockType | null>(null);
  const [cantidad, setCantidad] = useState('');
  const [tipoMovimiento, setTipoMovimiento] = useState<'entrada' | 'salida' | 'ajuste'>('entrada');
  const [loadingActualizacion, setLoadingActualizacion] = useState(false);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [historialActividades, setHistorialActividades] = useState<any[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [fechaInicioHistorial, setFechaInicioHistorial] = useState('');
  const [fechaFinHistorial, setFechaFinHistorial] = useState('');

  useEffect(() => {
    cargarStock();
    if (user?.role === 'ADMIN') {
      cargarLocales();
    }
  }, []);

  useEffect(() => {
    cargarStock();
  }, [localFiltro]);

  const cargarLocales = async () => {
    try {
      const response = await api.get('/locales');
      setLocales(response.data.locales || []);
    } catch (error: any) {
      console.error('Error al cargar locales:', error);
    }
  };

  const cargarStock = async () => {
    try {
      setLoading(true);
      // Para ADMIN: usar filtro de local si está seleccionado
      // Para VENDEDOR: el backend automáticamente filtra por el local del turno activo
      let url = '/stock';
      if (user?.role === 'ADMIN' && localFiltro) {
        url = `/stock?localId=${localFiltro}`;
      }
      const response = await api.get(url);
      setStocks(response.data.stocks || []);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Error al cargar stock';
      if (!isDatabaseError(error)) {
        toast.error(errorMessage);
      }
      console.error('Error al cargar stock:', error);
    } finally {
      setLoading(false);
    }
  };

  const validarStock = () => {
    if (!stockEditando) {
      toast.error('Selecciona un producto para actualizar su stock');
      return false;
    }

    if (!cantidad || cantidad.trim() === '') {
      toast.error('Ingresa una cantidad');
      return false;
    }

    const cantidadNum = Number(cantidad);
    
    if (isNaN(cantidadNum) || cantidadNum < 0) {
      toast.error('La cantidad debe ser un número positivo');
      return false;
    }

    // Validar que sea un entero
    if (!Number.isInteger(cantidadNum)) {
      toast.error('La cantidad debe ser un número entero (sin decimales)');
      return false;
    }

    // Calcular nueva cantidad para validación local
    const nuevaCantidad =
      tipoMovimiento === 'entrada'
        ? stockEditando.cantidad + cantidadNum
        : tipoMovimiento === 'salida'
        ? stockEditando.cantidad - cantidadNum
        : cantidadNum;

    if (nuevaCantidad < 0) {
      toast.error('La cantidad resultante no puede ser negativa');
      return false;
    }

    // Validar que no se retire más stock del disponible (solo para salidas)
    if (tipoMovimiento === 'salida' && cantidadNum > stockEditando.cantidad) {
      toast.error(`No hay suficiente stock. Disponible: ${stockEditando.cantidad}, Solicitado: ${cantidadNum}`);
      return false;
    }

    return true;
  };

  const confirmarActualizacion = () => {
    if (!validarStock()) return;

    // Ejecutar actualización directamente
    ejecutarActualizacion();
  };

  const ejecutarActualizacion = async () => {
    if (!stockEditando || !validarStock()) return;

    const cantidadNum = Number(cantidad);

    setLoadingActualizacion(true);

    try {
      await api.put(`/stock/${stockEditando.productoId}/${stockEditando.localId}`, {
        cantidad: cantidadNum,
        tipoMovimiento,
        cantidadAnterior: stockEditando.cantidad,
      });

      toast.success('Stock actualizado exitosamente');
      cargarStock();
      setMostrarFormulario(false);
      setStockEditando(null);
      setCantidad('');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Error al actualizar stock';
      if (!isDatabaseError(error)) {
        toast.error(errorMessage);
      }
      console.error('Error al actualizar stock:', error);
    } finally {
      setLoadingActualizacion(false);
    }
  };

  const cargarHistorial = async (fechaInicio?: string, fechaFin?: string) => {
    if (user?.role !== 'ADMIN') return;
    
    try {
      setLoadingHistorial(true);
      const params = new URLSearchParams();
      params.append('tabla', 'STOCK');
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

  const stocksFiltrados = stocks.filter((stock) => {
    if (filtro === 'bajo') {
      return stock.cantidad <= stock.stock_minimo && stock.cantidad > 0;
    }
    if (filtro === 'critico') {
      return stock.cantidad === 0;
    }
    return true;
  });

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
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Stock</h1>
          <p className="text-gray-600">
            {user?.role === 'ADMIN' ? 'Stock de todos los locales' : `Stock de ${user?.local?.nombre}`}
          </p>
        </div>
        {user?.role === 'ADMIN' && (
          <button
            onClick={abrirHistorial}
            className="btn btn-secondary flex items-center gap-2"
          >
            <History className="h-5 w-5" />
            Ver Historial
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="space-y-4">
          {/* Filtro por local (solo ADMIN) */}
          {user?.role === 'ADMIN' && (
            <div>
              <label className="label">Filtrar por Local</label>
              <select
                value={localFiltro}
                onChange={(e) => setLocalFiltro(e.target.value)}
                className="input"
              >
                <option value="">Todos los locales</option>
                {locales.map((local) => (
                  <option key={local.id} value={local.id}>
                    {local.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Filtros de estado */}
          <div className="flex gap-2">
            <button
              onClick={() => setFiltro('todos')}
              className={`btn ${filtro === 'todos' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Todos
            </button>
            <button
              onClick={() => setFiltro('bajo')}
              className={`btn ${filtro === 'bajo' ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2`}
            >
              <AlertTriangle className="h-4 w-4" />
              Stock Bajo
            </button>
            <button
              onClick={() => setFiltro('critico')}
              className={`btn ${filtro === 'critico' ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2`}
            >
              <AlertTriangle className="h-4 w-4" />
              Sin Stock
            </button>
          </div>
        </div>
      </div>

      {/* Formulario de actualización */}
      {mostrarFormulario && stockEditando && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Actualizar Stock</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Producto</label>
              <input
                type="text"
                value={stockEditando.producto?.nombre || ''}
                disabled
                className="input bg-gray-50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Stock Actual</label>
                <input
                  type="text"
                  value={stockEditando.cantidad}
                  disabled
                  className="input bg-gray-50 font-semibold"
                />
              </div>
              <div>
                <label className="label">Stock Mínimo</label>
                <input
                  type="text"
                  value={stockEditando.stock_minimo}
                  disabled
                  className="input bg-gray-50"
                />
              </div>
            </div>

            <div>
              <label className="label">Tipo de Movimiento</label>
              <select
                value={tipoMovimiento}
                onChange={(e) => {
                  setTipoMovimiento(e.target.value as any);
                  setCantidad(''); // Limpiar cantidad al cambiar tipo
                }}
                className="input"
              >
                <option value="entrada">Entrada (+)</option>
                <option value="salida">Salida (-)</option>
                <option value="ajuste">Ajuste Manual (=)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {tipoMovimiento === 'entrada' && 'Sumará la cantidad al stock actual'}
                {tipoMovimiento === 'salida' && 'Restará la cantidad del stock actual'}
                {tipoMovimiento === 'ajuste' && 'Establecerá la cantidad exacta (reemplaza el stock actual)'}
              </p>
            </div>

            <div>
              <label className="label">
                {tipoMovimiento === 'ajuste' ? 'Nueva Cantidad Total' : 'Cantidad'}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={cantidad}
                onChange={(e) => {
                  const value = e.target.value;
                  // Solo permitir números enteros (sin decimales)
                  if (value === '' || /^\d+$/.test(value)) {
                    setCantidad(value);
                  }
                }}
                onKeyDown={(e) => {
                  // Permitir Enter para confirmar
                  if (e.key === 'Enter' && cantidad && !isNaN(Number(cantidad)) && Number(cantidad) >= 0) {
                    e.preventDefault();
                    confirmarActualizacion();
                    return;
                  }
                  // Prevenir entrada de caracteres no numéricos excepto backspace, delete, tab, enter, arrow keys
                  const allowedKeys = [
                    'Backspace', 'Delete', 'Tab', 'Enter', 'Escape',
                    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
                    'Home', 'End'
                  ];
                  const isNumber = /^[0-9]$/.test(e.key);
                  const isAllowed = allowedKeys.includes(e.key) || 
                                   (e.ctrlKey && (e.key === 'a' || e.key === 'c' || e.key === 'v' || e.key === 'x'));
                  if (!isNumber && !isAllowed && !e.shiftKey) {
                    e.preventDefault();
                  }
                  // Escape para cancelar
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setMostrarFormulario(false);
                    setStockEditando(null);
                    setCantidad('');
                  }
                }}
                min="0"
                step="1"
                className="input text-lg font-semibold"
                placeholder={tipoMovimiento === 'ajuste' ? `Nueva cantidad (ej: ${stockEditando.cantidad})` : 'Cantidad (solo enteros)'}
                autoFocus
              />
              {cantidad && !isNaN(Number(cantidad)) && Number(cantidad) >= 0 && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-800">
                    <strong>Resultado:</strong>{' '}
                    {tipoMovimiento === 'entrada' && (
                      <span>{stockEditando.cantidad} + {Number(cantidad)} = <strong>{stockEditando.cantidad + Number(cantidad)}</strong></span>
                    )}
                    {tipoMovimiento === 'salida' && (
                      <span>
                        {stockEditando.cantidad} - {Number(cantidad)} = <strong>{Math.max(0, stockEditando.cantidad - Number(cantidad))}</strong>
                        {stockEditando.cantidad - Number(cantidad) < 0 && (
                          <span className="text-red-600 ml-2">⚠️ Stock insuficiente</span>
                        )}
                      </span>
                    )}
                    {tipoMovimiento === 'ajuste' && (
                      <span>Stock será = <strong>{Number(cantidad)}</strong></span>
                    )}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button 
                onClick={confirmarActualizacion} 
                className="btn btn-primary flex-1"
                disabled={!cantidad || cantidad.trim() === '' || isNaN(Number(cantidad)) || Number(cantidad) < 0 || loadingActualizacion}
              >
                {loadingActualizacion ? 'Procesando...' : 'Actualizar Stock (Enter)'}
              </button>
              <button
                onClick={() => {
                  setMostrarFormulario(false);
                  setStockEditando(null);
                  setCantidad('');
                }}
                className="btn btn-secondary"
                title="Escape para cancelar"
                disabled={loadingActualizacion}
              >
                Cancelar (Esc)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabla de stock */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3">Producto</th>
                <th className="text-left p-3">Código Barras</th>
                {user?.role === 'ADMIN' && <th className="text-left p-3">Local</th>}
                <th className="text-right p-3">Stock Actual</th>
                <th className="text-right p-3">Stock Mínimo</th>
                <th className="text-center p-3">Estado</th>
                <th className="text-right p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {stocksFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={user?.role === 'ADMIN' ? 7 : 6} className="text-center p-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>No hay stock disponible</p>
                  </td>
                </tr>
              ) : (
                stocksFiltrados.map((stock) => {
                  const estado =
                    stock.cantidad === 0
                      ? 'critico'
                      : stock.cantidad <= stock.stock_minimo
                      ? 'bajo'
                      : 'normal';

                  return (
                    <tr key={stock.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-semibold">{stock.producto?.nombre}</td>
                      <td className="p-3 text-sm text-gray-600">
                        {stock.producto?.codigo_barras || '-'}
                      </td>
                      {user?.role === 'ADMIN' && (
                        <td className="p-3">{stock.local?.nombre || '-'}</td>
                      )}
                      <td className="p-3 text-right font-semibold">{stock.cantidad}</td>
                      <td className="p-3 text-right">{stock.stock_minimo}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            estado === 'critico'
                              ? 'bg-red-100 text-red-800'
                              : estado === 'bajo'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {estado === 'critico' ? 'Crítico' : estado === 'bajo' ? 'Bajo' : 'Normal'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setStockEditando(stock);
                              setMostrarFormulario(true);
                              setCantidad('');
                              setTipoMovimiento('entrada');
                            }}
                            className="btn-icon text-blue-600 hover:text-blue-700"
                            title="Actualizar stock"
                          >
                            <TrendingUp className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Historial */}
      {mostrarHistorial && user?.role === 'ADMIN' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <History className="h-6 w-6 text-primary-600" />
                <h2 className="text-2xl font-bold text-gray-900">Historial de Stock</h2>
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
                  {historialActividades.map((actividad) => {
                    const datosAnteriores = actividad.datos_anteriores;
                    const datosNuevos = actividad.datos_nuevos;
                    const cambio = datosAnteriores && datosNuevos 
                      ? Number(datosNuevos.cantidad || 0) - Number(datosAnteriores.cantidad || 0)
                      : 0;

                    return (
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
                              <TrendingUp className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-semibold text-gray-900">
                                  {datosNuevos?.producto?.nombre || datosAnteriores?.producto?.nombre || 'Producto'}
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
                              {actividad.accion === 'ACTUALIZAR' && datosAnteriores && datosNuevos && (
                                <div className="mt-2 space-y-1 text-sm">
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-600">Cantidad:</span>
                                    <span className="text-gray-400">{Number(datosAnteriores.cantidad || 0)}</span>
                                    <span className="text-gray-400">→</span>
                                    <span className="font-semibold text-gray-900">{Number(datosNuevos.cantidad || 0)}</span>
                                    {cambio !== 0 && (
                                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                                        cambio > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                      }`}>
                                        {cambio > 0 ? '+' : ''}{cambio}
                                      </span>
                                    )}
                                  </div>
                                  {datosNuevos.local && (
                                    <div className="flex items-center gap-1 text-gray-600">
                                      <Building2 className="h-3 w-3" />
                                      <span>{datosNuevos.local.nombre}</span>
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
                    );
                  })}
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

export default Stock;

