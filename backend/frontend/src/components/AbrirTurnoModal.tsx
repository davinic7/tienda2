import { useState, useEffect } from 'react';
import { X, DollarSign } from 'lucide-react';
import { api } from '../utils/api';
import { Local, Turno } from '../types';
import toast from 'react-hot-toast';

interface AbrirTurnoModalProps {
  isOpen: boolean;
  onClose: () => void;
  locales: Local[];
  onTurnoAbierto: (turno: Turno) => void;
  esObligatorio?: boolean; // Si es true, no se puede cancelar
}

const AbrirTurnoModal = ({ isOpen, onClose, locales, onTurnoAbierto, esObligatorio = false }: AbrirTurnoModalProps) => {
  const [localSeleccionado, setLocalSeleccionado] = useState('');
  const [efectivoInicial, setEfectivoInicial] = useState('');
  const [loading, setLoading] = useState(false);

  // Preseleccionar el primer local si hay solo uno, o el último usado
  useEffect(() => {
    if (isOpen && locales.length > 0 && !localSeleccionado) {
      // Si hay solo un local, preseleccionarlo
      if (locales.length === 1) {
        setLocalSeleccionado(locales[0].id);
      } else {
        // Intentar usar el último local seleccionado
        const ultimoLocal = localStorage.getItem('ultimoLocalSeleccionado');
        if (ultimoLocal && locales.find(l => l.id === ultimoLocal)) {
          setLocalSeleccionado(ultimoLocal);
        } else {
          // Usar el primer local
          setLocalSeleccionado(locales[0].id);
        }
      }
    }
  }, [isOpen, locales, localSeleccionado]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!localSeleccionado) {
      toast.error('Debes seleccionar un local');
      return;
    }

    const efectivo = parseFloat(efectivoInicial);
    if (isNaN(efectivo) || efectivo < 0) {
      toast.error('El efectivo inicial debe ser un número válido');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post<{ turno: Turno }>('/turnos/abrir', {
        localId: localSeleccionado,
        efectivo_inicial: efectivo
      });

      toast.success('Turno abierto exitosamente');
      const turno = response.data.turno;
      onTurnoAbierto(turno);
      // Emitir evento para sincronizar con otros componentes
      window.dispatchEvent(new CustomEvent('turno:actualizado', { detail: turno }));
      onClose();
      
      // Reset form
      setLocalSeleccionado('');
      setEfectivoInicial('');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al abrir el turno');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Abrir Turno</h2>
          {!esObligatorio && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Local</label>
            <select
              value={localSeleccionado}
              onChange={(e) => setLocalSeleccionado(e.target.value)}
              className="input"
              required
            >
              <option value="">Selecciona un local</option>
              {locales.map((local) => (
                <option key={local.id} value={local.id}>
                  {local.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Efectivo Inicial
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={efectivoInicial}
              onChange={(e) => setEfectivoInicial(e.target.value)}
              className="input"
              placeholder="0.00"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Ingresa la cantidad de efectivo que hay en la caja al iniciar el turno
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            {!esObligatorio && (
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary flex-1"
                disabled={loading}
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              className={esObligatorio ? "w-full btn btn-primary" : "flex-1 btn btn-primary"}
              disabled={loading || !localSeleccionado || !efectivoInicial}
            >
              {loading ? 'Abriendo...' : 'Abrir Turno'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AbrirTurnoModal;

