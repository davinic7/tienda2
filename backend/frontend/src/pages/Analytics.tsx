import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { BarChart3, TrendingUp, DollarSign, Users, CreditCard, Package } from 'lucide-react';
import toast from 'react-hot-toast';

interface AnalyticsData {
  productosMasVendidos: Array<{
    producto: { id: string; nombre: string; precio: number; categoria?: string };
    cantidadVendida: number;
    totalVendido: number;
    vecesVendido: number;
  }>;
  ventasPorDia: Array<{
    fecha: string;
    total: number;
    cantidad: number;
  }>;
  ventasPorHora: Array<{
    hora: number;
    total: number;
    cantidad: number;
  }>;
  mediosPago: Array<{
    metodoPago: string;
    total: number;
    cantidad: number;
  }>;
  clientesFrecuentes: Array<{
    cliente: { id: string; nombre: string; email?: string; telefono?: string };
    totalConsumido: number;
    cantidadCompras: number;
    promedioPorCompra: number;
  }>;
  ventasPorCategoria: Array<{
    categoria: string;
    total: number;
    cantidad: number;
  }>;
  estadisticasGenerales: {
    totalVentas: number;
    cantidadVentas: number;
    promedioVenta: number;
  };
}

const Analytics = () => {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [localId, setLocalId] = useState('');
  const [locales, setLocales] = useState<any[]>([]);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      cargarLocales();
    }
    cargarAnalytics();
  }, [user, fechaInicio, fechaFin, localId]);

  const cargarLocales = async () => {
    try {
      const response = await api.get('/locales?activo=true');
      setLocales(response.data.locales || []);
    } catch (error) {
      console.error('Error al cargar locales:', error);
    }
  };

  const cargarAnalytics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fechaInicio) params.append('fechaInicio', fechaInicio);
      if (fechaFin) params.append('fechaFin', fechaFin);
      if (localId) params.append('localId', localId);

      const response = await api.get<AnalyticsData>(`/analytics/dashboard?${params.toString()}`);
      setData(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al cargar analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!data) {
    return <div>No hay datos disponibles</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Analytics y Reportes
        </h1>
        <p className="text-gray-600">Análisis detallado de ventas y rendimiento</p>
      </div>

      {/* Filtros */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {user?.role === 'ADMIN' && (
            <div>
              <label className="label">Local</label>
              <select
                value={localId}
                onChange={(e) => setLocalId(e.target.value)}
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
          <div>
            <label className="label">Fecha Inicio</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Fecha Fin</label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="input"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={cargarAnalytics}
              className="btn btn-primary w-full"
            >
              Actualizar
            </button>
          </div>
        </div>
      </div>

      {/* Estadísticas Generales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <StatCard
          title="Total de Ventas"
          value={`$${data.estadisticasGenerales.totalVentas.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
          color="bg-green-500"
        />
        <StatCard
          title="Cantidad de Ventas"
          value={data.estadisticasGenerales.cantidadVentas.toString()}
          icon={TrendingUp}
          color="bg-blue-500"
        />
        <StatCard
          title="Promedio por Venta"
          value={`$${data.estadisticasGenerales.promedioVenta.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`}
          icon={BarChart3}
          color="bg-purple-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Productos Más Vendidos */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Package className="h-5 w-5" />
            Productos Más Vendidos
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.productosMasVendidos.slice(0, 10).map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.producto.nombre}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.cantidadVendida}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      ${item.totalVendido.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Medios de Pago */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Medios de Pago
          </h2>
          <div className="space-y-3">
            {data.mediosPago.map((mp, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{mp.metodoPago}</div>
                  <div className="text-sm text-gray-600">{mp.cantidad} ventas</div>
                </div>
                <div className="text-lg font-bold text-primary-600">
                  ${mp.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ventas por Día */}
      <div className="card mb-6">
        <h2 className="text-xl font-semibold mb-4">Ventas por Día</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.ventasPorDia.map((item, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {new Date(item.fecha).toLocaleDateString('es-ES')}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.cantidad}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    ${item.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ventas por Hora */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Ventas por Hora del Día</h2>
          <div className="space-y-2">
            {data.ventasPorHora.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-16 text-sm font-medium text-gray-700">
                  {item.hora}:00
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">{item.cantidad} ventas</span>
                    <span className="text-sm font-medium text-gray-900">
                      ${item.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full"
                      style={{
                        width: `${(item.cantidad / Math.max(...data.ventasPorHora.map(v => v.cantidad))) * 100}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Clientes Frecuentes */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Clientes Frecuentes
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Compras</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.clientesFrecuentes.slice(0, 10).map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.cliente.nombre}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.cantidadCompras}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      ${item.totalConsumido.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  icon: any;
  color: string;
}) => {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`${color} p-3 rounded-lg`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
};

export default Analytics;

