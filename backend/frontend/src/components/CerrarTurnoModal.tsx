import { useState } from 'react';
import { X, DollarSign, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react';
import { api } from '../utils/api';
import { Turno } from '../types';
import toast from 'react-hot-toast';
import ConfirmDialog from './ConfirmDialog';

interface CerrarTurnoModalProps {
  isOpen: boolean;
  onClose: () => void;
  turno: Turno;
  onTurnoCerrado: () => void;
  esDesdeLogout?: boolean;
}

const CerrarTurnoModal = ({ isOpen, onClose, turno, onTurnoCerrado, esDesdeLogout = false }: CerrarTurnoModalProps) => {
  const [efectivoFinal, setEfectivoFinal] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  if (!isOpen) return null;

  const efectivoEsperado = turno.efectivo_esperado || 
    (Number(turno.efectivo_inicial) + (turno.totalVentas || 0));

  const validarEfectivo = () => {
    const efectivo = parseFloat(efectivoFinal);
    if (isNaN(efectivo) || efectivo < 0) {
      toast.error('El efectivo final debe ser un número válido');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validarEfectivo()) return;

    setMostrarConfirmacion(true);
  };

  const ejecutarCierre = async () => {
    if (!validarEfectivo()) return;

    const efectivo = parseFloat(efectivoFinal);
    setLoading(true);
    setMostrarConfirmacion(false);

    try {
      await api.post(`/turnos/${turno.id}/cerrar`, {
        efectivo_final: efectivo,
        observaciones: observaciones || undefined
      });

      toast.success('Turno cerrado exitosamente');
      onTurnoCerrado();
      onClose();
      
      // Reset form
      setEfectivoFinal('');
      setObservaciones('');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al cerrar el turno');
    } finally {
      setLoading(false);
    }
  };

  const diferencia = efectivoFinal 
    ? parseFloat(efectivoFinal) - efectivoEsperado 
    : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {esDesdeLogout ? 'Cerrar Turno para Cerrar Sesión' : 'Cerrar Turno'}
          </h2>
          {!esDesdeLogout && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="p-6 space-y-4">
          {/* Resumen del Turno */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-gray-900">Resumen del Turno</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Local:</span>
                <span className="ml-2 font-medium">{turno.local?.nombre}</span>
              </div>
              <div>
                <span className="text-gray-600">Ventas:</span>
                <span className="ml-2 font-medium">{turno.cantidadVentas || 0}</span>
              </div>
              <div>
                <span className="text-gray-600">Total Ventas:</span>
                <span className="ml-2 font-medium">
                  ${(turno.totalVentas || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Efectivo Inicial:</span>
                <span className="ml-2 font-medium">
                  ${Number(turno.efectivo_inicial).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600">Efectivo Esperado:</span>
                <span className="ml-2 font-medium text-primary-600">
                  ${efectivoEsperado.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Efectivo Final
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={efectivoFinal}
                onChange={(e) => setEfectivoFinal(e.target.value)}
                className="input"
                placeholder="0.00"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Ingresa la cantidad de efectivo que hay en la caja al cerrar el turno
              </p>
            </div>

            {/* Diferencia */}
            {diferencia !== null && (
              <div className={`p-3 rounded-lg flex items-center gap-2 ${
                diferencia === 0 
                  ? 'bg-green-50 border border-green-200'
                  : diferencia > 0
                  ? 'bg-blue-50 border border-blue-200'
                  : 'bg-red-50 border border-red-200'
              }`}>
                {diferencia === 0 ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : diferencia > 0 ? (
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600" />
                )}
                <div>
                  <div className="text-sm font-medium text-gray-700">Diferencia:</div>
                  <div className={`text-lg font-bold ${
                    diferencia === 0 
                      ? 'text-green-600'
                      : diferencia > 0
                      ? 'text-blue-600'
                      : 'text-red-600'
                  }`}>
                    {diferencia > 0 ? '+' : ''}
                    ${diferencia.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="label">Observaciones (opcional)</label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="input"
                rows={3}
                placeholder="Notas sobre el cierre del turno..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              {!esDesdeLogout && (
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 btn btn-secondary"
                  disabled={loading}
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                className={esDesdeLogout ? "w-full btn btn-primary" : "flex-1 btn btn-primary"}
                disabled={loading || !efectivoFinal}
              >
                {loading ? 'Cerrando...' : 'Cerrar Turno'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Diálogo de confirmación */}
      <ConfirmDialog
        isOpen={mostrarConfirmacion}
        onClose={() => {
          // Si es desde logout, no permitir cancelar
          if (esDesdeLogout) {
            toast.error('Debes cerrar el turno para poder cerrar sesión');
            return;
          }
          setMostrarConfirmacion(false);
        }}
        onConfirm={ejecutarCierre}
        title={esDesdeLogout ? "Confirmar Cierre de Turno y Sesión" : "Confirmar Cierre de Turno"}
        message={`¿Estás seguro de que deseas cerrar el turno?${esDesdeLogout ? ' Esto cerrará tu sesión automáticamente.' : ''}\n\n` +
          `Local: ${turno.local?.nombre}\n` +
          `Ventas realizadas: ${turno.cantidadVentas || 0}\n` +
          `Total de ventas: $${(turno.totalVentas || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}\n` +
          `Efectivo inicial: $${Number(turno.efectivo_inicial).toLocaleString('es-ES', { minimumFractionDigits: 2 })}\n` +
          `Efectivo esperado: $${efectivoEsperado.toLocaleString('es-ES', { minimumFractionDigits: 2 })}\n` +
          `Efectivo final: $${Number(efectivoFinal).toLocaleString('es-ES', { minimumFractionDigits: 2 })}` +
          (diferencia !== null ? `\nDiferencia: ${diferencia >= 0 ? '+' : ''}$${diferencia.toLocaleString('es-ES', { minimumFractionDigits: 2 })}` : '') +
          `\n\nUna vez cerrado, no podrás realizar más ventas hasta abrir un nuevo turno.`}
        confirmText="Sí, cerrar turno"
        cancelText={esDesdeLogout ? undefined : "Cancelar"}
        variant={diferencia !== null && diferencia < 0 ? 'danger' : 'warning'}
        isLoading={loading}
        noCancelar={esDesdeLogout}
      />
    </div>
  );
};

export default CerrarTurnoModal;

