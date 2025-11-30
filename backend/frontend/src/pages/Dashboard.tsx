import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api, isDatabaseError } from '../utils/api';
import { 
  LayoutDashboard, 
  TrendingUp, 
  ShoppingCart, 
  Package, 
  Users, 
  AlertTriangle,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Activity,
  Building2,
  UserCheck,
  Download,
  BarChart3
} from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface DashboardStats {
  ventasHoy: { total: number; cantidad: number };
  ventasSemana: { total: number; cantidad: number };
  ventasMes: { total: number; cantidad: number };
  totalProductos: number;
  totalClientes: number;
  stockBajo: number;
  ventasRecientes: Array<{
    id: string;
    fecha: string;
    total: number;
    local?: { id: string; nombre: string };
    vendedor?: { id: string; nombre: string };
    cliente?: { id: string; nombre: string };
    metodoPago: string;
  }>;
  productosStockBajo: Array<{
    id: string;
    producto: { id: string; nombre: string; categoria?: string };
    local?: { id: string; nombre: string };
    cantidad: number;
    stock_minimo: number;
  }>;
  ventasPorDia: Array<{
    fecha: string;
    total: number;
    cantidad: number;
  }>;
  turnoActivo?: {
    id: string;
    local: { id: string; nombre: string };
    fecha_apertura: string;
    efectivo_inicial: number;
    cantidadVentas: number;
    totalVentas: number;
  };
  topProductos: Array<{
    producto: { id: string; nombre: string; precio: number };
    cantidadVendida: number;
    totalVendido: number;
  }>;
}

