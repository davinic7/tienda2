import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Warehouse,
  LogOut,
  Menu,
  Building2,
  UserPlus,
  Receipt,
  Circle,
  BarChart3,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Turno, Local } from '../types';
import AbrirTurnoModal from './AbrirTurnoModal';
import CerrarTurnoModal from './CerrarTurnoModal';
import toast from 'react-hot-toast';

export default function Layout() {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [turnoActivo, setTurnoActivo] = useState<Turno | null>(null);
  const [mostrarAbrirTurno, setMostrarAbrirTurno] = useState(false);
  const [mostrarCerrarTurno, setMostrarCerrarTurno] = useState(false);
  const [cerrarTurnoDesdeLogout, setCerrarTurnoDesdeLogout] = useState(false);
  const [locales, setLocales] = useState<Local[]>([]);

  // Cargar turno activo y locales
  useEffect(() => {
    if (user?.role === 'VENDEDOR') {
      cargarTurnoActivo();
      cargarLocales();
    }
  }, [user]);

  // Escuchar eventos de cambio de turno desde otros componentes
  useEffect(() => {
    const handleTurnoActualizado = () => {
      // Recargar el turno activo cuando otro componente lo actualiza
      cargarTurnoActivo();
    };

    window.addEventListener('turno:actualizado', handleTurnoActualizado);
    return () => {
      window.removeEventListener('turno:actualizado', handleTurnoActualizado);
    };
  }, []);

  // Verificar si se debe forzar abrir turno (después de login)
  useEffect(() => {
    if (user?.role === 'VENDEDOR' && locales.length > 0) {
      // Verificar si hay un turno activo después de cargar
      const checkTurno = async () => {
        try {
          const response = await api.get<{ turno: Turno | null }>('/turnos/activo');
          if (response.data.turno) {
            // Hay turno activo, actualizar el estado y cerrar modal si está abierto
            setTurnoActivo(response.data.turno);
            setMostrarAbrirTurno(false);
          } else {
            // No hay turno activo, forzar abrir
            setTurnoActivo(null);
            setMostrarAbrirTurno(true);
          }
        } catch (error) {
          // Si hay error, verificar si ya tenemos un turno activo cargado
          // Si no hay turno activo en el estado, forzar abrir
          if (!turnoActivo) {
            setMostrarAbrirTurno(true);
          }
        }
      };
      
      // Esperar un momento para que cargue el turno
      const timer = setTimeout(() => {
        checkTurno();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [user, locales]);

  const cargarTurnoActivo = async () => {
    try {
      const response = await api.get<{ turno: Turno | null }>('/turnos/activo');
      const turno = response.data.turno;
      setTurnoActivo(turno);
      
      // Si hay turno activo, cerrar el modal de abrir turno si está abierto
      if (turno) {
        setMostrarAbrirTurno(false);
      } else {
        // Si no hay turno activo, mostrar el modal
        setMostrarAbrirTurno(true);
      }
    } catch (error) {
      // Silencioso, puede que no haya turno
      // Si no hay turno activo en el estado, mostrar modal
      if (!turnoActivo) {
        setMostrarAbrirTurno(true);
      }
    }
  };

  const cargarLocales = async () => {
    try {
      const localesData = localStorage.getItem('localesDisponibles');
      if (localesData) {
        setLocales(JSON.parse(localesData));
      } else {
        const response = await api.get<{ locales: Local[] }>('/locales?activo=true');
        setLocales(response.data.locales);
      }
    } catch (error) {
      console.error('Error al cargar locales:', error);
    }
  };

  const handleTurnoAbierto = (turno: Turno) => {
    setTurnoActivo(turno);
    setMostrarAbrirTurno(false); // Asegurar que el modal se cierre
    // Emitir evento para que otros componentes se actualicen
    window.dispatchEvent(new CustomEvent('turno:actualizado', { detail: turno }));
    toast.success('Turno abierto exitosamente');
  };

  const handleTurnoCerrado = async () => {
    setTurnoActivo(null);
    setMostrarCerrarTurno(false);
    toast.success('Turno cerrado exitosamente');
    
    // Si se cerró desde logout, cerrar sesión automáticamente
    if (cerrarTurnoDesdeLogout) {
      setCerrarTurnoDesdeLogout(false);
      await logout();
    }
  };

  // Menú ordenado según prioridades de cada rol
  const navigationAdmin = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, priority: 1 },
    { name: 'Analytics', href: '/analytics', icon: BarChart3, priority: 2 },
    { name: 'Locales', href: '/locales', icon: Building2, priority: 3 },
    { name: 'Usuarios', href: '/usuarios', icon: UserPlus, priority: 4 },
    { name: 'Ventas', href: '/ventas', icon: ShoppingCart, priority: 5 },
    { name: 'Historial', href: '/historial-ventas', icon: Receipt, priority: 6 },
    { name: 'Productos', href: '/productos', icon: Package, priority: 7 },
    { name: 'Clientes', href: '/clientes', icon: Users, priority: 8 },
    { name: 'Stock', href: '/stock', icon: Warehouse, priority: 9 },
  ];

  const navigationVendedor = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, priority: 1 },
    { name: 'Ventas', href: '/ventas', icon: ShoppingCart, priority: 2 },
    { name: 'Productos', href: '/productos', icon: Package, priority: 3 },
    { name: 'Stock', href: '/stock', icon: Warehouse, priority: 4 },
    { name: 'Clientes', href: '/clientes', icon: Users, priority: 5 },
    { name: 'Historial', href: '/historial-ventas', icon: Receipt, priority: 6 },
  ];

  // Seleccionar navegación según el rol
  const filteredNavigation = user?.role === 'ADMIN' 
    ? navigationAdmin.sort((a, b) => a.priority - b.priority)
    : navigationVendedor.sort((a, b) => a.priority - b.priority);

  // Colores según el rol
  const isAdmin = user?.role === 'ADMIN';
  const borderColor = isAdmin ? 'border-blue-200' : 'border-green-200';
  const textColor = isAdmin ? 'text-blue-600' : 'text-green-600';
  const activeBg = isAdmin ? 'bg-blue-100' : 'bg-green-100';
  const activeText = isAdmin ? 'text-blue-900' : 'text-green-900';

  return (
    <div className={`min-h-screen ${isAdmin ? 'bg-blue-50' : 'bg-green-50'}`}>
      {/* Sidebar móvil */}
      <div
        className={`fixed inset-0 z-40 lg:hidden ${
          sidebarOpen ? 'block' : 'hidden'
        }`}
      >
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75"
          onClick={() => setSidebarOpen(false)}
        />
        <div className={`fixed inset-y-0 left-0 flex w-64 flex-col bg-white shadow-xl border-r ${borderColor}`}>
          <SidebarContent
            navigation={filteredNavigation}
            user={user}
            location={location}
            onLinkClick={() => setSidebarOpen(false)}
            textColor={textColor}
            activeBg={activeBg}
            activeText={activeText}
          />
        </div>
      </div>

      {/* Sidebar desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className={`flex flex-col flex-grow bg-white border-r ${borderColor}`}>
          <SidebarContent
            navigation={filteredNavigation}
            user={user}
            location={location}
            textColor={textColor}
            activeBg={activeBg}
            activeText={activeText}
          />
        </div>
      </div>

      {/* Contenido principal */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Header */}
        <header className={`sticky top-0 z-10 bg-white border-b ${borderColor} shadow-sm`}>
          <div className="flex items-center justify-between px-4 py-4 sm:px-6">
            <button
              type="button"
              className="lg:hidden text-gray-500 hover:text-gray-900"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center space-x-4">
              {/* Indicador de Turno para Vendedores */}
              {user?.role === 'VENDEDOR' && (
                <div className="flex items-center gap-2">
                  {turnoActivo ? (
                    <>
                      <div className="flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-200 rounded-lg">
                        <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                        <span className="text-sm font-medium text-green-700">
                          Turno Abierto
                        </span>
                        <span className="text-xs text-green-600">
                          {turnoActivo.local?.nombre}
                        </span>
                      </div>
                      <button
                        onClick={() => setMostrarCerrarTurno(true)}
                        className="btn btn-secondary text-sm py-1 px-3"
                      >
                        Cerrar Turno
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setMostrarAbrirTurno(true)}
                      className="btn btn-primary text-sm py-1 px-3"
                    >
                      Abrir Turno
                    </button>
                  )}
                </div>
              )}
              <div className="flex items-center space-x-2">
                <div
                  className={`h-2 w-2 rounded-full ${
                    connected ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span className="text-sm text-gray-600">
                  {connected ? 'Conectado' : 'Desconectado'}
                </span>
              </div>
              <div className="hidden sm:block text-sm">
                <p className="font-medium text-gray-900">{user?.nombre}</p>
                <p className="text-gray-500">
                  {user?.role} {user?.local?.nombre && `- ${user.local.nombre}`}
                </p>
              </div>
              <button
                onClick={async () => {
                  // Si es vendedor y hay turno activo, mostrar modal de cerrar turno primero
                  if (user?.role === 'VENDEDOR' && turnoActivo) {
                    setCerrarTurnoDesdeLogout(true);
                    setMostrarCerrarTurno(true);
                  } else {
                    await logout();
                  }
                }}
                className="btn btn-secondary flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className={`flex-1 p-4 sm:p-6 ${isAdmin ? 'bg-blue-50' : 'bg-green-50'}`}>
          <div className="bg-white rounded-lg shadow-sm p-6 min-h-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Modales de Turno */}
      {user?.role === 'VENDEDOR' && (
        <>
          <AbrirTurnoModal
            isOpen={mostrarAbrirTurno && !turnoActivo}
            onClose={() => {
              // Si es obligatorio (no hay turno activo), no permitir cerrar
              if (!turnoActivo) {
                toast.error('Debes abrir un turno para continuar');
                return;
              }
              setMostrarAbrirTurno(false);
            }}
            locales={locales}
            onTurnoAbierto={handleTurnoAbierto}
            esObligatorio={!turnoActivo}
          />
          {turnoActivo && (
            <CerrarTurnoModal
              isOpen={mostrarCerrarTurno}
              onClose={() => {
                // Si se está intentando cerrar sesión, no permitir cancelar
                if (cerrarTurnoDesdeLogout) {
                  toast.error('Debes cerrar el turno para poder cerrar sesión');
                  return; // No cerrar el modal
                }
                setMostrarCerrarTurno(false);
              }}
              turno={turnoActivo}
              onTurnoCerrado={handleTurnoCerrado}
              esDesdeLogout={cerrarTurnoDesdeLogout}
            />
          )}
        </>
      )}
    </div>
  );
}

const SidebarContent = ({
  navigation,
  user,
  location,
  onLinkClick,
  textColor,
  activeBg,
  activeText,
}: {
  navigation: any[];
  user: any;
  location: any;
  onLinkClick?: () => void;
  textColor?: string;
  activeBg?: string;
  activeText?: string;
}) => {
  const isAdmin = user?.role === 'ADMIN';
  const titleColor = textColor || (isAdmin ? 'text-blue-600' : 'text-green-600');
  
  return (
    <>
      <div className={`flex items-center flex-shrink-0 px-4 py-4 border-b ${isAdmin ? 'border-blue-200' : 'border-green-200'} ${isAdmin ? 'bg-blue-50' : 'bg-green-50'}`}>
        <h1 className={`text-xl font-bold ${titleColor}`}>POS Multi-local</h1>
        <span className={`ml-2 text-xs px-2 py-1 rounded-full ${isAdmin ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
          {isAdmin ? 'ADMIN' : 'VENDEDOR'}
        </span>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={onLinkClick}
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? `${activeBg || 'bg-primary-100'} ${activeText || 'text-primary-900'}`
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="flex-shrink-0 p-4 border-t border-gray-200">
        <div className="text-sm">
          <p className="font-medium text-gray-900">{user?.nombre}</p>
          <p className="text-gray-500 text-xs">{user?.email}</p>
        </div>
      </div>
    </>
  );
};

