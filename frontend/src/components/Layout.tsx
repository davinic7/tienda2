import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
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
  DollarSign,
  Gift,
  Bell,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, visible: true },
    { path: '/pos', label: 'Punto de Venta', icon: ShoppingCart, visible: user?.role === 'VENDEDOR' },
    { path: '/dashboard/productos', label: 'Productos', icon: Package, visible: user?.role === 'ADMIN' },
    { path: '/dashboard/combos', label: 'Combos', icon: Gift, visible: user?.role === 'ADMIN' },
    { path: '/dashboard/ventas', label: 'Ventas', icon: FileText, visible: true },
    { path: '/dashboard/clientes', label: 'Clientes', icon: Users, visible: true },
    { path: '/dashboard/stock', label: 'Stock', icon: Box, visible: true },
    { path: '/dashboard/reportes', label: 'Reportes', icon: TrendingUp, visible: true },
    { path: '/dashboard/notificaciones', label: 'Notificaciones', icon: Bell, visible: true },
    { path: '/dashboard/locales', label: 'Locales', icon: Store, visible: user?.role === 'ADMIN' },
    { path: '/dashboard/usuarios', label: 'Usuarios', icon: Users, visible: user?.role === 'ADMIN' },
        { path: '/dashboard/depositos', label: 'Depósitos', icon: Warehouse, visible: user?.role === 'ADMIN' },
        { path: '/dashboard/stock-deposito', label: 'Stock Depósito', icon: PackageSearch, visible: user?.role === 'ADMIN' },
        { path: '/dashboard/pedidos-almacen', label: 'Pedidos Almacén', icon: ShoppingBag, visible: true },
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
                className="ml-2 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Cerrar sesión"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex flex-col w-full max-w-xs bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                onClick={() => setSidebarOpen(false)}
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-4">
                <img src="/logo.svg" alt="lolo DRUGSTORE" className="h-10 w-10 flex-shrink-0" />
                <div className="ml-3">
                  <h1 className="text-lg font-bold text-gray-900">lolo DRUGSTORE</h1>
                </div>
              </div>
              <nav className="mt-5 px-2 space-y-1">
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
                  className="ml-2 p-2 text-gray-400 hover:text-red-600 rounded-lg"
                >
                  <LogOut className="w-5 h-5" />
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
    </div>
  );
}

