import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import ModalCaja from './ModalCaja';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Store,
  TrendingUp,
  FileText,
  Box,
  LogOut,
  Menu,
  X,
  Warehouse,
  PackageSearch,
  ShoppingBag,
  Gift,
  Bell,
  AlertCircle,
  DollarSign,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mostrarModalCajaAbierta, setMostrarModalCajaAbierta] = useState(false);
  const [mostrarModalCaja, setMostrarModalCaja] = useState(false);
  const [verificandoCaja, setVerificandoCaja] = useState(false);

  const verificarEstadoCaja = async (): Promise<boolean> => {
    // Solo verificar para vendedores
    if (user?.role !== 'VENDEDOR') {
      return true; // Permitir logout a no vendedores
    }

    try {
      setVerificandoCaja(true);
      const response = await api.get('/caja/estado');
      const cajaAbierta = response.data.cajaAbierta;
      
      if (cajaAbierta) {
        setMostrarModalCajaAbierta(true);
        return false; // Bloquear logout
      }
      
      return true; // Permitir logout
    } catch (error: any) {
      console.error('Error al verificar estado de caja:', error);
      // En caso de error, permitir logout para no bloquear al usuario
      return true;
    } finally {
      setVerificandoCaja(false);
    }
  };

  const handleLogout = async () => {
    // Verificar estado de caja antes de cerrar sesión
    const puedeCerrarSesion = await verificarEstadoCaja();
    
    if (!puedeCerrarSesion) {
      // El modal de advertencia se mostrará automáticamente
      return;
    }

    // Si la caja está cerrada, proceder con el logout
    logout();
    navigate('/login');
  };

  const handleCerrarCajaYLogout = async () => {
    setMostrarModalCajaAbierta(false);
    setMostrarModalCaja(true);
  };

  // Bloquear scroll del body cuando el menú móvil está abierto
  useEffect(() => {
    if (sidebarOpen) {
      // Guardar el scroll actual
      const scrollY = window.scrollY;
      // Bloquear scroll del body
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      // Restaurar scroll del body
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }

    // Cleanup al desmontar
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  const menuItems = [
    // Dashboard - todos los roles
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, visible: true },
    
    // Menú específico para ALMACEN
    { path: '/dashboard/stock-deposito', label: 'Stock Depósito', icon: PackageSearch, visible: user?.role === 'ADMIN' || user?.role === 'ALMACEN' },
    { path: '/dashboard/pedidos-almacen', label: 'Pedidos Almacén', icon: ShoppingBag, visible: user?.role === 'ADMIN' || user?.role === 'ALMACEN' || user?.role === 'VENDEDOR' },
    { path: '/dashboard/depositos', label: 'Depósitos', icon: Warehouse, visible: user?.role === 'ADMIN' },
    
    // Menú para VENDEDOR
    { path: '/pos', label: 'Punto de Venta', icon: ShoppingCart, visible: user?.role === 'VENDEDOR' },
    
    // Menú para ADMIN
    { path: '/dashboard/productos', label: 'Productos', icon: Package, visible: user?.role === 'ADMIN' },
    { path: '/dashboard/combos', label: 'Combos', icon: Gift, visible: user?.role === 'ADMIN' },
    { path: '/dashboard/locales', label: 'Locales', icon: Store, visible: user?.role === 'ADMIN' },
    { path: '/dashboard/usuarios', label: 'Usuarios', icon: Users, visible: user?.role === 'ADMIN' },
    
    // Menú compartido (no para ALMACEN)
    { path: '/dashboard/ventas', label: 'Ventas', icon: FileText, visible: user?.role !== 'ALMACEN' },
    { path: '/dashboard/clientes', label: 'Clientes', icon: Users, visible: user?.role !== 'ALMACEN' },
    { path: '/dashboard/stock', label: 'Stock', icon: Box, visible: user?.role !== 'ALMACEN' },
    { path: '/dashboard/reportes', label: 'Reportes', icon: TrendingUp, visible: user?.role !== 'ALMACEN' },
    { path: '/dashboard/notificaciones', label: 'Notificaciones', icon: Bell, visible: user?.role !== 'ALMACEN' },
  ].filter((item) => item.visible);

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Sidebar para desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 shadow-lg">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 px-6 py-6 border-b border-gray-200">
            <div className="flex items-center">
              <img src="/logo.svg" alt="lolo DRUGSTORE" className="h-12 w-12 flex-shrink-0" />
              <div className="ml-3">
                <h1 className="text-lg font-bold text-gray-900">lolo DRUGSTORE</h1>
                <p className="text-xs text-gray-500">Sistema POS</p>
              </div>
            </div>
          </div>

          {/* Navegación */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    active
                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`w-5 h-5 mr-3 ${active ? 'text-white' : 'text-gray-400'}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Footer del sidebar - Usuario */}
          <div className="flex-shrink-0 p-4 border-t border-gray-200">
            <div className="flex items-center px-4 py-3 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {user?.nombre.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.nombre}</p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.role} {user?.local?.nombre && `• ${user.local.nombre}`}
                </p>
              </div>
              <button
                onClick={handleLogout}
                disabled={verificandoCaja}
                className="ml-2 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Cerrar sesión"
              >
                {verificandoCaja ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400"></div>
                ) : (
                  <LogOut className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-75" 
            onClick={() => setSidebarOpen(false)}
            style={{ touchAction: 'none' }}
          />
          <div className="relative flex flex-col w-full max-w-xs bg-white h-full shadow-xl">
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-4 border-b border-gray-200">
              <div className="flex items-center">
                <img src="/logo.svg" alt="lolo DRUGSTORE" className="h-10 w-10 flex-shrink-0" />
                <div className="ml-3">
                  <h1 className="text-lg font-bold text-gray-900">lolo DRUGSTORE</h1>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-2 py-4" style={{ WebkitOverflowScrolling: 'touch' }}>
              <nav className="space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center px-4 py-3 text-base font-medium rounded-lg ${
                        active
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-6 h-6 mr-3" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="flex-shrink-0 p-4 border-t border-gray-200">
              <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {user?.nombre.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900">{user?.nombre}</p>
                  <p className="text-xs text-gray-500">{user?.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  disabled={verificandoCaja}
                  className="ml-2 p-2 text-gray-400 hover:text-red-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {verificandoCaja ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400"></div>
                  ) : (
                    <LogOut className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top bar para mobile */}
        <div className="sticky top-0 z-10 lg:hidden flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
          >
            <Menu className="w-6 h-6" />
          </button>
                <div className="flex items-center">
                  <img src="/logo.svg" alt="lolo" className="h-8 w-8 flex-shrink-0" />
                  <span className="ml-2 font-bold text-gray-900">lolo</span>
                </div>
          <div className="w-10" />
        </div>

        {/* Contenido */}
        <main className="flex-1">{children}</main>
      </div>

      {/* Modal de advertencia: Caja abierta */}
      {mostrarModalCajaAbierta && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setMostrarModalCajaAbierta(false)}
            />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                <div className="flex items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                    <h3 className="text-lg leading-6 font-bold text-gray-900">
                      No puedes cerrar sesión
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Tienes una caja abierta. Debes cerrar la caja antes de cerrar sesión.
                      </p>
                    </div>
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center">
                        <DollarSign className="w-5 h-5 text-yellow-600 mr-2" />
                        <p className="text-sm font-medium text-yellow-800">
                          Por seguridad, todas las cajas deben estar cerradas antes de cerrar sesión.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleCerrarCajaYLogout}
                  className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto"
                >
                  Cerrar Caja y Salir
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMostrarModalCajaAbierta(false);
                    navigate('/pos');
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:mt-0 sm:w-auto"
                >
                  Ir al Punto de Venta
                </button>
                <button
                  type="button"
                  onClick={() => setMostrarModalCajaAbierta(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Caja */}
      <ModalCaja
        isOpen={mostrarModalCaja}
        onClose={() => setMostrarModalCaja(false)}
        modo="cierre"
        onCajaCerrada={() => {
          // Después de cerrar la caja exitosamente, proceder con logout
          setMostrarModalCaja(false);
          logout();
          navigate('/login');
        }}
      />
    </div>
  );
}

