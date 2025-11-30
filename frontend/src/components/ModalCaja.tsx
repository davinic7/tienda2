import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { DollarSign, X, CheckCircle, AlertCircle } from 'lucide-react';

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

interface ModalCajaProps {
  isOpen: boolean;
  onClose: () => void;
  onCajaAbierta?: () => void;
  modo?: 'apertura' | 'cierre' | 'auto'; // auto: detecta automáticamente
}

export default function ModalCaja({ isOpen, onClose, onCajaAbierta, modo = 'auto' }: ModalCajaProps) {
  const { user } = useAuthStore();
  const [estadoCaja, setEstadoCaja] = useState<EstadoCaja | null>(null);
  const [montoInicial, setMontoInicial] = useState<string>('0');
  const [montoFinal, setMontoFinal] = useState<string>('0');
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(false);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    if (isOpen && user?.role === 'VENDEDOR') {
      cargarEstadoCaja();
    }
  }, [isOpen, user]);

  const cargarEstadoCaja = async () => {
    try {
      setLoading(true);
      const response = await api.get<EstadoCaja>('/caja/estado');
      setEstadoCaja(response.data);
      void response; // Usado para setEstadoCaja
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
      setProcesando(true);
      await api.post('/caja/apertura', {
        montoInicial: parseFloat(montoInicial),
        observaciones: observaciones || undefined,
      });
      toast.success('Caja abierta exitosamente');
      setMontoInicial('0');
      setObservaciones('');
      await cargarEstadoCaja();
      if (onCajaAbierta) {
        onCajaAbierta();
      }
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al abrir caja');
    } finally {
      setProcesando(false);
    }
  };

  const cerrarCaja = async () => {
    if (!montoFinal || parseFloat(montoFinal) < 0) {
      toast.error('El monto final debe ser mayor o igual a 0');
      return;
    }

    if (!estadoCaja?.caja) return;

    try {
      setProcesando(true);
      await api.post(`/caja/cierre/${estadoCaja.caja.id}`, {
        montoFinal: parseFloat(montoFinal),
        observaciones: observaciones || undefined,
      });
      toast.success('Caja cerrada exitosamente');
      setMontoFinal('0');
      setObservaciones('');
      await cargarEstadoCaja();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al cerrar caja');
    } finally {
      setProcesando(false);
    }
  };

  if (!isOpen) return null;

  if (user?.role !== 'VENDEDOR') {
    return null;
  }

  const mostrarApertura = modo === 'apertura' || (modo === 'auto' && !estadoCaja?.cajaAbierta);
  const mostrarCierre = modo === 'cierre' || (modo === 'auto' && estadoCaja?.cajaAbierta);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg mr-3">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {mostrarApertura ? 'Abrir Caja' : 'Cerrar Caja'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {mostrarApertura 
                  ? 'Ingresa el monto inicial para comenzar a operar'
                  : 'Ingresa el monto final y revisa el resumen'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Cargando estado de caja...</p>
            </div>
          ) : mostrarApertura ? (
            /* Modal Apertura */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto Inicial <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={montoInicial}
                  onChange={(e) => setMontoInicial(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
                  min="0"
                  step="0.01"
                  autoFocus
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observaciones (opcional)
                </label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={3}
                  placeholder="Notas sobre la apertura de caja..."
                />
              </div>
            </div>
          ) : mostrarCierre && estadoCaja?.caja ? (
            /* Modal Cierre */
            <div className="space-y-4">
              {/* Resumen de caja */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Monto Inicial:</span>
                  <span className="text-lg font-bold text-gray-900">
                    ${estadoCaja.caja.montoInicial.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Ventas en Efectivo:</span>
                  <span className="text-lg font-bold text-green-600">
                    ${estadoCaja.caja.totales.efectivo.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <span className="text-sm font-medium text-gray-700">Monto Esperado:</span>
                  <span className="text-xl font-bold text-blue-600">
                    ${(estadoCaja.caja.montoInicial + estadoCaja.caja.totales.efectivo).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Cantidad de Ventas:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {estadoCaja.caja.cantidadVentas}
                  </span>
                </div>
              </div>

              {/* Totales por método de pago */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Totales por Método de Pago</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between p-2 bg-white border border-gray-200 rounded">
                    <span className="text-gray-600">Efectivo:</span>
                    <span className="font-medium">${estadoCaja.caja.totales.efectivo.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-white border border-gray-200 rounded">
                    <span className="text-gray-600">Crédito:</span>
                    <span className="font-medium">${estadoCaja.caja.totales.credito.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-white border border-gray-200 rounded">
                    <span className="text-gray-600">Mixto:</span>
                    <span className="font-medium">${estadoCaja.caja.totales.mixto.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-white border border-gray-200 rounded">
                    <span className="text-gray-600">Débito:</span>
                    <span className="font-medium">${estadoCaja.caja.totales.debito.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-white border border-gray-200 rounded">
                    <span className="text-gray-600">QR:</span>
                    <span className="font-medium">${estadoCaja.caja.totales.qr.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-white border border-gray-200 rounded">
                    <span className="text-gray-600">Tarjeta Crédito:</span>
                    <span className="font-medium">${estadoCaja.caja.totales.tarjetaCredito.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-white border border-gray-200 rounded">
                    <span className="text-gray-600">Transferencia:</span>
                    <span className="font-medium">${estadoCaja.caja.totales.transferencia.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-green-50 border border-green-200 rounded">
                    <span className="text-gray-700 font-medium">Total General:</span>
                    <span className="font-bold text-green-600">${estadoCaja.caja.totales.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Campos de cierre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto Final en Caja <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={montoFinal}
                  onChange={(e) => setMontoFinal(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
                  min="0"
                  step="0.01"
                  autoFocus
                  placeholder="0.00"
                />
                {montoFinal && estadoCaja.caja && (
                  <div className="mt-2 text-sm">
                    {parseFloat(montoFinal) !== (estadoCaja.caja.montoInicial + estadoCaja.caja.totales.efectivo) && (
                      <div className="flex items-center text-orange-600">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        <span>
                          Diferencia: ${(
                            parseFloat(montoFinal) - 
                            (estadoCaja.caja.montoInicial + estadoCaja.caja.totales.efectivo)
                          ).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observaciones (opcional)
                </label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={3}
                  placeholder="Notas sobre el cierre de caja..."
                />
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={procesando}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          {mostrarApertura ? (
            <button
              onClick={abrirCaja}
              disabled={procesando || !montoInicial || parseFloat(montoInicial) < 0}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {procesando ? 'Abriendo...' : 'Abrir Caja'}
            </button>
          ) : (
            <button
              onClick={cerrarCaja}
              disabled={procesando || !montoFinal || parseFloat(montoFinal) < 0}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {procesando ? 'Cerrando...' : 'Cerrar Caja'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

