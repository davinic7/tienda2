import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getSocket, onPrecioActualizado, onStockBajo, onNuevaVenta, offNuevaVenta, onClienteCambiado, offClienteCambiado } from '@/lib/socket';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import Layout from '@/components/Layout';
import ModalCaja from '@/components/ModalCaja';
import toast from 'react-hot-toast';
import { DollarSign, ShoppingCart, Users, Package, AlertCircle, Warehouse, ShoppingBag, PackageSearch } from 'lucide-react';
import { Role } from '@shared/types';

export default function Dashboard() {
  const { user } = useAuthStore();
  const [mostrarModalCaja, setMostrarModalCaja] = useState(false);
  // const [modoCaja] = useState<'apertura' | 'cierre' | 'auto'>('auto');
  const [estadisticas, setEstadisticas] = useState<any>(null);
  const [estadisticasAlmacen, setEstadisticasAlmacen] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handlePrecioActualizado = (data: any) => {
      toast.success(`Precio actualizado: ${data.nombre} - $${data.nuevoPrecio}`, {
        duration: 5000,
        icon: '💰',
      });
    };

    const handleStockBajo = (data: any) => {
      toast.error(
        `⚠️ Stock bajo: ${data.nombre} (${data.stockActual}/${data.stockMinimo})`,
        {
          duration: 7000,
        }
      );
    };

    onPrecioActualizado(handlePrecioActualizado);
    onStockBajo(handleStockBajo);

    return () => {
      socket.off('precio-actualizado', handlePrecioActualizado);
      socket.off('stock-bajo', handleStockBajo);
      socket.off('stock-bajo-admin', handleStockBajo);
    };
  }, []);

  const cargarEstadisticas = useCallback(async () => {
    try {
      setLoading(true);
      
      // Si es usuario DEPOSITO, cargar estadísticas de depósito
      if (user?.role === Role.DEPOSITO) {
        const [pedidosResponse, stockBajoResponse] = await Promise.all([
          api.get('/pedidos-almacen?estado=PENDIENTE'),
          api.get('/stock-deposito/alerts/bajo-stock'),
        ]);
        
        setEstadisticasAlmacen({
          pedidosPendientes: pedidosResponse.data.length,
          productosStockBajo: stockBajoResponse.data.length,
          pedidos: pedidosResponse.data,
          stockBajo: stockBajoResponse.data,
        });
      } else {
        // Para otros roles, cargar estadísticas normales
        const hoy = new Date().toISOString().split('T')[0];
        const response = await api.get(`/reportes/resumen?fechaDesde=${hoy}&fechaHasta=${hoy}`);
        setEstadisticas(response.data.resumen);
      }
    } catch (error: any) {
      console.error('Error al cargar estadísticas:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    cargarEstadisticas();
  }, [cargarEstadisticas]);

  // Escuchar nuevas ventas para actualizar estadísticas
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNuevaVenta = () => {
      // Recargar estadísticas cuando se realiza una nueva venta
      cargarEstadisticas();
    };

    onNuevaVenta(handleNuevaVenta);

    return () => {
      offNuevaVenta(handleNuevaVenta);
    };
  }, [cargarEstadisticas]);

  // Escuchar cambios en clientes para actualizar estadísticas
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleClienteCambiado = () => {
      // Recargar estadísticas cuando se crea o actualiza un cliente
      cargarEstadisticas();
    };

    onClienteCambiado(handleClienteCambiado);

    return () => {
      offClienteCambiado(handleClienteCambiado);
    };
  }, [cargarEstadisticas]);

  // Actualizar cuando el usuario vuelve a la página
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        cargarEstadisticas();
      }
    };

    const handleFocus = () => {
      cargarEstadisticas();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [cargarEstadisticas]);

  // Cards diferentes según el rol
  const cards = user?.role === Role.DEPOSITO ? [
    {
      title: 'Pedidos Pendientes',
      value: estadisticasAlmacen?.pedidosPendientes || 0,
      icon: ShoppingBag,
      color: 'from-orange-500 to-orange-600',
      textColor: 'text-orange-600',
      bgColor: 'bg-orange-50',
      link: '/dashboard/pedidos-almacen?estado=PENDIENTE',
    },
    {
      title: 'Productos Stock Bajo',
      value: estadisticasAlmacen?.productosStockBajo || 0,
      icon: AlertCircle,
      color: 'from-red-500 to-red-600',
      textColor: 'text-red-600',
      bgColor: 'bg-red-50',
      link: '/dashboard/stock-deposito',
    },
    {
      title: 'Stock Depósito',
      description: 'Gestionar inventario',
      icon: PackageSearch,
      color: 'from-blue-500 to-blue-600',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      link: '/dashboard/stock-deposito',
    },
    {
      title: 'Pedidos Depósito',
      description: 'Ver todos los pedidos',
      icon: Warehouse,
      color: 'from-purple-500 to-purple-600',
      textColor: 'text-purple-600',
      bgColor: 'bg-purple-50',
      link: '/dashboard/pedidos-almacen',
    },
  ] : [
    {
      title: 'Ventas de Hoy',
      value: estadisticas?.ventasHoy || 0,
      icon: ShoppingCart,
      color: 'from-green-500 to-green-600',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50',
      link: '/dashboard/ventas',
    },
    {
      title: 'Ingresos de Hoy',
      value: `$${Number(estadisticas?.totalMonto || 0).toLocaleString('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      icon: DollarSign,
      color: 'from-emerald-500 to-emerald-600',
      textColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      link: '/dashboard/reportes',
    },
    {
      title: 'Productos Activos',
      value: estadisticas?.productosActivos || 0,
      icon: Package,
      color: 'from-blue-500 to-blue-600',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      link: '/dashboard/productos',
    },
    {
      title: 'Clientes Registrados',
      value: estadisticas?.totalClientes || 0,
      icon: Users,
      color: 'from-orange-500 to-orange-600',
      textColor: 'text-orange-600',
      bgColor: 'bg-orange-50',
      link: '/dashboard/clientes',
    },
  ];

  // Acciones rápidas diferentes según el rol
  const quickActions = user?.role === Role.DEPOSITO ? [
    {
      title: 'Gestionar Stock Depósito',
      description: 'Ver y actualizar stock del almacén',
      icon: PackageSearch,
      color: 'from-blue-500 to-blue-600',
      link: '/dashboard/stock-deposito',
      buttonText: 'Ver Stock',
      visible: true,
    },
    {
      title: 'Pedidos Pendientes',
      description: 'Revisar y autorizar pedidos',
      icon: ShoppingBag,
      color: 'from-orange-500 to-orange-600',
      link: '/dashboard/pedidos-almacen?estado=PENDIENTE',
      buttonText: 'Ver Pedidos',
      visible: true,
    },
    {
      title: 'Todos los Pedidos',
      description: 'Ver historial completo de pedidos',
      icon: Warehouse,
      color: 'from-purple-500 to-purple-600',
      link: '/dashboard/pedidos-almacen',
      buttonText: 'Ver Historial',
      visible: true,
    },
  ] : [
    {
      title: 'Nueva Venta',
      description: 'Iniciar punto de venta',
      icon: ShoppingCart,
      color: 'from-green-500 to-green-600',
      link: '/pos',
      buttonText: 'Ir a POS',
      visible: user?.role === Role.VENDEDOR,
    },
    {
      title: 'Gestión de Caja',
      description: 'Abrir o cerrar caja',
      icon: DollarSign,
      color: 'from-blue-500 to-blue-600',
      link: '#',
      buttonText: 'Gestionar Caja',
      visible: user?.role === Role.VENDEDOR,
      onClick: () => {
        // setModoCaja('auto');
        setMostrarModalCaja(true);
      },
    },
    {
      title: 'Gestionar Productos',
      description: user?.role === Role.ADMIN ? 'Ver y editar productos' : 'Ver productos',
      icon: Package,
      color: 'from-green-600 to-emerald-600',
      link: '/dashboard/productos',
      buttonText: 'Ver Productos',
      visible: (user?.role as Role) !== Role.DEPOSITO,
    },
    {
      title: 'Ver Stock',
      description: 'Consultar y actualizar inventario',
      icon: Package,
      color: 'from-emerald-500 to-green-600',
      link: '/dashboard/stock',
      buttonText: 'Gestionar Stock',
      visible: (user?.role as Role) !== Role.DEPOSITO,
    },
  ].filter((item) => item.visible !== false);

  return (
    <Layout>
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bienvenido, {user?.nombre}
          </h1>
          <p className="text-gray-600">
            {user?.role === Role.ADMIN
              ? 'Panel de administración - Gestión completa del sistema'
              : user?.role === Role.DEPOSITO
              ? 'Panel de depósito - Gestión de inventario y pedidos'
              : `Vendedor en ${user?.local?.nombre || 'tu local asignado'}`}
          </p>
        </div>

        {/* Cards de estadísticas */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.title}
                to={card.link}
                className="group relative bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 border border-gray-200 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                      {loading ? (
                        <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
                      ) : (
                        <p className={`text-2xl font-bold ${card.textColor}`}>
                          {card.value !== undefined ? card.value : card.description || '0'}
                        </p>
                      )}
                    </div>
                    <div className={`p-3 rounded-lg bg-gradient-to-br ${card.color} shadow-md`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
                <div className={`h-1 bg-gradient-to-r ${card.color}`} />
              </Link>
            );
          })}
        </div>
        
        {/* Lista de pedidos pendientes para DEPOSITO */}
        {user?.role === Role.DEPOSITO && estadisticasAlmacen?.pedidos && estadisticasAlmacen.pedidos.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Pedidos Pendientes de Autorización</h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="divide-y divide-gray-200">
                {estadisticasAlmacen.pedidos.slice(0, 5).map((pedido: any) => (
                  <Link
                    key={pedido.id}
                    to={`/dashboard/pedidos-almacen`}
                    className="block p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">
                          Pedido de {pedido.local?.nombre || 'Local'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {pedido.detalles?.length || 0} productos • Solicitado por {pedido.solicitante?.nombre || 'Usuario'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(pedido.fechaSolicitud).toLocaleString('es-ES')}
                        </p>
                      </div>
                      <div className="flex items-center">
                        <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                          Pendiente
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              {estadisticasAlmacen.pedidos.length > 5 && (
                <div className="p-4 bg-gray-50 text-center">
                  <Link
                    to="/dashboard/pedidos-almacen?estado=PENDIENTE"
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Ver todos los pedidos pendientes ({estadisticasAlmacen.pedidos.length})
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Acciones rápidas */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mb-8">
          {quickActions.map((action) => {
            const Icon = action.icon;
            const content = (
              <div className="group relative bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-200 border border-gray-200 overflow-hidden">
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${action.color} opacity-10 rounded-full -mr-16 -mt-16`} />
                <div className="relative p-6">
                  <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${action.color} mb-4 shadow-md`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{action.title}</h3>
                  <p className="text-sm text-gray-600 mb-4">{action.description}</p>
                  <span className={`inline-flex items-center text-sm font-medium text-transparent bg-clip-text bg-gradient-to-r ${action.color} group-hover:underline`}>
                    {action.buttonText} →
                  </span>
                </div>
              </div>
            );

            if (action.onClick) {
              return (
                <div key={action.title} onClick={action.onClick} className="cursor-pointer">
                  {content}
                </div>
              );
            }

            return (
              <Link key={action.title} to={action.link}>
                {content}
              </Link>
            );
          })}
        </div>

        {/* Alerta de conexión */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 flex items-start">
          <div className="flex-shrink-0">
            <div className="flex items-center justify-center w-10 h-10 bg-green-500 rounded-lg">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="ml-4 flex-1">
            <h3 className="text-sm font-semibold text-green-900">Sincronización en Tiempo Real</h3>
            <p className="text-sm text-green-700 mt-1">
              El sistema está conectado y sincronizado. Los cambios de precios y alertas de stock se actualizan automáticamente.
            </p>
          </div>
        </div>
      </div>

      {/* Modal de Caja */}
      {user?.role === Role.VENDEDOR && (
        <ModalCaja
          isOpen={mostrarModalCaja}
          onClose={() => setMostrarModalCaja(false)}
          modo="auto"
          onCajaAbierta={() => {
            // Recargar datos si es necesario
          }}
        />
      )}
    </Layout>
  );
}
