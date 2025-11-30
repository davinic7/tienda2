import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Layout from '@/components/Layout';
import { TrendingUp, DollarSign, ShoppingCart, Package, Calendar, BarChart3, Download, Users, Store, CreditCard } from 'lucide-react';

export default function Reportes() {
  const { user } = useAuthStore();
  const [resumen, setResumen] = useState<any>(null);
  const [productosMasVendidos, setProductosMasVendidos] = useState<any[]>([]);
  const [ventasPorDia, setVentasPorDia] = useState<any[]>([]);
  const [ventasPorMetodoPago, setVentasPorMetodoPago] = useState<any[]>([]);
  const [ventasPorVendedor, setVentasPorVendedor] = useState<any[]>([]);
  const [ventasPorLocal, setVentasPorLocal] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const obtenerFechaFormato = (fecha: Date): string => {
    // Usar métodos locales para evitar problemas de zona horaria
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  };

  const [fechaDesde, setFechaDesde] = useState(() => {
    // Por defecto, mostrar desde el inicio de 2024 para capturar todas las ventas
    const date = new Date(2024, 0, 1); // 1 de enero de 2024
    date.setHours(0, 0, 0, 0);
    return obtenerFechaFormato(date);
  });
  const [fechaHasta, setFechaHasta] = useState(() => {
    // Hasta hoy
    const date = new Date();
    date.setHours(23, 59, 59, 999);
    return obtenerFechaFormato(date);
  });

  useEffect(() => {
    if (user) {
      cargarReportes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaDesde, fechaHasta, user]);

  const cargarReportes = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (fechaDesde) params.append('fechaDesde', fechaDesde);
      if (fechaHasta) params.append('fechaHasta', fechaHasta);
      
      console.log('Cargando reportes con fechas:', {
        fechaDesde,
        fechaHasta,
        params: params.toString()
      });

      const requests: Promise<any>[] = [
        api.get(`/reportes/resumen?${params.toString()}`),
        api.get(`/reportes/productos-mas-vendidos?${params.toString()}&limite=10`),
        api.get(`/reportes/ventas-por-dia?${params.toString()}`),
        api.get(`/reportes/ventas-por-metodo-pago?${params.toString()}`),
      ];

      if (user.role === 'ADMIN') {
        requests.push(api.get(`/reportes/ventas-por-vendedor?${params.toString()}`));
      }

      const responses = await Promise.all(requests);

      setResumen(responses[0].data.resumen);
      setProductosMasVendidos(responses[1].data || []);
      setVentasPorDia(responses[2].data || []);
      setVentasPorMetodoPago(responses[3].data || []);
      
      if (user.role === 'ADMIN') {
        setVentasPorVendedor(responses[4]?.data || []);
        if (responses[0].data.ventasPorLocal) {
          setVentasPorLocal(responses[0].data.ventasPorLocal);
        } else {
          setVentasPorLocal([]);
        }
      } else {
        setVentasPorVendedor([]);
        setVentasPorLocal([]);
      }
    } catch (error: any) {
      console.error('Error al cargar reportes:', error);
      console.error('Detalles del error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      const errorMessage = error.response?.data?.error || error.message || 'Error al cargar reportes';
      toast.error(errorMessage);
      
      // Establecer valores por defecto en caso de error
      setResumen(null);
      setProductosMasVendidos([]);
      setVentasPorDia([]);
      setVentasPorMetodoPago([]);
      setVentasPorVendedor([]);
      setVentasPorLocal([]);
    } finally {
      setLoading(false);
    }
  };

  const establecerPeriodo = (periodo: 'hoy' | 'semana' | 'mes' | 'año') => {
    const ahora = new Date();
    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    hoy.setHours(23, 59, 59, 999);
    
    let desde: Date;

    switch (periodo) {
      case 'hoy':
        // Hoy: desde y hasta son el mismo día
        desde = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
        desde.setHours(0, 0, 0, 0);
        break;
      case 'semana':
        // Última semana: 7 días atrás desde hoy
        desde = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 7);
        desde.setHours(0, 0, 0, 0);
        break;
      case 'mes':
        // Este mes: desde el día 1 del mes actual
        desde = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
        desde.setHours(0, 0, 0, 0);
        break;
      case 'año':
        // Este año: desde el 1 de enero del año actual
        desde = new Date(ahora.getFullYear(), 0, 1);
        desde.setHours(0, 0, 0, 0);
        break;
      default:
        desde = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
        desde.setHours(0, 0, 0, 0);
    }

    const fechaDesdeStr = obtenerFechaFormato(desde);
    const fechaHastaStr = obtenerFechaFormato(hoy);
    
    console.log('Estableciendo período:', periodo, {
      desde: fechaDesdeStr,
      hasta: fechaHastaStr,
      desdeDate: desde.toISOString(),
      hastaDate: hoy.toISOString()
    });

    setFechaDesde(fechaDesdeStr);
    setFechaHasta(fechaHastaStr);
  };

  const exportarCSV = () => {
    if (!resumen) {
      toast.error('No hay datos para exportar');
      return;
    }

    const csvRows: string[] = [];
    csvRows.push('Reporte de Ventas');
    csvRows.push(`Período: ${fechaDesde} a ${fechaHasta}`);
    csvRows.push('');
    csvRows.push('Resumen General');
    csvRows.push(`Total Ventas,${resumen.totalVentas}`);
    csvRows.push(`Ingresos Totales,${resumen.totalMonto}`);
    csvRows.push(`Promedio por Venta,${resumen.promedioVenta}`);
    csvRows.push(`Productos Vendidos,${resumen.totalProductos}`);
    csvRows.push('');
    csvRows.push('Productos Más Vendidos');
    csvRows.push('Producto,Cantidad,Monto Total');
    productosMasVendidos.forEach((p) => {
      csvRows.push(`${p.nombre},${p.cantidadTotal},${p.montoTotal}`);
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte-ventas-${fechaDesde}-${fechaHasta}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Reporte exportado exitosamente');
  };

  const stats = resumen ? [
    {
      title: 'Total Ventas',
      value: resumen.totalVentas,
      icon: ShoppingCart,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Ingresos Totales',
      value: `$${Number(resumen.totalMonto).toLocaleString('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      icon: DollarSign,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Promedio por Venta',
      value: `$${Number(resumen.promedioVenta).toLocaleString('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      icon: TrendingUp,
      color: 'from-green-600 to-emerald-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Productos Vendidos',
      value: resumen.totalProductos,
      icon: Package,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
    },
  ] : [];

  // Calcular máximo para gráficos
  const maxVentasPorDia = ventasPorDia.length > 0 
    ? Math.max(...ventasPorDia.map((v) => v.total))
    : 1;
  const maxCantidadProductos = productosMasVendidos.length > 0
    ? Math.max(...productosMasVendidos.map((p) => p.cantidadTotal))
    : 1;

  if (!user) {
    return (
      <Layout>
        <div className="py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <p className="text-gray-600">Cargando información del usuario...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
            <p className="text-gray-600 mt-1">Análisis y estadísticas de ventas</p>
          </div>
          <button
            onClick={exportarCSV}
            disabled={loading || !resumen}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5 mr-2" />
            Exportar CSV
          </button>
        </div>

        {/* Filtros de fecha */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Período:</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  establecerPeriodo('hoy');
                }}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Hoy
              </button>
              <button
                onClick={() => {
                  establecerPeriodo('semana');
                }}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Última Semana
              </button>
              <button
                onClick={() => {
                  establecerPeriodo('mes');
                }}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Este Mes
              </button>
              <button
                onClick={() => {
                  establecerPeriodo('año');
                }}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Este Año
              </button>
              <button
                onClick={() => {
                  const desde = new Date(2020, 0, 1); // Desde el inicio de 2020
                  desde.setHours(0, 0, 0, 0);
                  const hasta = new Date();
                  hasta.setFullYear(hasta.getFullYear(), 11, 31); // Hasta fin del año actual
                  hasta.setHours(23, 59, 59, 999);
                  setFechaDesde(obtenerFechaFormato(desde));
                  setFechaHasta(obtenerFechaFormato(hasta));
                }}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors bg-green-50 border-green-300"
              >
                Todos
              </button>
            </div>
            <div className="flex items-center gap-4 ml-auto">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Desde</label>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Hasta</label>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-8 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : resumen ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.title}
                  className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-lg bg-gradient-to-br ${stat.color} shadow-md`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                  <p className={`text-2xl font-bold text-gray-900`}>{stat.value}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-8 mb-6 text-center">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">No hay datos disponibles para el período seleccionado</p>
            <p className="text-sm text-gray-500 mt-2">Intenta seleccionar un rango de fechas diferente</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Gráfico de Ventas por Día */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <BarChart3 className="w-6 h-6 text-green-600" />
              <h2 className="text-xl font-bold text-gray-900">Ventas por Día</h2>
            </div>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
                ))}
              </div>
            ) : ventasPorDia.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p>No hay datos para el período seleccionado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {ventasPorDia.map((dia) => {
                  const porcentaje = (dia.total / maxVentasPorDia) * 100;
                  return (
                    <div key={dia.fecha}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">
                          {new Date(dia.fecha).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </span>
                        <span className="text-sm font-bold text-gray-900">
                          ${Number(dia.total).toFixed(2)} ({dia.cantidad} ventas)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${porcentaje}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Ventas por Método de Pago */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <CreditCard className="w-6 h-6 text-green-600" />
              <h2 className="text-xl font-bold text-gray-900">Ventas por Método de Pago</h2>
            </div>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
                ))}
              </div>
            ) : ventasPorMetodoPago.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-sm">No hay ventas registradas en este período</p>
              </div>
            ) : (
              <div className="space-y-4">
                {ventasPorMetodoPago.map((metodo) => {
                  const totalMetodos = ventasPorMetodoPago.reduce((sum, m) => sum + m.total, 0);
                  const porcentaje = totalMetodos > 0 ? (metodo.total / totalMetodos) * 100 : 0;
                  return (
                    <div key={metodo.metodoPago} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900">
                          {metodo.metodoPago.replace(/_/g, ' ')}
                        </span>
                        <span className="text-sm font-bold text-gray-900">
                          ${Number(metodo.total).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                        <span>{metodo.cantidad} ventas</span>
                        <span>{porcentaje.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${porcentaje}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Ventas por Local (solo admin) */}
        {user?.role === 'ADMIN' && ventasPorLocal.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center space-x-3 mb-6">
              <Store className="w-6 h-6 text-green-600" />
              <h2 className="text-xl font-bold text-gray-900">Ventas por Local</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ventasPorLocal.map((local) => (
                <div key={local.localId} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">{local.localNombre}</h3>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Ventas:</span>
                      <span className="font-medium text-gray-900">{local.cantidadVentas}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total:</span>
                      <span className="font-bold text-green-600">${Number(local.montoTotal).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ventas por Vendedor (solo admin) */}
        {user?.role === 'ADMIN' && ventasPorVendedor.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center space-x-3 mb-6">
              <Users className="w-6 h-6 text-green-600" />
              <h2 className="text-xl font-bold text-gray-900">Ventas por Vendedor</h2>
            </div>
            <div className="space-y-4">
              {ventasPorVendedor.map((vendedor) => {
                const maxVentas = Math.max(...ventasPorVendedor.map((v) => v.total));
                const porcentaje = (vendedor.total / maxVentas) * 100;
                return (
                  <div key={vendedor.vendedorId} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-900">{vendedor.vendedorNombre}</span>
                      <span className="text-sm font-bold text-gray-900">
                        ${Number(vendedor.total).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                      <span>{vendedor.cantidad} ventas</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${porcentaje}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Productos más vendidos */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <BarChart3 className="w-6 h-6 text-green-600" />
              <h2 className="text-xl font-bold text-gray-900">Productos Más Vendidos</h2>
            </div>
          </div>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          ) : productosMasVendidos.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p>No hay datos para el período seleccionado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {productosMasVendidos.map((producto, index) => {
                const porcentaje = (producto.cantidadTotal / maxCantidadProductos) * 100;
                return (
                  <div
                    key={producto.productoId}
                    className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center text-white font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{producto.nombre}</p>
                          {producto.categoria && (
                            <p className="text-sm text-gray-500">{producto.categoria}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-bold text-gray-900">{producto.cantidadTotal} unidades</p>
                        <p className="text-sm text-gray-600">
                          ${Number(producto.montoTotal).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${porcentaje}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
