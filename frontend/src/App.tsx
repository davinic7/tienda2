import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Productos from './pages/Productos';
import Ventas from './pages/Ventas';
import Clientes from './pages/Clientes';
import Stock from './pages/Stock';
import Reportes from './pages/Reportes';
import Locales from './pages/Locales';
import Usuarios from './pages/Usuarios';
import Depositos from './pages/Depositos';
import StockDeposito from './pages/StockDeposito';
import PedidosAlmacen from './pages/PedidosAlmacen';
import Combos from './pages/Combos';
import Notificaciones from './pages/Notificaciones';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loadUser, user } = useAuthStore();

  useEffect(() => {
    if (!user && localStorage.getItem('accessToken')) {
      loadUser();
    }
  }, [loadUser, user]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}


function App() {
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token && !isAuthenticated) {
      useAuthStore.getState().loadUser();
    }
  }, [isAuthenticated]);

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pos"
          element={
            <ProtectedRoute>
              <POS />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/productos"
          element={
            <ProtectedRoute>
              <Productos />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/ventas"
          element={
            <ProtectedRoute>
              <Ventas />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/clientes"
          element={
            <ProtectedRoute>
              <Clientes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/stock"
          element={
            <ProtectedRoute>
              <Stock />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/reportes"
          element={
            <ProtectedRoute>
              <Reportes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/locales"
          element={
            <ProtectedRoute>
              <Locales />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/usuarios"
          element={
            <ProtectedRoute>
              <Usuarios />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/depositos"
          element={
            <ProtectedRoute>
              <Depositos />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/stock-deposito"
          element={
            <ProtectedRoute>
              <StockDeposito />
            </ProtectedRoute>
          }
        />
            <Route
              path="/dashboard/pedidos-almacen"
              element={
                <ProtectedRoute>
                  <PedidosAlmacen />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/combos"
              element={
                <ProtectedRoute>
                  <Combos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/notificaciones"
              element={
                <ProtectedRoute>
                  <Notificaciones />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

