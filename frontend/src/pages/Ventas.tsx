import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Layout from '@/components/Layout';
import type { Venta } from '@shared/types';
import { MetodoPago } from '@shared/types';
import { Search, Calendar, FileText, Eye, X, Filter, Printer } from 'lucide-react';

export default function Ventas() {
  const { user } = useAuthStore();
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [ventaSeleccionada, setVentaSeleccionada] = useState<Venta | null>(null);
  const [mostrarTicket, setMostrarTicket] = useState(false);
  const [filtros, setFiltros] = useState({
    fechaDesde: '',
    fechaHasta: '',
    clienteId: '',
    estado: '',
  });
  const [paginacion, setPaginacion] = useState({
    total: 0,
    pagina: 1,
    limite: 20,
    totalPaginas: 0,
  });

  useEffect(() => {
    cargarVentas();
  }, [paginacion.pagina, filtros]);

  const cargarVentas = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtros.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
      if (filtros.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);
      if (filtros.clienteId) params.append('clienteId', filtros.clienteId);
      if (filtros.estado) params.append('estado', filtros.estado);
      params.append('page', paginacion.pagina.toString());
      params.append('limit', paginacion.limite.toString());

      const response = await api.get(`/ventas?${params.toString()}`);
      setVentas(response.data.ventas);
      setPaginacion(response.data.paginacion);
    } catch (error: any) {
      toast.error('Error al cargar ventas');
    } finally {
      setLoading(false);
    }
  };

  const verDetalle = async (id: string) => {
    try {
      const response = await api.get<Venta>(`/ventas/${id}`);
      setVentaSeleccionada(response.data);
    } catch (error: any) {
      toast.error('Error al cargar detalle de venta');
    }
  };

  const cancelarVenta = async (id: string) => {
    if (!confirm('¿Estás seguro de cancelar esta venta? Se restaurará el stock.')) return;

    try {
      await api.put(`/ventas/${id}/cancelar`);
      toast.success('Venta cancelada exitosamente');
      cargarVentas();
      if (ventaSeleccionada?.id === id) {
        setVentaSeleccionada(null);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al cancelar venta');
    }
  };

  const limpiarFiltros = () => {
    setFiltros({
      fechaDesde: '',
      fechaHasta: '',
      clienteId: '',
      estado: '',
    });
    setPaginacion({ ...paginacion, pagina: 1 });
  };

  const calcularCambio = (venta: Venta): number => {
    if (venta.metodoPago === MetodoPago.EFECTIVO && venta.montoEfectivo) {
      return Number(venta.montoEfectivo) - Number(venta.total);
    }
    return 0;
  };

  const imprimirTicket = () => {
    window.print();
  };

  // Manejar tecla ESC para cerrar el ticket
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mostrarTicket) {
        setMostrarTicket(false);
      }
    };

    if (mostrarTicket) {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [mostrarTicket]);

  return (
    <Layout>
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Ventas</h1>
          <p className="text-gray-600 mt-1">Historial de ventas realizadas</p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
              <input
                type="date"
                value={filtros.fechaDesde}
                onChange={(e) => setFiltros({ ...filtros, fechaDesde: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
              <input
                type="date"
                value={filtros.fechaHasta}
                onChange={(e) => setFiltros({ ...filtros, fechaHasta: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                value={filtros.estado}
                onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="">Todos</option>
                <option value="COMPLETADA">Completada</option>
                <option value="CANCELADA">Cancelada</option>
                <option value="PENDIENTE">Pendiente</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={limpiarFiltros}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>

        {/* Tabla de ventas */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            </div>
          ) : ventas.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p>No se encontraron ventas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    {user?.role === 'ADMIN' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vendedor
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
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
                  {ventas.map((venta) => (
                    <tr key={venta.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(venta.fecha).toLocaleDateString('es-AR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {venta.cliente?.nombre || 'Sin cliente'}
                      </td>
                      {user?.role === 'ADMIN' && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {venta.vendedor?.nombre || 'N/A'}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        ${Number(venta.total).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
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
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => verDetalle(venta.id)}
                          className="text-green-600 hover:text-green-900 mr-4"
                        >
                          <Eye className="w-5 h-5 inline" />
                        </button>
                        {venta.estado === 'COMPLETADA' && (
                          <button
                            onClick={() => cancelarVenta(venta.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Cancelar venta"
                          >
                            <X className="w-5 h-5 inline" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginación */}
          {paginacion.totalPaginas > 1 && (
            <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Mostrando {ventas.length} de {paginacion.total} ventas
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPaginacion({ ...paginacion, pagina: paginacion.pagina - 1 })}
                  disabled={paginacion.pagina === 1}
                  className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Anterior
                </button>
                <span className="px-3 py-1 text-sm text-gray-700">
                  Página {paginacion.pagina} de {paginacion.totalPaginas}
                </span>
                <button
                  onClick={() => setPaginacion({ ...paginacion, pagina: paginacion.pagina + 1 })}
                  disabled={paginacion.pagina === paginacion.totalPaginas}
                  className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal de detalle */}
        {ventaSeleccionada && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div
                className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                onClick={() => setVentaSeleccionada(null)}
              />
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Detalle de Venta</h3>
                    <button
                      onClick={() => setVentaSeleccionada(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Fecha</p>
                        <p className="font-medium">{new Date(ventaSeleccionada.fecha).toLocaleString('es-AR')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total</p>
                        <p className="font-bold text-lg text-green-600">
                          ${Number(ventaSeleccionada.total).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    {ventaSeleccionada.cliente && (
                      <div>
                        <p className="text-sm text-gray-600">Cliente</p>
                        <p className="font-medium">{ventaSeleccionada.cliente.nombre}</p>
                        {ventaSeleccionada.cliente.telefono && (
                          <p className="text-sm text-gray-500">{ventaSeleccionada.cliente.telefono}</p>
                        )}
                      </div>
                    )}
                    {user?.role === 'ADMIN' && ventaSeleccionada.vendedor && (
                      <div>
                        <p className="text-sm text-gray-600">Vendedor</p>
                        <p className="font-medium">{ventaSeleccionada.vendedor.nombre}</p>
                      </div>
                    )}
                    {/* Información de Pago */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Información de Pago</p>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Método de Pago:</span>
                          <span className="text-sm font-medium text-gray-900">
                            {ventaSeleccionada.metodoPago.replace(/_/g, ' ')}
                          </span>
                        </div>
                        {ventaSeleccionada.metodoPago === MetodoPago.EFECTIVO && ventaSeleccionada.montoEfectivo && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Monto Recibido:</span>
                              <span className="text-sm font-medium text-green-600">
                                ${Number(ventaSeleccionada.montoEfectivo).toFixed(2)}
                              </span>
                            </div>
                            {calcularCambio(ventaSeleccionada) > 0 && (
                              <div className="flex justify-between border-t border-green-200 pt-2 mt-2">
                                <span className="text-sm font-semibold text-gray-700">Cambio:</span>
                                <span className="text-sm font-bold text-green-700">
                                  ${calcularCambio(ventaSeleccionada).toFixed(2)}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                        {ventaSeleccionada.metodoPago === MetodoPago.MIXTO && (
                          <>
                            {ventaSeleccionada.montoEfectivo && (
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Efectivo:</span>
                                <span className="text-sm font-medium text-green-600">
                                  ${Number(ventaSeleccionada.montoEfectivo).toFixed(2)}
                                </span>
                              </div>
                            )}
                            {ventaSeleccionada.montoOtro && (
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Otro Método:</span>
                                <span className="text-sm font-medium text-blue-600">
                                  ${Number(ventaSeleccionada.montoOtro).toFixed(2)}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between border-t border-green-200 pt-2 mt-2">
                              <span className="text-sm font-semibold text-gray-700">Total Pagado:</span>
                              <span className="text-sm font-bold text-gray-900">
                                ${((ventaSeleccionada.montoEfectivo ? Number(ventaSeleccionada.montoEfectivo) : 0) + (ventaSeleccionada.montoOtro ? Number(ventaSeleccionada.montoOtro) : 0)).toFixed(2)}
                              </span>
                            </div>
                          </>
                        )}
                        {ventaSeleccionada.metodoPago !== MetodoPago.EFECTIVO && ventaSeleccionada.metodoPago !== MetodoPago.MIXTO && ventaSeleccionada.montoOtro && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Monto Pagado:</span>
                            <span className="text-sm font-medium text-blue-600">
                              ${Number(ventaSeleccionada.montoOtro).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Productos</p>
                      <div className="space-y-2">
                        {ventaSeleccionada.detalles?.map((detalle) => (
                          <div
                            key={detalle.id}
                            className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                          >
                            <div>
                              <p className="font-medium">{detalle.producto?.nombre}</p>
                              <p className="text-sm text-gray-600">
                                {detalle.cantidad} x ${Number(detalle.precioUnitario).toFixed(2)}
                              </p>
                            </div>
                            <p className="font-semibold">${Number(detalle.subtotal).toFixed(2)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse sm:space-x-reverse sm:space-x-3">
                  <button
                    onClick={() => setMostrarTicket(true)}
                    className="w-full inline-flex justify-center items-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 sm:w-auto mb-2 sm:mb-0"
                  >
                    <Printer className="w-5 h-5 mr-2" />
                    Ver Ticket
                  </button>
                  <button
                    onClick={() => setVentaSeleccionada(null)}
                    className="w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:w-auto"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal del Ticket */}
        {mostrarTicket && ventaSeleccionada && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setMostrarTicket(false);
              }
            }}
          >
            <div 
              className="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col print:shadow-none print:max-w-none print:w-full print:max-h-none print:rounded-none"
              id="ticket-print"
            >
              {/* Header del modal del ticket */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 print:hidden">
                <h3 className="text-lg font-semibold text-gray-900">Ticket de Venta</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={imprimirTicket}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center text-sm"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimir
                  </button>
                  <button
                    onClick={() => setMostrarTicket(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Cerrar (ESC)"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Contenido del ticket */}
              <div className="flex-1 overflow-y-auto p-6 print:p-4">
                <div className="max-w-sm mx-auto">
                  {/* Header del ticket */}
                  <div className="text-center border-b-2 border-dashed border-gray-400 pb-4 mb-4">
                    <img src="/logo.svg" alt="lolo DRUGSTORE" className="h-20 w-20 mx-auto mb-3 object-contain print:h-16 print:w-16" />
                    <h3 className="text-2xl font-bold print:text-xl">lolo DRUGSTORE</h3>
                    <p className="text-sm text-gray-600 print:text-xs">Sistema POS</p>
                    <p className="text-sm text-gray-600 mt-1 print:text-xs">{ventaSeleccionada.local?.nombre || user?.local?.nombre || ''}</p>
                  </div>

                  {/* Información de la venta */}
                  <div className="text-sm text-gray-700 mb-4 space-y-1 print:text-xs">
                    <p><strong>Fecha:</strong> {new Date(ventaSeleccionada.fecha).toLocaleString('es-ES')}</p>
                    <p><strong>Vendedor:</strong> {ventaSeleccionada.vendedor?.nombre || user?.nombre || ''}</p>
                    {ventaSeleccionada.cliente ? (
                      <p><strong>Cliente:</strong> {ventaSeleccionada.cliente.nombre}{ventaSeleccionada.cliente.telefono ? ` - ${ventaSeleccionada.cliente.telefono}` : ''}</p>
                    ) : (
                      <p><strong>Cliente:</strong> Cliente General</p>
                    )}
                    <p><strong>Método de Pago:</strong> {ventaSeleccionada.metodoPago.replace(/_/g, ' ')}</p>
                  </div>

                  {/* Productos */}
                  <div className="border-t border-b border-dashed border-gray-400 py-4 mb-4">
                    {ventaSeleccionada.detalles?.map((detalle) => (
                      <div key={detalle.id} className="flex justify-between text-sm mb-2 print:text-xs">
                        <div className="flex-1">
                          <div className="font-medium">{detalle.producto?.nombre}</div>
                          <div className="text-gray-600">
                            {detalle.cantidad} x ${Number(detalle.precioUnitario).toFixed(2)}
                          </div>
                        </div>
                        <div className="text-right font-medium">
                          ${Number(detalle.subtotal).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="text-right mb-4">
                    <div className="text-xl font-bold print:text-lg">
                      TOTAL: ${Number(ventaSeleccionada.total).toFixed(2)}
                    </div>
                    {ventaSeleccionada.metodoPago === MetodoPago.MIXTO && ventaSeleccionada.montoEfectivo && ventaSeleccionada.montoOtro && (
                      <div className="text-sm text-gray-600 mt-2 print:text-xs">
                        <div>Efectivo: ${Number(ventaSeleccionada.montoEfectivo).toFixed(2)}</div>
                        <div>Otro: ${Number(ventaSeleccionada.montoOtro).toFixed(2)}</div>
                      </div>
                    )}
                    {ventaSeleccionada.metodoPago === MetodoPago.EFECTIVO && ventaSeleccionada.montoEfectivo && Number(ventaSeleccionada.montoEfectivo) > Number(ventaSeleccionada.total) && (
                      <div className="text-sm text-gray-600 mt-2 print:text-xs">
                        <div>Recibido: ${Number(ventaSeleccionada.montoEfectivo).toFixed(2)}</div>
                        <div>Cambio: ${(Number(ventaSeleccionada.montoEfectivo) - Number(ventaSeleccionada.total)).toFixed(2)}</div>
                      </div>
                    )}
                    {ventaSeleccionada.metodoPago !== MetodoPago.EFECTIVO && ventaSeleccionada.metodoPago !== MetodoPago.MIXTO && ventaSeleccionada.montoOtro && (
                      <div className="text-sm text-gray-600 mt-2 print:text-xs">
                        <div>Pagado: ${Number(ventaSeleccionada.montoOtro).toFixed(2)}</div>
                      </div>
                    )}
                  </div>

                  {/* Footer del ticket */}
                  <div className="text-center text-sm text-gray-500 border-t-2 border-dashed border-gray-400 pt-4 print:text-xs">
                    <p>¡Gracias por su compra!</p>
                    <p>Vuelva pronto</p>
                  </div>
                </div>
              </div>

              {/* Footer del modal (solo visible en pantalla, no en impresión) */}
              <div className="p-4 border-t border-gray-200 print:hidden">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Presiona ESC para cerrar</span>
                  <button
                    onClick={() => setMostrarTicket(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Cerrar
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