interface Actividad {
  id: string;
  fecha: string;
  accion: string;
  tabla: string;
  user: {
    id: string;
    nombre: string;
    email: string;
    role: string;
    local?: {
      id: string;
      nombre: string;
    };
  };
}

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingActividades, setLoadingActividades] = useState(false);
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    cargarStats();
    if (isAdmin) {
      cargarActividades();
    }
    // Actualizar cada 30 segundos
    const interval = setInterval(() => {
      cargarStats();
      if (isAdmin) {
        cargarActividades();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [user, isAdmin]);

  const cargarStats = async () => {
    try {
      const response = await api.get<DashboardStats>('/dashboard/stats');
      setStats(response.data);
    } catch (error: any) {
      if (error.response?.status !== 401) {
        if (!isDatabaseError(error)) {
          toast.error('Error al cargar estadísticas');
        }
        console.error(error);
      }
    } finally {
      setLoading(false);
    }
  };

  const cargarActividades = async () => {
    if (!isAdmin) return;
    
    try {
      setLoadingActividades(true);
      const response = await api.get<{ actividades: Actividad[] }>('/actividades?limit=20');
      if (response.data && response.data.actividades) {
        setActividades(response.data.actividades);
      } else {
        setActividades([]);
      }
    } catch (error: any) {
      if (error.response?.status !== 401) {
        console.error('Error al cargar actividades:', error);
        setActividades([]);
      }
    } finally {
      setLoadingActividades(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!stats) {
    return <div>No hay datos disponibles</div>;
  }

  // Calcular variación de ventas
  const variacionVentas = stats.ventasSemana.cantidad > 0 
    ? ((stats.ventasHoy.cantidad / stats.ventasSemana.cantidad) * 100 - 14.28).toFixed(1)
    : '0';

  // Si es vendedor, mostrar dashboard enfocado en ventas
  if (!isAdmin) {
    return <DashboardVendedor stats={stats} variacionVentas={variacionVentas} />;
  }

  // Si es admin, mostrar dashboard enfocado en gestión
  return <DashboardAdmin stats={stats} actividades={actividades} loadingActividades={loadingActividades} />;
};

// Dashboard para VENDEDOR - Enfoque en ventas y productos
const DashboardVendedor = ({ stats, variacionVentas }: { stats: DashboardStats; variacionVentas: string }) => {

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6 text-green-600" />
          Mi Dashboard
        </h1>
        <p className="text-gray-600">Panel de control para vendedores</p>
      </div>

      {/* Información del Turno Activo */}
      {stats.turnoActivo ? (
        <div className="card mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <Zap className="h-5 w-5 text-green-600" />
                Turno Activo
              </h3>
              <p className="text-sm text-gray-600">
                Local: <span className="font-medium">{stats.turnoActivo.local.nombre}</span>
              </p>
              <p className="text-sm text-gray-600">
                Abierto: {format(new Date(stats.turnoActivo.fecha_apertura), "PPpp", { locale: es })}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">
                ${stats.turnoActivo.totalVentas.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-gray-600">
                {stats.turnoActivo.cantidadVentas} ventas realizadas
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Efectivo inicial: ${stats.turnoActivo.efectivo_inicial.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card mb-6 bg-yellow-50 border-yellow-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-900">No tienes un turno abierto</p>
              <p className="text-sm text-yellow-700">Abre un turno desde el botón en el header para comenzar a vender</p>
            </div>
          </div>
        </div>
      )}

      {/* Accesos Rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Link to="/ventas" className="card hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center gap-3">
            <ShoppingCart className="h-8 w-8" />
            <div>
              <p className="font-semibold text-lg">Nueva Venta</p>
              <p className="text-sm text-green-100">Iniciar punto de venta</p>
            </div>
          </div>
        </Link>
        <Link to="/productos" className="card hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8" />
            <div>
              <p className="font-semibold text-lg">Productos</p>
              <p className="text-sm text-blue-100">Gestionar productos</p>
            </div>
          </div>
        </Link>
        <Link to="/stock" className="card hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8" />
            <div>
              <p className="font-semibold text-lg">Stock</p>
              <p className="text-sm text-purple-100">Actualizar inventario</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Estadísticas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          title="Ventas de Hoy"
          value={`$${stats.ventasHoy.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`}
          subtitle={`${stats.ventasHoy.cantidad} ventas`}
          icon={TrendingUp}
          color="bg-green-500"
          trend={parseFloat(variacionVentas) > 0 ? 'up' : 'down'}
          trendValue={variacionVentas}
        />
        <StatCard
          title="Ventas del Mes"
          value={`$${stats.ventasMes.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`}
          subtitle={`${stats.ventasMes.cantidad} ventas`}
          icon={Calendar}
          color="bg-blue-500"
        />
        <StatCard
          title="Productos"
          value={stats.totalProductos.toString()}
          subtitle={`${stats.stockBajo} con stock bajo`}
          icon={Package}
          color="bg-purple-500"
          alert={stats.stockBajo > 0}
        />
        <StatCard
          title="Clientes"
          value={stats.totalClientes.toString()}
          subtitle="Total registrados"
          icon={Users}
          color="bg-indigo-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ventas Recientes */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Ventas Recientes</h2>
            <Link to="/historial-ventas" className="text-sm text-green-600 hover:text-green-700 font-medium">
              Ver todas →
            </Link>
          </div>
          <div className="space-y-3">
            {stats.ventasRecientes.length > 0 ? (
              stats.ventasRecientes.map((venta) => (
                <div key={venta.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      ${venta.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-sm text-gray-600">
                      {format(new Date(venta.fecha), "PPp", { locale: es })}
                    </div>
                    {venta.cliente?.nombre && (
                      <div className="text-xs text-gray-500 mt-1">
                        Cliente: {venta.cliente.nombre}
                      </div>
                    )}
                  </div>
                  <div className="ml-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      venta.metodoPago === 'EFECTIVO' ? 'bg-green-100 text-green-700' :
                      venta.metodoPago === 'CREDITO' ? 'bg-blue-100 text-blue-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {venta.metodoPago}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No hay ventas recientes</p>
            )}
          </div>
        </div>

        {/* Productos con Stock Bajo */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Stock Bajo
            </h2>
            <Link to="/stock?stockBajo=true" className="text-sm text-green-600 hover:text-green-700 font-medium">
              Ver todos →
            </Link>
          </div>
          <div className="space-y-2">
            {stats.productosStockBajo.length > 0 ? (
              stats.productosStockBajo.slice(0, 5).map((stock) => (
                <div key={stock.id} className="p-2 bg-red-50 border border-red-200 rounded">
                  <div className="font-medium text-sm text-gray-900">{stock.producto.nombre}</div>
                  <div className="text-xs text-gray-600">
                    Stock: <span className="font-bold text-red-600">{stock.cantidad}</span> / 
                    Mínimo: {stock.stock_minimo}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4 text-sm">✅ Todo el stock está bien</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Dashboard para ADMIN - Enfoque en gestión y actividades
const DashboardAdmin = ({ stats, actividades, loadingActividades }: { stats: DashboardStats; actividades: Actividad[]; loadingActividades: boolean }) => {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6 text-blue-600" />
          Panel de Administración
        </h1>
        <p className="text-gray-600">Vista general de todos los locales y actividades</p>
      </div>

      {/* Botón Exportar Datos */}
      <div className="mb-6 flex justify-end">
        <button
          onClick={() => {
            const datos = {
              fecha: new Date().toISOString(),
              estadisticas: {
                ventasHoy: stats.ventasHoy,
                ventasSemana: stats.ventasSemana,
                ventasMes: stats.ventasMes,
                totalProductos: stats.totalProductos,
                totalClientes: stats.totalClientes,
                stockBajo: stats.stockBajo
              },
              topProductos: stats.topProductos,
              ventasPorDia: stats.ventasPorDia
            };
            const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `dashboard-${format(new Date(), 'yyyy-MM-dd')}.json`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Datos exportados exitosamente');
          }}
          className="btn btn-secondary flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Exportar Datos
        </button>
      </div>

      {/* Estadísticas Generales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          title="Ventas de Hoy"
          value={`$${stats.ventasHoy.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`}
          subtitle={`${stats.ventasHoy.cantidad} ventas`}
          icon={TrendingUp}
          color="bg-blue-500"
        />
        <StatCard
          title="Ventas del Mes"
          value={`$${stats.ventasMes.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`}
          subtitle={`${stats.ventasMes.cantidad} ventas`}
          icon={Calendar}
          color="bg-indigo-500"
        />
        <StatCard
          title="Productos"
          value={stats.totalProductos.toString()}
          subtitle={`${stats.stockBajo} con stock bajo`}
          icon={Package}
          color="bg-purple-500"
          alert={stats.stockBajo > 0}
        />
        <StatCard
          title="Clientes"
          value={stats.totalClientes.toString()}
          subtitle="Total registrados"
          icon={Users}
          color="bg-pink-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Actividades Recientes */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Actividades Recientes
            </h2>
            <Link to="/historial-ventas" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Ver Historial Completo →
            </Link>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {loadingActividades ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : actividades.length > 0 ? (
              actividades.map((actividad) => (
                <div key={actividad.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className={`p-2 rounded-full flex-shrink-0 ${
                    actividad.accion === 'CREAR' ? 'bg-green-100' :
                    actividad.accion === 'ACTUALIZAR' ? 'bg-blue-100' :
                    actividad.accion === 'ELIMINAR' ? 'bg-red-100' :
                    'bg-gray-100'
                  }`}>
                    {actividad.accion === 'CREAR' ? <Package className="h-4 w-4 text-green-600" /> :
                     actividad.accion === 'ACTUALIZAR' ? <Activity className="h-4 w-4 text-blue-600" /> :
                     actividad.accion === 'ELIMINAR' ? <AlertTriangle className="h-4 w-4 text-red-600" /> :
                     <Activity className="h-4 w-4 text-gray-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900">
                      {actividad.user.nombre}
                      {actividad.user.local && (
                        <span className="text-sm text-gray-500 ml-2">
                          • {actividad.user.local.nombre}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold mr-2 ${
                        actividad.accion === 'CREAR' ? 'bg-green-100 text-green-700' :
                        actividad.accion === 'ACTUALIZAR' ? 'bg-blue-100 text-blue-700' :
                        actividad.accion === 'ELIMINAR' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {actividad.accion}
                      </span>
                      en <span className="font-semibold">{actividad.tabla}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {format(new Date(actividad.fecha), "PPpp", { locale: es })}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No hay actividades recientes</p>
                <p className="text-sm text-gray-400 mt-1">
                  Las actividades del sistema aparecerán aquí
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Accesos Rápidos Admin */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            Accesos Rápidos
          </h2>
          <div className="space-y-2">
            <Link to="/locales" className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
              <Building2 className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-gray-900">Gestionar Locales</span>
            </Link>
            <Link to="/usuarios" className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
              <UserCheck className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-gray-900">Gestionar Usuarios</span>
            </Link>
            <Link to="/historial-ventas" className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
              <Activity className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-gray-900">Ver Historial Completo</span>
            </Link>
            <Link to="/ventas" className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-gray-900">Ver Ventas</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Gráfico de Ventas y Top Productos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Gráfico de Ventas por Día */}
        {stats.ventasPorDia && stats.ventasPorDia.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Ventas por Día (Últimos 7 días)
              </h2>
            </div>
            <div className="space-y-3">
              {stats.ventasPorDia.slice(-7).map((dia, index) => {
                const maxTotal = Math.max(...stats.ventasPorDia.slice(-7).map(d => d.total));
                const porcentaje = maxTotal > 0 ? (dia.total / maxTotal) * 100 : 0;
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">
                        {format(new Date(dia.fecha), 'dd/MM', { locale: es })}
                      </span>
                      <span className="font-semibold text-gray-900">
                        ${Number(dia.total).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all"
                        style={{ width: `${porcentaje}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {dia.cantidad} ventas
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Top Productos */}
        {stats.topProductos && stats.topProductos.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Top Productos Vendidos
              </h2>
            </div>
            <div className="space-y-3">
              {stats.topProductos.slice(0, 5).map((item, index) => (
                <div key={item.producto.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{item.producto.nombre}</p>
                      <p className="text-xs text-gray-500">
                        {item.cantidadVendida} unidades
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">
                      ${Number(item.totalVendido).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Ventas Recientes y Stock Bajo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Ventas Recientes</h2>
            <div className="flex items-center gap-2">
              <Link to="/historial-ventas" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                Ver todas →
              </Link>
            </div>
          </div>
          <div className="space-y-3">
            {stats.ventasRecientes.length > 0 ? (
              stats.ventasRecientes.map((venta) => (
                <div key={venta.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      ${venta.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-sm text-gray-600">
                      {format(new Date(venta.fecha), "PPp", { locale: es })}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {venta.local?.nombre && `${venta.local.nombre} • `}
                      {venta.vendedor?.nombre}
                      {venta.cliente?.nombre && ` • ${venta.cliente.nombre}`}
                    </div>
                  </div>
                  <div className="ml-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      venta.metodoPago === 'EFECTIVO' ? 'bg-green-100 text-green-700' :
                      venta.metodoPago === 'CREDITO' ? 'bg-blue-100 text-blue-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {venta.metodoPago}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No hay ventas recientes</p>
            )}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Stock Bajo
            </h2>
            <Link to="/stock?stockBajo=true" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Ver todos →
            </Link>
          </div>
          <div className="space-y-2">
            {stats.productosStockBajo.length > 0 ? (
              stats.productosStockBajo.slice(0, 5).map((stock) => (
                <div key={stock.id} className="p-2 bg-red-50 border border-red-200 rounded">
                  <div className="font-medium text-sm text-gray-900">{stock.producto.nombre}</div>
                  <div className="text-xs text-gray-600">
                    Stock: <span className="font-bold text-red-600">{stock.cantidad}</span> / 
                    Mínimo: {stock.stock_minimo}
                    {stock.local && ` • ${stock.local.nombre}`}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4 text-sm">✅ Todo el stock está bien</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  trend,
  trendValue,
  alert
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: any;
  color: string;
  trend?: 'up' | 'down';
  trendValue?: string;
  alert?: boolean;
}) => {
  return (
    <div className={`card ${alert ? 'border-red-300 bg-red-50' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className={`text-2xl font-bold ${alert ? 'text-red-600' : 'text-gray-900'}`}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend && trendValue && (
            <div className={`flex items-center gap-1 mt-2 text-xs ${
              trend === 'up' ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend === 'up' ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {Math.abs(parseFloat(trendValue))}%
            </div>
          )}
        </div>
        <div className={`${color} p-3 rounded-lg`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
