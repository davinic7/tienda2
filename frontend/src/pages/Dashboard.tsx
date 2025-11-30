import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getSocket, onPrecioActualizado, onStockBajo, onNuevaVenta, offNuevaVenta, onClienteCambiado, offClienteCambiado } from '@/lib/socket';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import Layout from '@/components/Layout';
import ModalCaja from '@/components/ModalCaja';
import toast from 'react-hot-toast';
import { TrendingUp, DollarSign, ShoppingCart, Users, Package, AlertCircle } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuthStore();
  const [mostrarModalCaja, setMostrarModalCaja] = useState(false);
  const [modoCaja, setModoCaja] = useState<'apertura' | 'cierre' | 'auto'>('auto');
  const [estadisticas, setEstadisticas] = useState<any>(null);
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
      // Obtener resumen del día
      const hoy = new Date().toISOString().split('T')[0];
      const response = await api.get(`/reportes/resumen?fechaDesde=${hoy}&fechaHasta=${hoy}`);
      setEstadisticas(response.data.resumen);
    } catch (error: any) {
      console.error('Error al cargar estadísticas:', error);
    } finally {
      setLoading(false);
    }
  }, []);

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

  const cards = [
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

  const quickActions = [
    {
      title: 'Nueva Venta',
      description: 'Iniciar punto de venta',
      icon: ShoppingCart,
      color: 'from-green-500 to-green-600',
      link: '/pos',
      buttonText: 'Ir a POS',
      visible: user?.role === 'VENDEDOR',
    },
    {
      title: 'Gestión de Caja',
      description: 'Abrir o cerrar caja',
      icon: DollarSign,
      color: 'from-blue-500 to-blue-600',
      link: '#',
      buttonText: 'Gestionar Caja',
      visible: user?.role === 'VENDEDOR',
      onClick: () => {
        setModoCaja('auto');
        setMostrarModalCaja(true);
      },
    },
    {
      title: 'Gestionar Productos',
      description: user?.role === 'ADMIN' ? 'Ver y editar productos' : 'Ver productos',
      icon: Package,
      color: 'from-green-600 to-emerald-600',
      link: '/dashboard/productos',
      buttonText: 'Ver Productos',
      visible: true,
    },
    {
      title: 'Ver Stock',
      description: 'Consultar y actualizar inventario',
      icon: Package,
      color: 'from-emerald-500 to-green-600',
      link: '/dashboard/stock',
      buttonText: 'Gestionar Stock',
      visible: true,
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
            {user?.role === 'ADMIN'
              ? 'Panel de administración - Gestión completa del sistema'
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
                        <p className={`text-2xl font-bold ${card.textColor}`}>{card.value}</p>
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
      {user?.role === 'VENDEDOR' && (
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
