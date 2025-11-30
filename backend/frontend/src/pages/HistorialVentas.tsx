import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { Venta, Local, User } from '../types';
import { Receipt, Eye, Printer, Filter, X, History, Calendar, Building2, UserCheck, TrendingUp, Clock, Download, Search, CreditCard, DollarSign, Lock, Unlock } from 'lucide-react';
import Ticket from '../components/Ticket';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { handleError, getErrorMessage } from '../utils/errorHandler';

const HistorialVentas = () => {
  const { user } = useAuth();
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [ventaSeleccionada, setVentaSeleccionada] = useState<Venta | null>(null);
  const [mostrarTicket, setMostrarTicket] = useState(false);
  
  // Filtros
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [tipoMovimiento, setTipoMovimiento] = useState<string>('TODOS'); // VENTA, APERTURA_CAJA, CIERRE_CAJA, TODOS
  const [localId, setLocalId] = useState('');
  const [vendedorId, setVendedorId] = useState('');
  const [metodoPago, setMetodoPago] = useState('');
  const [busquedaTexto, setBusquedaTexto] = useState('');
  
  // Datos
  const [turnos, setTurnos] = useState<any[]>([]);
  
  // Opciones para filtros
  const [locales, setLocales] = useState<Local[]>([]);
  const [vendedores, setVendedores] = useState<User[]>([]);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      cargarLocales();
      cargarVendedores();
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      cargarVentas();
      cargarTurnos();
    } else {
      cargarVentas();
    }
  }, [fechaInicio, fechaFin, horaInicio, horaFin, localId, vendedorId, metodoPago, user]);

  const cargarLocales = async () => {
    try {
      const response = await api.get('/locales');
      setLocales(response.data.locales || []);
    } catch (error: any) {
      console.error('Error al cargar locales:', error);
    }
  };

  const cargarVendedores = async () => {
    try {
      const response = await api.get('/usuarios');
      const usuarios = response.data.usuarios || [];
      setVendedores(usuarios.filter((u: User) => u.role === 'VENDEDOR'));
    } catch (error: any) {
      console.error('Error al cargar vendedores:', error);
    }
  };

  const cargarVentas = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (fechaInicio) {
        // Combinar fecha y hora si están disponibles
        let fechaInicioCompleta = fechaInicio;
        if (horaInicio) {
          fechaInicioCompleta = `${fechaInicio}T${horaInicio}:00`;
        }
        params.append('fechaInicio', fechaInicioCompleta);
      }
      if (fechaFin) {
        let fechaFinCompleta = fechaFin;
        if (horaFin) {
          fechaFinCompleta = `${fechaFin}T${horaFin}:59`;
        } else {
          fechaFinCompleta = `${fechaFin}T23:59:59`;
        }
        params.append('fechaFin', fechaFinCompleta);
      }
      if (localId) params.append('localId', localId);
      if (vendedorId) params.append('vendedorId', vendedorId);
      if (metodoPago) params.append('metodoPago', metodoPago);

      const response = await api.get(`/ventas?${params.toString()}`);
      setVentas(response.data.ventas || []);
    } catch (error: any) {
      handleError(error, 'CARGAR VENTAS');
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const cargarTurnos = async () => {
    try {
      const params = new URLSearchParams();
      if (fechaInicio) {
        let fechaInicioCompleta = fechaInicio;
        if (horaInicio) {
          fechaInicioCompleta = `${fechaInicio}T${horaInicio}:00`;
        }
        params.append('fechaInicio', fechaInicioCompleta);
      }
      if (fechaFin) {
        let fechaFinCompleta = fechaFin;
        if (horaFin) {
          fechaFinCompleta = `${fechaFin}T${horaFin}:59`;
        } else {
          fechaFinCompleta = `${fechaFin}T23:59:59`;
        }
        params.append('fechaFin', fechaFinCompleta);
      }
      if (localId) params.append('localId', localId);

      const response = await api.get(`/turnos?${params.toString()}`);
      setTurnos(response.data.turnos || []);
    } catch (error: any) {
      console.error('Error al cargar turnos:', error);
    }
  };

  const verDetalleVenta = async (ventaId: string) => {
    try {
      const response = await api.get(`/ventas/${ventaId}`);
      setVentaSeleccionada(response.data.venta);
    } catch (error: any) {
      handleError(error, 'VER DETALLE VENTA');
      toast.error(getErrorMessage(error));
    }
  };


  const limpiarFiltros = () => {
    setFechaInicio('');
    setFechaFin('');
    setHoraInicio('');
    setHoraFin('');
    setTipoMovimiento('TODOS');
    setLocalId('');
    setVendedorId('');
    setMetodoPago('');
    setBusquedaTexto('');
  };

  // Combinar ventas y turnos en un solo array ordenado por fecha
  const obtenerMovimientosCombinados = () => {
    const movimientos: any[] = [];

    // Agregar ventas
    ventas.forEach(venta => {
      if (tipoMovimiento === 'TODOS' || tipoMovimiento === 'VENTA') {
        if (!busquedaTexto || 
            venta.cliente?.nombre?.toLowerCase().includes(busquedaTexto.toLowerCase()) ||
            venta.local?.nombre?.toLowerCase().includes(busquedaTexto.toLowerCase()) ||
            venta.vendedor?.nombre?.toLowerCase().includes(busquedaTexto.toLowerCase()) ||
            venta.id.toLowerCase().includes(busquedaTexto.toLowerCase())) {
          movimientos.push({
            tipo: 'VENTA',
            id: venta.id,
            fecha: venta.fecha,
            data: venta
          });
        }
      }
    });

    // Agregar aperturas de turno
    turnos.forEach(turno => {
      if (tipoMovimiento === 'TODOS' || tipoMovimiento === 'APERTURA_CAJA') {
        if (!vendedorId || turno.vendedorId === vendedorId) {
          if (!busquedaTexto || 
              turno.local?.nombre?.toLowerCase().includes(busquedaTexto.toLowerCase()) ||
              turno.vendedor?.nombre?.toLowerCase().includes(busquedaTexto.toLowerCase()) ||
              turno.id.toLowerCase().includes(busquedaTexto.toLowerCase())) {
            movimientos.push({
              tipo: 'APERTURA_CAJA',
              id: turno.id,
              fecha: turno.fecha_apertura,
              data: turno
            });
          }
        }
      }

      // Agregar cierres de turno
      if (turno.fecha_cierre && (tipoMovimiento === 'TODOS' || tipoMovimiento === 'CIERRE_CAJA')) {
        if (!vendedorId || turno.vendedorId === vendedorId) {
          if (!busquedaTexto || 
              turno.local?.nombre?.toLowerCase().includes(busquedaTexto.toLowerCase()) ||
              turno.vendedor?.nombre?.toLowerCase().includes(busquedaTexto.toLowerCase()) ||
              turno.id.toLowerCase().includes(busquedaTexto.toLowerCase())) {
            movimientos.push({
              tipo: 'CIERRE_CAJA',
              id: `${turno.id}-cierre`,
              fecha: turno.fecha_cierre,
              data: turno
            });
          }
        }
      }
    });

    // Ordenar por fecha descendente
    return movimientos.sort((a, b) => 
      new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );
  };

  const exportarCSV = () => {
    const movimientos = obtenerMovimientosCombinados();
    const datos = movimientos.map(m => {
      if (m.tipo === 'VENTA') {
        const venta = m.data;
        return {
          tipo: 'VENTA',
          fecha: format(new Date(m.fecha), 'dd/MM/yyyy HH:mm:ss', { locale: es }),
          local: venta.local?.nombre || '',
          vendedor: venta.vendedor?.nombre || '',
          cliente: venta.cliente?.nombre || 'Sin cliente',
          total: Number(venta.total).toFixed(2),
          metodoPago: venta.metodoPago || '',
          efectivoRecibido: venta.efectivoRecibido ? Number(venta.efectivoRecibido).toFixed(2) : '',
          creditoUsado: venta.creditoUsado ? Number(venta.creditoUsado).toFixed(2) : '0.00'
        };
      } else if (m.tipo === 'APERTURA_CAJA') {
        const turno = m.data;
        return {
          tipo: 'APERTURA DE CAJA',
          fecha: format(new Date(m.fecha), 'dd/MM/yyyy HH:mm:ss', { locale: es }),
          local: turno.local?.nombre || '',
          vendedor: turno.vendedor?.nombre || '',
          cliente: '',
          total: Number(turno.efectivo_inicial).toFixed(2),
          metodoPago: 'EFECTIVO_INICIAL',
          efectivoRecibido: '',
          creditoUsado: ''
        };
      } else {
        const turno = m.data;
        return {
          tipo: 'CIERRE DE CAJA',
          fecha: format(new Date(m.fecha), 'dd/MM/yyyy HH:mm:ss', { locale: es }),
          local: turno.local?.nombre || '',
          vendedor: turno.vendedor?.nombre || '',
          cliente: '',
          total: turno.efectivo_final ? Number(turno.efectivo_final).toFixed(2) : '',
          metodoPago: 'EFECTIVO_FINAL',
          efectivoRecibido: turno.efectivo_esperado ? Number(turno.efectivo_esperado).toFixed(2) : '',
          creditoUsado: turno.diferencia ? Number(turno.diferencia).toFixed(2) : ''
        };
      }
    });

    const headers = ['Tipo', 'Fecha', 'Local', 'Vendedor', 'Cliente', 'Total', 'Método de Pago', 'Efectivo Esperado/Recibido', 'Diferencia/Crédito'];
    const csv = [
      headers.join(','),
      ...datos.map(d => [
        `"${d.tipo}"`,
        `"${d.fecha}"`,
        `"${d.local}"`,
        `"${d.vendedor}"`,
        `"${d.cliente}"`,
        `"${d.total}"`,
        `"${d.metodoPago}"`,
        `"${d.efectivoRecibido}"`,
        `"${d.creditoUsado}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historial-ventas-caja-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Historial exportado exitosamente');
  };

  const movimientosCombinados = obtenerMovimientosCombinados();
  
  // Calcular estadísticas
  const estadisticas = {
    totalVentas: ventas.length,
    totalTurnos: turnos.length,
    totalMovimientos: movimientosCombinados.length,
    totalEfectivo: ventas.reduce((sum, v) => {
      if (v.metodoPago === 'EFECTIVO' || v.metodoPago === 'MIXTO') {
        return sum + Number(v.efectivoRecibido || 0);
      }
      return sum;
    }, 0),
    totalCredito: ventas.reduce((sum, v) => sum + Number(v.creditoUsado || 0), 0),
    totalVentasMonto: ventas.reduce((sum, v) => sum + Number(v.total), 0)
  };

  // Si es vendedor, mostrar solo ventas
  if (user?.role !== 'ADMIN') {
    const totalVentas = ventas.reduce((sum, v) => sum + Number(v.total), 0);
    
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Historial de Ventas</h1>
            <p className="text-gray-600 mt-1">Consulta todas tus ventas realizadas</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-6 py-4">
            <div className="text-right">
              <p className="text-sm text-gray-600">Total de ventas</p>
              <p className="text-2xl font-bold text-primary-600">
                ${totalVentas.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Filtros de búsqueda</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha Inicio
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha Fin
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="input"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={limpiarFiltros}
                className="btn btn-secondary w-full flex items-center justify-center gap-2"
              >
                <X className="h-4 w-4" />
                Limpiar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Ventas */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : ventas.length === 0 ? (
            <div className="text-center py-16">
              <Receipt className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No hay ventas registradas</p>
              <p className="text-gray-400 text-sm mt-2">Las ventas aparecerán aquí cuando las realices</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {ventas.map((venta) => (
                    <tr key={venta.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-900">
                            {format(new Date(venta.fecha), 'dd/MM/yyyy HH:mm', { locale: es })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono text-gray-600 bg-gray-50 px-2 py-1 rounded">
                          {venta.id.substring(0, 8)}...
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {venta.cliente?.nombre || 'Sin cliente'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-primary-600">
                          ${Number(venta.total).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full ${
                            venta.estado === 'COMPLETADA'
                              ? 'bg-green-100 text-green-800'
                              : venta.estado === 'CANCELADA'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {venta.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => verDetalleVenta(venta.id)}
                          className="text-primary-600 hover:text-primary-700 flex items-center gap-1.5 font-medium transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Detalle de Venta */}
        {ventaSeleccionada && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6 pb-4 border-b">
                <h3 className="text-2xl font-bold text-gray-900">Detalle de Venta</h3>
                <button
                  onClick={() => setVentaSeleccionada(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Fecha</p>
                    <p className="font-semibold text-gray-900">
                      {format(new Date(ventaSeleccionada.fecha), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">ID Venta</p>
                    <p className="font-mono text-sm text-gray-900">{ventaSeleccionada.id}</p>
                  </div>
                  {ventaSeleccionada.cliente && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Cliente</p>
                      <p className="font-semibold text-gray-900">{ventaSeleccionada.cliente.nombre}</p>
                      {ventaSeleccionada.cliente.email && (
                        <p className="text-sm text-gray-500 mt-1">{ventaSeleccionada.cliente.email}</p>
                      )}
                    </div>
                  )}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Estado</p>
                    <span
                      className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full ${
                        ventaSeleccionada.estado === 'COMPLETADA'
                          ? 'bg-green-100 text-green-800'
                          : ventaSeleccionada.estado === 'CANCELADA'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {ventaSeleccionada.estado}
                    </span>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h4 className="font-semibold text-lg mb-4">Productos</h4>
                  <div className="space-y-3">
                    {ventaSeleccionada.detalles?.map((detalle) => (
                      <div
                        key={detalle.id}
                        className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{detalle.producto?.nombre || 'Producto'}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            {detalle.cantidad} x ${Number(detalle.precio_unitario).toLocaleString()}
                          </p>
                        </div>
                        <p className="font-bold text-lg text-primary-600">
                          ${Number(detalle.subtotal).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-6">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-xl font-semibold text-gray-900">Total:</span>
                    <span className="text-3xl font-bold text-primary-600">
                      ${Number(ventaSeleccionada.total).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setMostrarTicket(true);
                      }}
                      className="flex-1 btn btn-primary flex items-center justify-center gap-2 py-3"
                    >
                      <Printer className="h-5 w-5" />
                      Ver Ticket
                    </button>
                    <button
                      onClick={() => setVentaSeleccionada(null)}
                      className="btn btn-secondary py-3 px-6"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Ticket */}
        {mostrarTicket && ventaSeleccionada && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-auto backdrop-blur-sm">
            <Ticket
              venta={ventaSeleccionada}
              onClose={() => {
                setMostrarTicket(false);
              }}
            />
          </div>
        )}
      </div>
    );
  }

  // Vista para ADMIN - Historial de Ventas y Caja
  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Historial de Ventas y Caja</h1>
          <p className="text-gray-600 mt-1">Registro de todas las ventas y movimientos de caja</p>
        </div>
        
        {/* Tarjetas de estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-100 text-sm font-medium">Total Movimientos</p>
                <p className="text-3xl font-bold mt-1">{estadisticas.totalMovimientos}</p>
              </div>
              <History className="h-10 w-10 text-primary-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Ventas</p>
                <p className="text-3xl font-bold mt-1">{estadisticas.totalVentas}</p>
                <p className="text-green-100 text-xs mt-1">${estadisticas.totalVentasMonto.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
              </div>
              <Receipt className="h-10 w-10 text-green-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Efectivo</p>
                <p className="text-3xl font-bold mt-1">${estadisticas.totalEfectivo.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
              </div>
              <DollarSign className="h-10 w-10 text-blue-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Crédito</p>
                <p className="text-3xl font-bold mt-1">${estadisticas.totalCredito.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
                <p className="text-purple-100 text-xs mt-1">{estadisticas.totalTurnos} turnos</p>
              </div>
              <CreditCard className="h-10 w-10 text-purple-200" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900 text-lg">Filtros de búsqueda</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportarCSV}
              className="btn btn-secondary flex items-center gap-2 text-sm"
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </button>
            {(fechaInicio || fechaFin || horaInicio || horaFin || tipoMovimiento !== 'TODOS' || localId || vendedorId || metodoPago || busquedaTexto) && (
              <button
                onClick={limpiarFiltros}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
              >
                <X className="h-4 w-4" />
                Limpiar filtros
              </button>
            )}
          </div>
        </div>
        
        {/* Búsqueda de texto */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={busquedaTexto}
              onChange={(e) => setBusquedaTexto(e.target.value)}
              placeholder="Buscar en ventas y movimientos de caja..."
              className="input pl-10 w-full"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              Fecha Inicio
            </label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
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
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Movimiento
            </label>
            <select
              value={tipoMovimiento}
              onChange={(e) => setTipoMovimiento(e.target.value)}
              className="input"
            >
              <option value="TODOS">Todos</option>
              <option value="VENTA">Ventas</option>
              <option value="APERTURA_CAJA">Apertura de Caja</option>
              <option value="CIERRE_CAJA">Cierre de Caja</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="h-4 w-4 inline mr-1" />
              Hora Inicio
            </label>
            <input
              type="time"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="h-4 w-4 inline mr-1" />
              Hora Fin
            </label>
            <input
              type="time"
              value={horaFin}
              onChange={(e) => setHoraFin(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Building2 className="h-4 w-4 inline mr-1" />
              Local
            </label>
            <select
              value={localId}
              onChange={(e) => setLocalId(e.target.value)}
              className="input"
            >
              <option value="">Todos</option>
              {locales.map((local) => (
                <option key={local.id} value={local.id}>
                  {local.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <UserCheck className="h-4 w-4 inline mr-1" />
              Vendedor
            </label>
            <select
              value={vendedorId}
              onChange={(e) => setVendedorId(e.target.value)}
              className="input"
            >
              <option value="">Todos</option>
              {vendedores.map((vendedor) => (
                <option key={vendedor.id} value={vendedor.id}>
                  {vendedor.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <CreditCard className="h-4 w-4 inline mr-1" />
              Método de Pago
            </label>
            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
              className="input"
            >
              <option value="">Todos</option>
              <option value="EFECTIVO">Efectivo</option>
              <option value="CREDITO">Crédito</option>
              <option value="MIXTO">Mixto</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Movimientos (Ventas y Caja) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : movimientosCombinados.length === 0 ? (
          <div className="text-center py-16">
            <History className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No hay movimientos registrados</p>
            <p className="text-gray-400 text-sm mt-2">Las ventas y movimientos de caja aparecerán aquí</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {movimientosCombinados.map((movimiento, index) => {
              if (movimiento.tipo === 'VENTA') {
                const venta = movimiento.data;
                return (
                  <div
                    key={movimiento.id}
                    className={`p-6 hover:bg-gray-50 transition-all duration-200 ${
                      index === 0 ? 'bg-gradient-to-r from-green-50 to-transparent' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl border-2 bg-green-50 border-green-200 text-green-700">
                          <Receipt className="h-6 w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-semibold text-gray-900">VENTA</span>
                            <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                              venta.metodoPago === 'EFECTIVO' ? 'bg-green-100 text-green-700' :
                              venta.metodoPago === 'CREDITO' ? 'bg-blue-100 text-blue-700' :
                              'bg-purple-100 text-purple-700'
                            }`}>
                              {venta.metodoPago}
                            </span>
                          </div>
                          <div className="mb-3">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-green-600" />
                              <span className="font-semibold text-gray-900 text-lg">
                                ${Number(venta.total).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            {venta.cliente && (
                              <p className="text-sm text-gray-600 mt-1">Cliente: {venta.cliente.nombre}</p>
                            )}
                            {venta.efectivoRecibido && (
                              <p className="text-xs text-gray-500 mt-1">
                                Efectivo: ${Number(venta.efectivoRecibido).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                              </p>
                            )}
                            {venta.creditoUsado && Number(venta.creditoUsado) > 0 && (
                              <p className="text-xs text-gray-500 mt-1">
                                Crédito: ${Number(venta.creditoUsado).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{format(new Date(movimiento.fecha), 'dd/MM/yyyy HH:mm:ss', { locale: es })}</span>
                            </div>
                            {venta.local && (
                              <div className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                <span>{venta.local.nombre}</span>
                              </div>
                            )}
                            {venta.vendedor && (
                              <div className="flex items-center gap-1">
                                <UserCheck className="h-3 w-3" />
                                <span>{venta.vendedor.nombre}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => verDetalleVenta(venta.id)}
                        className="px-4 py-2 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        Ver Detalle
                      </button>
                    </div>
                  </div>
                );
              } else if (movimiento.tipo === 'APERTURA_CAJA') {
                const turno = movimiento.data;
                return (
                  <div
                    key={movimiento.id}
                    className={`p-6 hover:bg-gray-50 transition-all duration-200 ${
                      index === 0 ? 'bg-gradient-to-r from-blue-50 to-transparent' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl border-2 bg-blue-50 border-blue-200 text-blue-700">
                          <Unlock className="h-6 w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-semibold text-gray-900">APERTURA DE CAJA</span>
                            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-700">
                              TURNO ABIERTO
                            </span>
                          </div>
                          <div className="mb-3">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-blue-600" />
                              <span className="font-semibold text-gray-900 text-lg">
                                Efectivo Inicial: ${Number(turno.efectivo_inicial).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            {turno._count && (
                              <p className="text-sm text-gray-600 mt-1">
                                Ventas realizadas: {turno._count.ventas || 0}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{format(new Date(movimiento.fecha), 'dd/MM/yyyy HH:mm:ss', { locale: es })}</span>
                            </div>
                            {turno.local && (
                              <div className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                <span>{turno.local.nombre}</span>
                              </div>
                            )}
                            {turno.vendedor && (
                              <div className="flex items-center gap-1">
                                <UserCheck className="h-3 w-3" />
                                <span>{turno.vendedor.nombre}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              } else {
                // CIERRE_CAJA
                const turno = movimiento.data;
                return (
                  <div
                    key={movimiento.id}
                    className={`p-6 hover:bg-gray-50 transition-all duration-200 ${
                      index === 0 ? 'bg-gradient-to-r from-purple-50 to-transparent' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl border-2 bg-purple-50 border-purple-200 text-purple-700">
                          <Lock className="h-6 w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-semibold text-gray-900">CIERRE DE CAJA</span>
                            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-100 text-purple-700">
                              TURNO CERRADO
                            </span>
                          </div>
                          <div className="mb-3 space-y-1">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-purple-600" />
                              <span className="font-semibold text-gray-900">
                                Efectivo Final: ${turno.efectivo_final ? Number(turno.efectivo_final).toLocaleString('es-ES', { minimumFractionDigits: 2 }) : '0.00'}
                              </span>
                            </div>
                            {turno.efectivo_esperado !== undefined && (
                              <p className="text-sm text-gray-600">
                                Esperado: ${Number(turno.efectivo_esperado).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                              </p>
                            )}
                            {turno.diferencia !== undefined && (
                              <p className={`text-sm font-semibold ${
                                turno.diferencia === 0 ? 'text-green-600' :
                                turno.diferencia > 0 ? 'text-blue-600' : 'text-red-600'
                              }`}>
                                Diferencia: ${Number(turno.diferencia).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                              </p>
                            )}
                            {turno._count && (
                              <p className="text-xs text-gray-500 mt-1">
                                Total ventas: {turno._count.ventas || 0}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{format(new Date(movimiento.fecha), 'dd/MM/yyyy HH:mm:ss', { locale: es })}</span>
                            </div>
                            {turno.local && (
                              <div className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                <span>{turno.local.nombre}</span>
                              </div>
                            )}
                            {turno.vendedor && (
                              <div className="flex items-center gap-1">
                                <UserCheck className="h-3 w-3" />
                                <span>{turno.vendedor.nombre}</span>
                              </div>
                            )}
                          </div>
                          {turno.observaciones && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                              <strong>Observaciones:</strong> {turno.observaciones}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
            })}
          </div>
        )}
      </div>

      {/* Modal Detalle de Venta */}
      {ventaSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 pb-4 border-b">
              <h3 className="text-2xl font-bold text-gray-900">Detalle de Venta</h3>
              <button
                onClick={() => setVentaSeleccionada(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Fecha</p>
                  <p className="font-semibold text-gray-900">
                    {format(new Date(ventaSeleccionada.fecha), 'dd/MM/yyyy HH:mm', { locale: es })}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">ID Venta</p>
                  <p className="font-mono text-sm text-gray-900">{ventaSeleccionada.id}</p>
                </div>
                {ventaSeleccionada.local && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Local</p>
                    <p className="font-semibold text-gray-900">{ventaSeleccionada.local.nombre}</p>
                  </div>
                )}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Vendedor</p>
                  <p className="font-semibold text-gray-900">{ventaSeleccionada.vendedor?.nombre || 'N/A'}</p>
                </div>
                {ventaSeleccionada.cliente && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Cliente</p>
                    <p className="font-semibold text-gray-900">{ventaSeleccionada.cliente.nombre}</p>
                    {ventaSeleccionada.cliente.email && (
                      <p className="text-sm text-gray-500 mt-1">{ventaSeleccionada.cliente.email}</p>
                    )}
                  </div>
                )}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Estado</p>
                  <span
                    className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full ${
                      ventaSeleccionada.estado === 'COMPLETADA'
                        ? 'bg-green-100 text-green-800'
                        : ventaSeleccionada.estado === 'CANCELADA'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {ventaSeleccionada.estado}
                  </span>
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-semibold text-lg mb-4">Productos</h4>
                <div className="space-y-3">
                  {ventaSeleccionada.detalles?.map((detalle) => (
                    <div
                      key={detalle.id}
                      className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{detalle.producto?.nombre || 'Producto'}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {detalle.cantidad} x ${Number(detalle.precio_unitario).toLocaleString()}
                        </p>
                      </div>
                      <p className="font-bold text-lg text-primary-600">
                        ${Number(detalle.subtotal).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-6">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-xl font-semibold text-gray-900">Total:</span>
                  <span className="text-3xl font-bold text-primary-600">
                    ${Number(ventaSeleccionada.total).toLocaleString()}
                  </span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setMostrarTicket(true);
                    }}
                    className="flex-1 btn btn-primary flex items-center justify-center gap-2 py-3"
                  >
                    <Printer className="h-5 w-5" />
                    Ver Ticket
                  </button>
                  <button
                    onClick={() => setVentaSeleccionada(null)}
                    className="btn btn-secondary py-3 px-6"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Ticket */}
      {mostrarTicket && ventaSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-auto backdrop-blur-sm">
          <Ticket
            venta={ventaSeleccionada}
            onClose={() => {
              setMostrarTicket(false);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default HistorialVentas;
