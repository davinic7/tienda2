import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Layout from '@/components/Layout';
import type { AperturaCaja } from '@shared/types';
import { DollarSign, CheckCircle, XCircle } from 'lucide-react';

interface EstadoCaja {
  cajaAbierta: boolean;
  caja?: {
    id: string;
    fechaApertura: string;
    montoInicial: number;
    totalVentas: number;
    cantidadVentas: number;
    totales: {
      efectivo: number;
      credito: number;
      mixto: number;
      debito: number;
      qr: number;
      tarjetaCredito: number;
      transferencia: number;
      total: number;
    };
  };
  mensaje?: string;
}

export default function AperturaCaja() {
  const { user } = useAuthStore();
  const [estadoCaja, setEstadoCaja] = useState<EstadoCaja | null>(null);
  const [mostrarModalApertura, setMostrarModalApertura] = useState(false);
  const [mostrarModalCierre, setMostrarModalCierre] = useState(false);
  const [montoInicial, setMontoInicial] = useState<string>('0');
  const [montoFinal, setMontoFinal] = useState<string>('0');
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'VENDEDOR') {
      cargarEstadoCaja();
    }
  }, [user]);

  const cargarEstadoCaja = async () => {
    try {
      setLoading(true);
      const response = await api.get<EstadoCaja>('/caja/estado');
      setEstadoCaja(response.data);
      // response usado
    } catch (error: any) {
      toast.error('Error al cargar estado de caja');
    } finally {
      setLoading(false);
    }
  };

  const abrirCaja = async () => {
    if (!montoInicial || parseFloat(montoInicial) < 0) {
      toast.error('El monto inicial debe ser mayor o igual a 0');
      return;
    }

    try {
      await api.post('/caja/apertura', {
        montoInicial: parseFloat(montoInicial),
        observaciones: observaciones || undefined,
      });
      toast.success('Caja abierta exitosamente');
      setMostrarModalApertura(false);
      setMontoInicial('0');
      setObservaciones('');
      cargarEstadoCaja();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al abrir caja');
    }
  };

  const cerrarCaja = async () => {
    if (!montoFinal || parseFloat(montoFinal) < 0) {
      toast.error('El monto final debe ser mayor o igual a 0');
      return;
    }

    if (!estadoCaja?.caja) return;

    try {
      await api.post(`/caja/cierre/${estadoCaja.caja.id}`, {
        montoFinal: parseFloat(montoFinal),
        observaciones: observaciones || undefined,
      });
      toast.success('Caja cerrada exitosamente');
      setMostrarModalCierre(false);
      setMontoFinal('0');
      setObservaciones('');
      cargarEstadoCaja();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al cerrar caja');
    }
  };

  if (user?.role !== 'VENDEDOR') {
    return (
      <Layout>
        <div className="p-8 text-center">
          <p className="text-gray-600">Solo los vendedores pueden gestionar la caja</p>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando estado de caja...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Caja</h1>
          <p className="text-gray-600 mt-1">Apertura y cierre de caja diario</p>
        </div>

        {estadoCaja?.cajaAbierta ? (
          <div className="space-y-6">
            {/* Estado de caja abierta */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <CheckCircle className="w-6 h-6 text-green-600 mr-2" />
                  <h2 className="text-xl font-bold text-gray-900">Caja Abierta</h2>
                </div>
                <button
                  onClick={() => setMostrarModalCierre(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Cerrar Caja
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Monto Inicial</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${estadoCaja.caja?.montoInicial.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Total Ventas</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${estadoCaja.caja?.totalVentas.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Cantidad Ventas</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {estadoCaja.caja?.cantidadVentas || 0}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Efectivo Esperado</p>
                  <p className="text-2xl font-bold text-purple-600">
                    ${estadoCaja.caja ? (estadoCaja.caja.montoInicial + estadoCaja.caja.totales.efectivo).toFixed(2) : '0.00'}
                  </p>
                </div>
              </div>

              {/* Totales por método de pago */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Totales por Método de Pago</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <p className="text-xs text-gray-600">Efectivo</p>
                    <p className="text-lg font-bold text-gray-900">
                      ${estadoCaja.caja?.totales.efectivo.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <p className="text-xs text-gray-600">Crédito</p>
                    <p className="text-lg font-bold text-gray-900">
                      ${estadoCaja.caja?.totales.credito.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <p className="text-xs text-gray-600">Mixto</p>
                    <p className="text-lg font-bold text-gray-900">
                      ${estadoCaja.caja?.totales.mixto.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <p className="text-xs text-gray-600">Débito</p>
                    <p className="text-lg font-bold text-gray-900">
                      ${estadoCaja.caja?.totales.debito.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <p className="text-xs text-gray-600">QR</p>
                    <p className="text-lg font-bold text-gray-900">
                      ${estadoCaja.caja?.totales.qr.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <p className="text-xs text-gray-600">Tarjeta Crédito</p>
                    <p className="text-lg font-bold text-gray-900">
                      ${estadoCaja.caja?.totales.tarjetaCredito.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <p className="text-xs text-gray-600">Transferencia</p>
                    <p className="text-lg font-bold text-gray-900">
                      ${estadoCaja.caja?.totales.transferencia.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-xs text-gray-600">Total General</p>
                    <p className="text-lg font-bold text-green-600">
                      ${estadoCaja.caja?.totales.total.toFixed(2) || '0.00'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 text-sm text-gray-600">
                <p>Fecha de apertura: {estadoCaja.caja ? new Date(estadoCaja.caja.fechaApertura).toLocaleString() : 'N/A'}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <XCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Caja Cerrada</h2>
            <p className="text-gray-600 mb-6">
              {estadoCaja?.mensaje || 'Debes abrir una caja para realizar ventas'}
            </p>
            <button
              onClick={() => setMostrarModalApertura(true)}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-md"
            >
              <DollarSign className="w-5 h-5 inline mr-2" />
              Abrir Caja
            </button>
          </div>
        )}

        {/* Modal Apertura */}
        {mostrarModalApertura && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Abrir Caja</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monto Inicial
                  </label>
                  <input
                    type="number"
                    value={montoInicial}
                    onChange={(e) => setMontoInicial(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    min="0"
                    step="0.01"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observaciones (opcional)
                  </label>
                  <textarea
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    rows={3}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setMostrarModalApertura(false);
                    setMontoInicial('0');
                    setObservaciones('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={abrirCaja}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Abrir Caja
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Cierre */}
        {mostrarModalCierre && estadoCaja?.caja && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Cerrar Caja</h2>
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Monto Inicial</p>
                  <p className="text-xl font-bold text-gray-900">
                    ${estadoCaja.caja.montoInicial.toFixed(2)}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Total Ventas en Efectivo</p>
                  <p className="text-xl font-bold text-green-600">
                    ${estadoCaja.caja.totales.efectivo.toFixed(2)}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Monto Esperado</p>
                  <p className="text-xl font-bold text-blue-600">
                    ${(estadoCaja.caja.montoInicial + estadoCaja.caja.totales.efectivo).toFixed(2)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monto Final en Caja
                  </label>
                  <input
                    type="number"
                    value={montoFinal}
                    onChange={(e) => setMontoFinal(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    min="0"
                    step="0.01"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observaciones (opcional)
                  </label>
                  <textarea
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    rows={3}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setMostrarModalCierre(false);
                    setMontoFinal('0');
                    setObservaciones('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={cerrarCaja}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Cerrar Caja
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

