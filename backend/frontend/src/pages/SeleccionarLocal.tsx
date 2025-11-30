import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { Local } from '../types';
import { Building2, MapPin, Check, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

const SeleccionarLocal = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [locales, setLocales] = useState<Local[]>([]);
  const [localSeleccionado, setLocalSeleccionado] = useState<string>('');
  const [localMasUsado, setLocalMasUsado] = useState<string>('');
  const [mostrarSelector, setMostrarSelector] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Solo vendedores pueden acceder a esta página
    if (user?.role !== 'VENDEDOR') {
      navigate('/dashboard');
      return;
    }
    cargarLocales();
  }, [user, navigate]);

  useEffect(() => {
    // Preseleccionar el local asignado o el más usado
    if (locales.length > 0 && !localSeleccionado) {
      // Primero intentar con el local asignado
      if (user?.localId) {
        const localAsignado = locales.find(l => l.id === user.localId);
        if (localAsignado) {
          setLocalSeleccionado(user.localId);
          return;
        }
      }
      
      // Si no hay local asignado, usar el más usado
      if (localMasUsado) {
        setLocalSeleccionado(localMasUsado);
      } else {
        // Si no hay más usado, seleccionar el primero
        setLocalSeleccionado(locales[0].id);
      }
    }
  }, [locales, user, localMasUsado]);

  // Si solo hay un local, no mostrar selector
  useEffect(() => {
    if (locales.length === 1) {
      setMostrarSelector(false);
    }
  }, [locales]);

  const cargarLocales = async () => {
    try {
      // Cargar locales disponibles del localStorage
      const localesData = localStorage.getItem('localesDisponibles');
      if (localesData) {
        const localesParsed = JSON.parse(localesData);
        setLocales(localesParsed);
      } else {
        // Si no hay en localStorage, obtener del servidor
        const response = await api.get<{ locales: Local[] }>('/locales');
        setLocales(response.data.locales || []);
      }

      // Obtener el local más usado por este vendedor
      if (user?.id && user?.role === 'VENDEDOR') {
        try {
          const turnosResponse = await api.get(`/turnos?limit=50`);
          const turnos = turnosResponse.data.turnos || [];
          
          // Contar turnos por local
          const conteoLocales = new Map<string, number>();
          turnos.forEach((turno: any) => {
            if (turno.localId) {
              conteoLocales.set(turno.localId, (conteoLocales.get(turno.localId) || 0) + 1);
            }
          });

          // Encontrar el local más usado
          let maxCount = 0;
          let localMasFrecuente = '';
          conteoLocales.forEach((count, localId) => {
            if (count > maxCount) {
              maxCount = count;
              localMasFrecuente = localId;
            }
          });

          if (localMasFrecuente) {
            setLocalMasUsado(localMasFrecuente);
          }
        } catch (error) {
          // Silencioso, no es crítico
          console.log('No se pudo obtener el local más usado');
        }
      }
    } catch (error: any) {
      toast.error('Error al cargar locales');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const continuar = async () => {
    if (!localSeleccionado) {
      toast.error('Por favor selecciona un local');
      return;
    }

    // Guardar el local seleccionado para uso futuro
    localStorage.setItem('ultimoLocalSeleccionado', localSeleccionado);
    
    // Verificar si hay un turno activo
    try {
      const turnoResponse = await api.get<{ turno: any | null }>('/turnos/activo');
      const turnoActivo = turnoResponse.data.turno;
      
      // Si no hay turno activo, forzar abrir uno
      if (!turnoActivo) {
        // Redirigir a una página que forzará abrir el turno
        // Guardamos el local seleccionado para usarlo en el modal
        navigate('/dashboard', { state: { forzarAbrirTurno: true, localId: localSeleccionado } });
        return;
      }
      
      // Si hay turno activo, navegar normalmente
      navigate('/dashboard');
    } catch (error) {
      // Si hay error, intentar navegar de todas formas
      console.error('Error al verificar turno:', error);
      navigate('/dashboard', { state: { forzarAbrirTurno: true, localId: localSeleccionado } });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-500 to-green-700">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  const localSeleccionadoObj = locales.find(l => l.id === localSeleccionado);

  // Si solo hay un local, no mostrar selector, solo el local
  if (locales.length === 1 && !mostrarSelector) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-xl p-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <Building2 className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Local Asignado
              </h1>
              <p className="text-gray-600">
                Trabajarás en este local
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6 border-2 border-green-200">
              <div className="flex items-center gap-3 mb-2">
                <Building2 className="h-6 w-6 text-green-600" />
                <h3 className="text-lg font-bold text-gray-900">
                  {locales[0].nombre}
                </h3>
              </div>
              {locales[0].direccion && (
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {locales[0].direccion}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={continuar}
                className="w-full px-6 py-3 bg-green-600 text-white font-bold rounded-lg transition-all hover:bg-green-700 hover:shadow-lg flex items-center justify-center gap-2"
              >
                Continuar
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-xl p-6">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Building2 className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Selecciona tu Local
            </h1>
            <p className="text-gray-600">
              ¿En qué local vas a trabajar hoy?
            </p>
          </div>

          {!mostrarSelector && localSeleccionadoObj ? (
            // Vista compacta con el local preseleccionado
            <div className="space-y-4">
              <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Building2 className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{localSeleccionadoObj.nombre}</h3>
                      {localSeleccionadoObj.direccion && (
                        <p className="text-sm text-gray-600">{localSeleccionadoObj.direccion}</p>
                      )}
                    </div>
                  </div>
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                </div>
                {(user?.localId === localSeleccionadoObj.id || localMasUsado === localSeleccionadoObj.id) && (
                  <div className="mt-2 flex gap-2">
                    {user?.localId === localSeleccionadoObj.id && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                        Asignado
                      </span>
                    )}
                    {localMasUsado === localSeleccionadoObj.id && user?.localId !== localSeleccionadoObj.id && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                        Más usado
                      </span>
                    )}
                  </div>
                )}
              </div>

              {locales.length > 1 && (
                <button
                  onClick={() => setMostrarSelector(true)}
                  className="w-full px-4 py-2 text-sm text-green-600 hover:text-green-700 font-medium border border-green-300 hover:border-green-400 rounded-lg transition-colors"
                >
                  Cambiar de local
                </button>
              )}

              <div className="flex flex-col gap-3 pt-2">
                <button
                  onClick={continuar}
                  className="w-full px-6 py-3 bg-green-600 text-white font-bold rounded-lg transition-all hover:bg-green-700 hover:shadow-lg flex items-center justify-center gap-2"
                >
                  Continuar
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          ) : (
            // Vista expandida con todos los locales
            <div className="space-y-4">
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {locales.map((local) => {
                  const estaSeleccionado = localSeleccionado === local.id;
                  const esMasUsado = localMasUsado === local.id;
                  const esAsignado = user?.localId === local.id;

                  return (
                    <button
                      key={local.id}
                      onClick={() => {
                        setLocalSeleccionado(local.id);
                        setMostrarSelector(false);
                      }}
                      className={`w-full p-4 rounded-lg text-left transition-all border-2 ${
                        estaSeleccionado
                          ? 'bg-green-50 border-green-300'
                          : 'bg-gray-50 border-gray-200 hover:border-green-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Building2 className={`h-5 w-5 ${
                            estaSeleccionado ? 'text-green-600' : 'text-gray-600'
                          }`} />
                          <div>
                            <h3 className={`font-semibold ${
                              estaSeleccionado ? 'text-gray-900' : 'text-gray-800'
                            }`}>
                              {local.nombre}
                            </h3>
                            {local.direccion && (
                              <p className="text-xs text-gray-600">{local.direccion}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {(esAsignado || esMasUsado) && (
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              esAsignado ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                            }`}>
                              {esAsignado ? 'Asignado' : 'Más usado'}
                            </span>
                          )}
                          {estaSeleccionado && (
                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button
                  onClick={continuar}
                  disabled={!localSeleccionado}
                  className="w-full px-6 py-3 bg-green-600 text-white font-bold rounded-lg transition-all hover:bg-green-700 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Continuar
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SeleccionarLocal;

