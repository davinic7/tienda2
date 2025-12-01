import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import type { Producto, Cliente, Local } from '@shared/types';
import { MetodoPago } from '@shared/types';
import { X, User, Plus, Printer, Check, CreditCard, DollarSign, Store, AlertCircle, QrCode, Building2, Smartphone } from 'lucide-react';
import { printTicket } from '@/utils/printer.util';

// Helper para convertir crédito a número de forma segura
const getCreditoAsNumber = (credito: any): number => {
  if (typeof credito === 'number') return credito;
  if (typeof credito === 'string') return parseFloat(credito) || 0;
  if (credito && typeof credito === 'object' && 'toNumber' in credito) {
    return credito.toNumber();
  }
  return 0;
};

interface CarritoItem {
  producto: Producto;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

interface ModalConfirmarVentaProps {
  isOpen: boolean;
  onClose: () => void;
  onVentaCompletada: () => void;
  carrito: CarritoItem[];
  clienteActual: Cliente | null;
  locales?: Local[];
  localOrigenId?: string;
  nombreComprador?: string;
  onLocalOrigenChange?: (localId: string) => void;
  onNombreCompradorChange?: (nombre: string) => void;
  onClienteSeleccionado: (cliente: Cliente | null) => void;
}

export default function ModalConfirmarVenta({
  isOpen,
  onClose,
  onVentaCompletada,
  carrito,
  clienteActual,
  locales = [],
  localOrigenId = '',
  nombreComprador = '',
  onLocalOrigenChange,
  onNombreCompradorChange,
  onClienteSeleccionado,
}: ModalConfirmarVentaProps) {
  const { user } = useAuthStore();
  const [metodoPago, setMetodoPago] = useState<MetodoPago>(MetodoPago.EFECTIVO);
  const [montoEfectivo, setMontoEfectivo] = useState<string>('');
  const [montoOtro, setMontoOtro] = useState<string>('');
  const [cliente, setCliente] = useState<Cliente | null>(clienteActual);
  const [usarCredito, setUsarCredito] = useState(false);
  const [montoCredito, setMontoCredito] = useState<string>('');
  const [depositarRestoACredito, setDepositarRestoACredito] = useState(false);
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [clientesSugeridos, setClientesSugeridos] = useState<Cliente[]>([]);
  const [mostrarCrearCliente, setMostrarCrearCliente] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({ nombre: '', email: '', telefono: '' });
  const [procesando, setProcesando] = useState(false);
  const [mostrarTicket, setMostrarTicket] = useState(false);
  const [ventaCompletada, setVentaCompletada] = useState(false);
  const [localOrigen, setLocalOrigen] = useState(localOrigenId);
  const [nombreCompradorLocal, setNombreCompradorLocal] = useState(nombreComprador);
  const [esVentaRemota, setEsVentaRemota] = useState(false);

  const finalizar = () => {
    onVentaCompletada();
    setVentaCompletada(false);
    setMostrarTicket(false);
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      setCliente(clienteActual);
      setBusquedaCliente(clienteActual?.nombre || '');
      setLocalOrigen(localOrigenId);
      setNombreCompradorLocal(nombreComprador);
      setEsVentaRemota(!!localOrigenId && localOrigenId !== user?.localId);
      // No prellenar montos, dejar vacíos para que el usuario ingrese directamente
      setMontoEfectivo('');
      setMontoOtro('');
      setUsarCredito(false);
      setMontoCredito('');
      setDepositarRestoACredito(false);
      setVentaCompletada(false);
      setMostrarTicket(false);
    }
  }, [isOpen, clienteActual, localOrigenId, nombreComprador, user?.localId]);

  // Manejar tecla ESC para cerrar el ticket
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mostrarTicket) {
        setMostrarTicket(false);
        finalizar();
      }
    };

    if (mostrarTicket) {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [mostrarTicket]);

  useEffect(() => {
    if (busquedaCliente.length >= 2) {
      buscarClientes();
    } else {
      setClientesSugeridos([]);
    }
  }, [busquedaCliente]);

  const calcularTotal = () => {
    return carrito.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const calcularTotalAPagar = () => {
    const total = calcularTotal();
    if (usarCredito && cliente) {
      const creditoDisponible = getCreditoAsNumber(cliente.credito);
      const creditoAUsar = montoCredito 
        ? Math.min(parseFloat(montoCredito), creditoDisponible, total)
        : Math.min(creditoDisponible, total);
      return total - creditoAUsar;
    }
    return total;
  };

  const buscarClientes = async () => {
    try {
      const response = await api.get<{ clientes: Cliente[] }>(`/clientes?search=${busquedaCliente}`);
      setClientesSugeridos(response.data.clientes.slice(0, 5));
    } catch (error) {
      // Silencioso
    }
  };

  const crearCliente = async () => {
    if (!nuevoCliente.nombre.trim()) {
      toast.error('El nombre del cliente es requerido');
      return;
    }

    try {
      const response = await api.post<Cliente>('/clientes', nuevoCliente);
      setCliente(response.data);
      onClienteSeleccionado(response.data);
      setMostrarCrearCliente(false);
      setNuevoCliente({ nombre: '', email: '', telefono: '' });
      setBusquedaCliente(response.data.nombre);
      toast.success('Cliente creado exitosamente');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al crear cliente');
    }
  };

  const confirmarVenta = async () => {
    const total = calcularTotal();
    const totalAPagar = calcularTotalAPagar();

    // Validar uso de crédito
    if (usarCredito && !cliente) {
      toast.error('Debes seleccionar un cliente para usar crédito');
      return;
    }

    if (usarCredito && cliente) {
      const creditoDisponible = getCreditoAsNumber(cliente.credito);
      const creditoAUsar = montoCredito 
        ? Math.min(parseFloat(montoCredito), creditoDisponible, total)
        : Math.min(creditoDisponible, total);
      
      if (creditoAUsar > creditoDisponible) {
        toast.error(`Crédito insuficiente. Disponible: $${creditoDisponible.toFixed(2)}`);
        return;
      }
    }

    // Validar montos según método de pago (ahora validamos contra totalAPagar)
    if (metodoPago === MetodoPago.MIXTO) {
      if (!montoEfectivo || !montoOtro) {
        toast.error('Para pago mixto debes especificar ambos montos');
        return;
      }
      const sumaMontos = parseFloat(montoEfectivo) + parseFloat(montoOtro);
      if (sumaMontos < totalAPagar - 0.01) {
        toast.error(`La suma de los montos no puede ser menor al total a pagar ($${totalAPagar.toFixed(2)})`);
        return;
      }
      // Permitir que sea mayor (no hay problema, solo se cobra el total)
    } else if (metodoPago === MetodoPago.EFECTIVO) {
      if (!montoEfectivo || parseFloat(montoEfectivo) <= 0) {
        toast.error('Debes ingresar el monto recibido en efectivo');
        return;
      }
      if (parseFloat(montoEfectivo) < totalAPagar - 0.01) {
        toast.error(`El monto recibido no puede ser menor al total a pagar ($${totalAPagar.toFixed(2)})`);
        return;
      }
      // Permitir que sea mayor (se calculará el cambio automáticamente)
    } else {
      // Para otros métodos de pago (tarjeta, transferencia, etc.)
      if (!montoOtro || parseFloat(montoOtro) <= 0) {
        toast.error('Debes ingresar el monto pagado');
        return;
      }
      if (parseFloat(montoOtro) < totalAPagar - 0.01) {
        toast.error(`El monto pagado no puede ser menor al total a pagar ($${totalAPagar.toFixed(2)})`);
        return;
      }
      // Permitir que sea mayor o igual
    }

    // Validar venta remota
    if (esVentaRemota) {
      if (!localOrigen) {
        toast.error('Debes seleccionar un local origen para la venta remota');
        return;
      }
      if (!nombreCompradorLocal.trim()) {
        toast.error('Debes ingresar el nombre del comprador para la venta remota');
        return;
      }
    }

    setProcesando(true);
    try {
      // Preparar datos para enviar
      // Para efectivo: enviar el monto recibido (puede ser mayor al total)
      // Para mixto: enviar ambos montos (la suma puede ser mayor al total)
      // Para otros: enviar el monto pagado (puede ser mayor al total)
      await api.post('/ventas', {
        clienteId: cliente?.id || null,
        nombreComprador: esVentaRemota ? nombreCompradorLocal.trim() : undefined,
        localOrigenId: esVentaRemota ? localOrigen : undefined,
        metodoPago,
        montoEfectivo: metodoPago === MetodoPago.EFECTIVO || metodoPago === MetodoPago.MIXTO
          ? (montoEfectivo ? parseFloat(montoEfectivo) : undefined)
          : undefined,
        montoOtro: metodoPago !== MetodoPago.EFECTIVO
          ? (montoOtro ? parseFloat(montoOtro) : undefined)
          : undefined,
        usarCredito: usarCredito,
        montoCredito: usarCredito && montoCredito ? parseFloat(montoCredito) : undefined,
        depositarRestoACredito: depositarRestoACredito,
        productos: carrito.map((item) => ({
          productoId: item.producto.id,
          cantidad: item.cantidad,
        })),
      });

      toast.success('¡Venta realizada exitosamente!', { icon: '🎉' });
      setVentaCompletada(true);
      // Mostrar el ticket en modal emergente
      setMostrarTicket(true);
    } catch (error: any) {
      if (error.response?.data?.requiereApertura) {
        toast.error('Debes abrir una caja antes de realizar ventas', {
          duration: 5000,
        });
      } else {
        toast.error(error.response?.data?.error || 'Error al procesar la venta');
      }
      setProcesando(false);
    }
  };

  const imprimirTicket = () => {
    const total = calcularTotal();
    const totalAPagar = calcularTotalAPagar();
    const creditoUsado = usarCredito && cliente 
      ? (montoCredito ? Math.min(parseFloat(montoCredito) || 0, getCreditoAsNumber(cliente.credito), total) : Math.min(getCreditoAsNumber(cliente.credito), total))
      : 0;
    const creditoRestante = cliente && usarCredito 
      ? getCreditoAsNumber(cliente.credito) - creditoUsado + (depositarRestoACredito && metodoPago === MetodoPago.EFECTIVO && montoEfectivo && parseFloat(montoEfectivo) > totalAPagar ? (parseFloat(montoEfectivo) - totalAPagar) : 0)
      : getCreditoAsNumber(cliente?.credito || 0);
    
    let cambio: number | undefined;
    if (metodoPago === MetodoPago.EFECTIVO && montoEfectivo) {
      cambio = parseFloat(montoEfectivo) - totalAPagar;
    } else if (metodoPago === MetodoPago.MIXTO && montoEfectivo && montoOtro) {
      const suma = parseFloat(montoEfectivo) + parseFloat(montoOtro);
      cambio = suma > totalAPagar ? suma - totalAPagar : undefined;
    } else if (metodoPago !== MetodoPago.EFECTIVO && metodoPago !== MetodoPago.MIXTO && montoOtro) {
      cambio = parseFloat(montoOtro) > totalAPagar ? parseFloat(montoOtro) - totalAPagar : undefined;
    }

    printTicket({
      header: 'lolo DRUGSTORE',
      items: carrito.map((item) => ({
        nombre: item.producto.nombre,
        cantidad: item.cantidad,
        precio: item.precioUnitario,
        subtotal: item.subtotal,
      })),
      total: totalAPagar,
      metodoPago: metodoPago.replace(/_/g, ' '),
      cambio: cambio && cambio > 0 ? cambio : undefined,
      fecha: new Date().toLocaleString('es-ES'),
      vendedor: user?.nombre,
      cliente: cliente?.nombre,
      local: user?.local?.nombre,
      creditoUsado: creditoUsado > 0 ? creditoUsado : undefined,
      creditoRestante: cliente && creditoRestante >= 0 ? creditoRestante : undefined,
      montoRecibido: metodoPago === MetodoPago.EFECTIVO && montoEfectivo ? parseFloat(montoEfectivo) :
                     metodoPago === MetodoPago.MIXTO && montoEfectivo && montoOtro ? parseFloat(montoEfectivo) + parseFloat(montoOtro) :
                     metodoPago !== MetodoPago.EFECTIVO && metodoPago !== MetodoPago.MIXTO && montoOtro ? parseFloat(montoOtro) :
                     undefined,
      detallesPago: metodoPago === MetodoPago.MIXTO && montoEfectivo && montoOtro ? {
        efectivo: parseFloat(montoEfectivo),
        otro: parseFloat(montoOtro),
      } : undefined,
    });
  };

  if (!isOpen) return null;

  const total = calcularTotal();

  return (
    <>
      {/* Modal principal de confirmación */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Confirmar Venta</h2>
            <p className="text-sm text-gray-600 mt-1">Completa los datos para procesar la venta</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {ventaCompletada ? (
            /* Mensaje de éxito */
            <div className="max-w-md mx-auto text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">¡Venta Completada!</h3>
              <p className="text-gray-600 mb-6">La venta se ha procesado exitosamente</p>
              <div className="flex gap-3">
                <button
                  onClick={finalizar}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                >
                  Finalizar
                </button>
                <button
                  onClick={() => setMostrarTicket(true)}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center"
                >
                  <Printer className="w-5 h-5 mr-2" />
                  Ver Ticket
                </button>
              </div>
            </div>
          ) : (
            /* Formulario de confirmación */
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Venta Remota */}
              {locales.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <Store className="w-5 h-5 text-blue-600 mr-2" />
                      <label className="block text-sm font-medium text-gray-700">
                        Venta Remota (Opcional)
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEsVentaRemota(!esVentaRemota);
                        if (!esVentaRemota) {
                          setLocalOrigen('');
                          setNombreCompradorLocal('');
                        }
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        esVentaRemota ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          esVentaRemota ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  {esVentaRemota && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Local Origen *
                        </label>
                        <select
                          value={localOrigen}
                          onChange={(e) => {
                            setLocalOrigen(e.target.value);
                            onLocalOrigenChange?.(e.target.value);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          required={esVentaRemota}
                        >
                          <option value="">Seleccionar local...</option>
                          {locales
                            .filter((l) => l.id !== user?.localId)
                            .map((local) => (
                              <option key={local.id} value={local.id}>
                                {local.nombre}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Nombre del Comprador *
                        </label>
                        <input
                          type="text"
                          value={nombreCompradorLocal}
                          onChange={(e) => {
                            setNombreCompradorLocal(e.target.value);
                            onNombreCompradorChange?.(e.target.value);
                          }}
                          placeholder="Nombre del cliente..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          required={esVentaRemota}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Se notificará al local origen con este nombre
                        </p>
                      </div>
                      {esVentaRemota && localOrigen && (
                        <div className="flex items-start gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <p>
                            El stock se descontará del local seleccionado. Se enviará una notificación al local origen.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Paso 1: Cliente */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-5 border-2 border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                      1
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Cliente</h3>
                      <p className="text-xs text-gray-600">Vincula un cliente a esta venta (opcional)</p>
                    </div>
                  </div>
                </div>
                
                {!cliente ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={busquedaCliente}
                        onChange={(e) => {
                          setBusquedaCliente(e.target.value);
                          if (!e.target.value) {
                            setCliente(null);
                            onClienteSeleccionado(null);
                          }
                        }}
                        onFocus={() => buscarClientes()}
                        placeholder="Buscar por nombre, teléfono o email..."
                        className="block w-full pl-10 pr-12 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-base"
                      />
                      <button
                        onClick={() => setMostrarCrearCliente(true)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Crear nuevo cliente"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    {busquedaCliente && clientesSugeridos.length > 0 && (
                      <div className="bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {clientesSugeridos.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => {
                              setCliente(c);
                              onClienteSeleccionado(c);
                              setBusquedaCliente(c.nombre);
                              setClientesSugeridos([]);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-green-50 transition-colors border-b border-gray-100 last:border-b-0"
                          >
                            <div className="font-semibold text-gray-900">{c.nombre}</div>
                            <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                              {c.telefono && <span>📞 {c.telefono}</span>}
                              {c.email && <span>✉️ {c.email}</span>}
                              {getCreditoAsNumber(c.credito) > 0 && (
                                <span className="text-blue-600 font-medium">
                                  💳 ${getCreditoAsNumber(c.credito).toFixed(2)} crédito
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white rounded-lg p-4 border-2 border-green-200 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {cliente.nombre.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 text-lg">{cliente.nombre}</h4>
                            <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                              {cliente.telefono && <span>📞 {cliente.telefono}</span>}
                              {cliente.email && <span>✉️ {cliente.email}</span>}
                            </div>
                          </div>
                        </div>
                        {getCreditoAsNumber(cliente.credito) > 0 && (
                          <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <CreditCard className="w-5 h-5 text-blue-600 mr-2" />
                                <span className="text-sm font-medium text-blue-900">Crédito disponible:</span>
                              </div>
                              <span className="text-xl font-bold text-blue-900">${getCreditoAsNumber(cliente.credito).toFixed(2)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setCliente(null);
                          onClienteSeleccionado(null);
                          setBusquedaCliente('');
                          setUsarCredito(false);
                          setMontoCredito('');
                          setDepositarRestoACredito(false);
                        }}
                        className="ml-3 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Crear Cliente */}
              {mostrarCrearCliente && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">Nuevo Cliente</h3>
                    <button
                      onClick={() => {
                        setMostrarCrearCliente(false);
                        setNuevoCliente({ nombre: '', email: '', telefono: '' });
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Nombre *"
                    value={nuevoCliente.nombre}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                  <input
                    type="email"
                    placeholder="Email (opcional)"
                    value={nuevoCliente.email}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                  <input
                    type="text"
                    placeholder="Teléfono (opcional)"
                    value={nuevoCliente.telefono}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    onClick={crearCliente}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Crear Cliente
                  </button>
                </div>
              )}

              {/* Paso 2: Uso de Crédito */}
              {cliente && getCreditoAsNumber(cliente.credito) > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border-2 border-blue-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                        2
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Usar Crédito</h3>
                        <p className="text-xs text-gray-600">Aplica el crédito disponible del cliente</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setUsarCredito(!usarCredito);
                        if (!usarCredito) {
                          setMontoCredito('');
                        }
                      }}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                        usarCredito ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-md ${
                          usarCredito ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  
                  {usarCredito && (
                    <div className="bg-white rounded-lg p-4 border border-blue-200 space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="text-gray-600 mb-1">Crédito disponible</div>
                          <div className="text-xl font-bold text-blue-600">${getCreditoAsNumber(cliente.credito).toFixed(2)}</div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="text-gray-600 mb-1">Total venta</div>
                          <div className="text-xl font-bold text-gray-900">${calcularTotal().toFixed(2)}</div>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Monto específico a usar (opcional)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={Math.min(getCreditoAsNumber(cliente.credito), calcularTotal())}
                          value={montoCredito}
                          onChange={(e) => setMontoCredito(e.target.value)}
                          placeholder={`Dejar vacío para usar todo (máx. $${Math.min(getCreditoAsNumber(cliente.credito), calcularTotal()).toFixed(2)})`}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base font-semibold"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          💡 Si dejas vacío, se usará automáticamente el menor entre el crédito disponible y el total de la venta
                        </p>
                      </div>
                      
                      {usarCredito && (
                        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-700">Crédito a usar:</span>
                            <span className="font-bold text-green-700">
                              ${(montoCredito ? Math.min(parseFloat(montoCredito) || 0, getCreditoAsNumber(cliente.credito), calcularTotal()) : Math.min(getCreditoAsNumber(cliente.credito), calcularTotal())).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-700">Total después del crédito:</span>
                            <span className="font-bold text-lg text-gray-900">${calcularTotalAPagar().toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Paso 3: Método de Pago */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-5 border-2 border-purple-200">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                    3
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Método de Pago</h3>
                    <p className="text-xs text-gray-600">Selecciona cómo se realizará el pago</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { value: 'EFECTIVO', label: 'Efectivo', icon: DollarSign, color: 'green', emoji: '💵' },
                    { value: 'DEBITO', label: 'Débito', icon: CreditCard, color: 'blue', emoji: '💳' },
                    { value: 'TARJETA_CREDITO', label: 'Tarjeta Crédito', icon: CreditCard, color: 'purple', emoji: '💳' },
                    { value: 'QR', label: 'QR', icon: QrCode, color: 'indigo', emoji: '📱' },
                    { value: 'TRANSFERENCIA', label: 'Transferencia', icon: Building2, color: 'teal', emoji: '🏦' },
                    { value: 'MIXTO', label: 'Mixto', icon: Smartphone, color: 'orange', emoji: '💳💵' },
                  ].map((metodo) => {
                    const Icon = metodo.icon;
                    const isSelected = metodoPago === metodo.value;
                    const colorClasses = {
                      green: isSelected ? 'border-green-600 bg-gradient-to-br from-green-50 to-green-100 text-green-700 shadow-lg ring-2 ring-green-200' : 'border-gray-300 hover:border-green-400 hover:bg-green-50',
                      blue: isSelected ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 shadow-lg ring-2 ring-blue-200' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50',
                      purple: isSelected ? 'border-purple-600 bg-gradient-to-br from-purple-50 to-purple-100 text-purple-700 shadow-lg ring-2 ring-purple-200' : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50',
                      indigo: isSelected ? 'border-indigo-600 bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-700 shadow-lg ring-2 ring-indigo-200' : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50',
                      teal: isSelected ? 'border-teal-600 bg-gradient-to-br from-teal-50 to-teal-100 text-teal-700 shadow-lg ring-2 ring-teal-200' : 'border-gray-300 hover:border-teal-400 hover:bg-teal-50',
                      orange: isSelected ? 'border-orange-600 bg-gradient-to-br from-orange-50 to-orange-100 text-orange-700 shadow-lg ring-2 ring-orange-200' : 'border-gray-300 hover:border-orange-400 hover:bg-orange-50',
                    };
                    return (
                      <button
                        key={metodo.value}
                        type="button"
                        onClick={() => {
                          setMetodoPago(metodo.value as MetodoPago);
                          // Limpiar montos al cambiar método de pago
                          if (metodo.value === MetodoPago.EFECTIVO) {
                            setMontoEfectivo('');
                            setMontoOtro('');
                          } else if (metodo.value === MetodoPago.MIXTO) {
                            // Mantener los montos si ya estaban ingresados
                            // pero limpiar si no hay nada
                            if (!montoEfectivo && !montoOtro) {
                              setMontoEfectivo('');
                              setMontoOtro('');
                            }
                          } else {
                            // Para otros métodos, usar montoOtro
                            setMontoEfectivo('');
                            setMontoOtro('');
                          }
                        }}
                        className={`flex flex-col items-center justify-center px-4 py-4 border-2 rounded-xl transition-all font-medium min-h-[90px] ${
                          isSelected
                            ? colorClasses[metodo.color as keyof typeof colorClasses]
                            : 'bg-white text-gray-700 border-gray-300 hover:shadow-md hover:scale-105'
                        }`}
                      >
                        <div className="text-2xl mb-1">{metodo.emoji}</div>
                        <Icon className={`w-5 h-5 mb-1 ${isSelected ? '' : 'text-gray-400'}`} />
                        <span className="text-sm font-semibold">{metodo.label}</span>
                        {isSelected && (
                          <div className="mt-1 flex items-center gap-1">
                            <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>
                            <span className="text-xs">Seleccionado</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Montos según método de pago */}
              {metodoPago === MetodoPago.EFECTIVO && (
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Total Venta:</span>
                        <span className="text-lg font-bold text-gray-900">${total.toFixed(2)}</span>
                      </div>
                      {usarCredito && cliente && (
                        <>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Crédito usado:</span>
                            <span className="font-medium text-blue-600">
                              -${(montoCredito ? Math.min(parseFloat(montoCredito), getCreditoAsNumber(cliente.credito), total) : Math.min(getCreditoAsNumber(cliente.credito), total)).toFixed(2)}
                            </span>
                          </div>
                          <div className="border-t border-gray-300 pt-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-700">Total a Pagar:</span>
                              <span className="text-xl font-bold text-gray-900">${calcularTotalAPagar().toFixed(2)}</span>
                            </div>
                          </div>
                        </>
                      )}
                      {!usarCredito && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Total a Pagar:</span>
                          <span className="text-xl font-bold text-gray-900">${total.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monto Recibido (Efectivo)
                    </label>
                    <input
                      type="number"
                      value={montoEfectivo}
                      onChange={(e) => setMontoEfectivo(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-lg font-semibold"
                      step="0.01"
                      min="0"
                      placeholder={`Total: ${calcularTotalAPagar().toFixed(2)}`}
                      autoFocus
                    />
                  </div>
                  {montoEfectivo && parseFloat(montoEfectivo) > 0 && (
                    <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Total a Pagar:</span>
                          <span className="text-lg font-bold text-gray-900">${calcularTotalAPagar().toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Recibido:</span>
                          <span className="text-lg font-bold text-green-600">${parseFloat(montoEfectivo).toFixed(2)}</span>
                        </div>
                        <div className="border-t border-green-300 pt-2 mt-2">
                          <div className="flex justify-between items-center">
                            <span className="text-base font-bold text-gray-900">Cambio:</span>
                            <span className={`text-2xl font-bold ${parseFloat(montoEfectivo) >= calcularTotalAPagar() ? 'text-green-600' : 'text-red-600'}`}>
                              ${(parseFloat(montoEfectivo) - calcularTotalAPagar()).toFixed(2)}
                            </span>
                          </div>
                          {parseFloat(montoEfectivo) < calcularTotalAPagar() && (
                            <p className="text-xs text-red-600 mt-1">⚠️ El monto recibido es menor al total a pagar</p>
                          )}
                          {parseFloat(montoEfectivo) > calcularTotalAPagar() && depositarRestoACredito && cliente && (
                            <div className="mt-2 pt-2 border-t border-green-300">
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">Resto a crédito:</span>
                                <span className="font-medium text-blue-600">
                                  +${(parseFloat(montoEfectivo) - calcularTotalAPagar()).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {cliente && parseFloat(montoEfectivo) > calcularTotalAPagar() && (
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          id="depositarRestoACredito"
                          checked={depositarRestoACredito}
                          onChange={(e) => setDepositarRestoACredito(e.target.checked)}
                          className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
                        />
                        <div className="flex-1">
                          <label htmlFor="depositarRestoACredito" className="text-sm font-semibold text-gray-900 cursor-pointer block">
                            💰 Depositar cambio a crédito del cliente
                          </label>
                          <p className="text-xs text-gray-600 mt-1">
                            El cambio de ${(parseFloat(montoEfectivo) - calcularTotalAPagar()).toFixed(2)} se agregará automáticamente al crédito de <strong>{cliente.nombre}</strong>
                          </p>
                          {depositarRestoACredito && (
                            <div className="mt-3 p-2 bg-white rounded border border-blue-300">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-700">Crédito actual:</span>
                                <span className="font-bold text-blue-600">${getCreditoAsNumber(cliente.credito).toFixed(2)}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm mt-1">
                                <span className="text-gray-700">+ Depósito:</span>
                                <span className="font-bold text-green-600">+${(parseFloat(montoEfectivo) - calcularTotalAPagar()).toFixed(2)}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t border-gray-200">
                                <span className="font-semibold text-gray-900">Nuevo crédito:</span>
                                <span className="font-bold text-lg text-blue-700">
                                  ${(getCreditoAsNumber(cliente.credito) + (parseFloat(montoEfectivo) - calcularTotalAPagar())).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Campos de monto para métodos que no son efectivo ni mixto */}
              {metodoPago !== MetodoPago.EFECTIVO && metodoPago !== MetodoPago.MIXTO && (
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Total Venta:</span>
                        <span className="text-lg font-bold text-gray-900">${total.toFixed(2)}</span>
                      </div>
                      {usarCredito && cliente && (
                        <>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Crédito usado:</span>
                            <span className="font-medium text-blue-600">
                              -${(montoCredito ? Math.min(parseFloat(montoCredito), getCreditoAsNumber(cliente.credito), total) : Math.min(getCreditoAsNumber(cliente.credito), total)).toFixed(2)}
                            </span>
                          </div>
                          <div className="border-t border-gray-300 pt-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-700">Total a Pagar:</span>
                              <span className="text-xl font-bold text-gray-900">${calcularTotalAPagar().toFixed(2)}</span>
                            </div>
                          </div>
                        </>
                      )}
                      {!usarCredito && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Total a Pagar:</span>
                          <span className="text-xl font-bold text-gray-900">${total.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monto Recibido ({metodoPago === 'DEBITO' ? 'Débito' : 
                                      metodoPago === 'TARJETA_CREDITO' ? 'Tarjeta Crédito' :
                                      metodoPago === 'QR' ? 'QR' :
                                      metodoPago === 'TRANSFERENCIA' ? 'Transferencia' : 'Otro'})
                    </label>
                    <input
                      type="number"
                      value={montoOtro}
                      onChange={(e) => setMontoOtro(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg font-semibold"
                      step="0.01"
                      min="0"
                      placeholder={`Total: ${calcularTotalAPagar().toFixed(2)}`}
                      autoFocus
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Ingresa el monto recibido por este método de pago
                    </p>
                  </div>
                  {montoOtro && parseFloat(montoOtro) > 0 && (
                    <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Total a Pagar:</span>
                          <span className="text-lg font-bold text-gray-900">${calcularTotalAPagar().toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Recibido:</span>
                          <span className="text-lg font-bold text-green-600">${parseFloat(montoOtro).toFixed(2)}</span>
                        </div>
                        <div className="border-t border-green-300 pt-2 mt-2">
                          <div className="flex justify-between items-center">
                            <span className="text-base font-bold text-gray-900">Diferencia:</span>
                            <span className={`text-xl font-bold ${Math.abs(parseFloat(montoOtro) - calcularTotalAPagar()) < 0.01 ? 'text-green-600' : parseFloat(montoOtro) > calcularTotalAPagar() ? 'text-blue-600' : 'text-red-600'}`}>
                              ${(parseFloat(montoOtro) - calcularTotalAPagar()).toFixed(2)}
                            </span>
                          </div>
                          {Math.abs(parseFloat(montoOtro) - calcularTotalAPagar()) < 0.01 && (
                            <p className="text-xs text-green-600 mt-1">✓ Monto correcto</p>
                          )}
                          {parseFloat(montoOtro) < calcularTotalAPagar() && (
                            <p className="text-xs text-red-600 mt-1">⚠️ El monto recibido es menor al total a pagar</p>
                          )}
                          {parseFloat(montoOtro) > calcularTotalAPagar() && (
                            <p className="text-xs text-blue-600 mt-1">ℹ️ El monto recibido es mayor al total (posible propina o cambio)</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {metodoPago === MetodoPago.MIXTO && (
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Total Venta:</span>
                        <span className="text-lg font-bold text-gray-900">${total.toFixed(2)}</span>
                      </div>
                      {usarCredito && cliente && (
                        <>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Crédito usado:</span>
                            <span className="font-medium text-blue-600">
                              -${(montoCredito ? Math.min(parseFloat(montoCredito), getCreditoAsNumber(cliente.credito), total) : Math.min(getCreditoAsNumber(cliente.credito), total)).toFixed(2)}
                            </span>
                          </div>
                          <div className="border-t border-gray-300 pt-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-700">Total a Pagar:</span>
                              <span className="text-xl font-bold text-gray-900">${calcularTotalAPagar().toFixed(2)}</span>
                            </div>
                          </div>
                        </>
                      )}
                      {!usarCredito && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Total a Pagar:</span>
                          <span className="text-xl font-bold text-gray-900">${total.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monto en Efectivo
                    </label>
                    <input
                      type="number"
                      value={montoEfectivo}
                      onChange={(e) => setMontoEfectivo(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-lg font-semibold"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monto Otro (Tarjeta/Transferencia/etc)
                    </label>
                    <input
                      type="number"
                      value={montoOtro}
                      onChange={(e) => setMontoOtro(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-lg font-semibold"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                    />
                  </div>
                  {montoEfectivo && montoOtro && parseFloat(montoEfectivo) > 0 && parseFloat(montoOtro) > 0 && (
                    <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Total a Pagar:</span>
                          <span className="text-lg font-bold text-gray-900">${calcularTotalAPagar().toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Efectivo:</span>
                          <span className="text-lg font-bold text-green-600">${parseFloat(montoEfectivo).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Otro Método:</span>
                          <span className="text-lg font-bold text-blue-600">${parseFloat(montoOtro).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Suma Total:</span>
                          <span className="text-lg font-bold text-gray-900">${(parseFloat(montoEfectivo) + parseFloat(montoOtro)).toFixed(2)}</span>
                        </div>
                        <div className="border-t border-blue-300 pt-2 mt-2">
                          {Math.abs((parseFloat(montoEfectivo) + parseFloat(montoOtro)) - calcularTotalAPagar()) < 0.01 ? (
                            <div className="flex justify-between items-center">
                              <span className="text-base font-bold text-gray-900">Estado:</span>
                              <span className="text-lg font-bold text-green-600">✓ Correcto</span>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-base font-bold text-gray-900">Diferencia:</span>
                                <span className={`text-lg font-bold ${(parseFloat(montoEfectivo) + parseFloat(montoOtro)) > calcularTotalAPagar() ? 'text-green-600' : 'text-red-600'}`}>
                                  ${Math.abs((parseFloat(montoEfectivo) + parseFloat(montoOtro)) - calcularTotalAPagar()).toFixed(2)}
                                </span>
                              </div>
                              <p className="text-xs text-red-600">⚠️ Los montos no coinciden con el total</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Resumen Final */}
        {!ventaCompletada && (
          <div className="border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 p-6">
            <div className="max-w-2xl mx-auto">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                  ✓
                </div>
                Resumen de la Venta
              </h3>
              <div className="bg-white rounded-xl p-5 border-2 border-gray-200 shadow-sm space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600 mb-1">Total de productos</div>
                    <div className="text-xl font-bold text-gray-900">{carrito.length}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 mb-1">Total venta</div>
                    <div className="text-xl font-bold text-gray-900">${total.toFixed(2)}</div>
                  </div>
                </div>
                
                {usarCredito && cliente && (
                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600">Crédito aplicado:</span>
                      <span className="font-bold text-blue-600">
                        -${(montoCredito ? Math.min(parseFloat(montoCredito) || 0, getCreditoAsNumber(cliente.credito), total) : Math.min(getCreditoAsNumber(cliente.credito), total)).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900">Total a pagar:</span>
                      <span className="text-2xl font-bold text-green-600">${calcularTotalAPagar().toFixed(2)}</span>
                    </div>
                  </div>
                )}
                
                {cliente && (
                  <div className="pt-3 border-t border-gray-200">
                    <div className="text-xs text-gray-600 mb-2">Cliente vinculado:</div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{cliente.nombre}</span>
                      {getCreditoAsNumber(cliente.credito) > 0 && (
                        <span className="text-sm text-blue-600">
                          Crédito: ${getCreditoAsNumber(cliente.credito).toFixed(2)}
                        </span>
                      )}
                    </div>
                    {(usarCredito || depositarRestoACredito) && (
                      <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200 text-xs">
                        {usarCredito && (
                          <div className="text-blue-800">
                            ⚡ El crédito se descontará automáticamente
                          </div>
                        )}
                        {depositarRestoACredito && metodoPago === MetodoPago.EFECTIVO && montoEfectivo && parseFloat(montoEfectivo) > calcularTotalAPagar() && (
                          <div className="text-blue-800 mt-1">
                            💰 ${(parseFloat(montoEfectivo) - calcularTotalAPagar()).toFixed(2)} se agregará al crédito
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Método de pago:</span>
                    <span className="font-bold text-gray-900">
                      {metodoPago === 'EFECTIVO' ? '💵 Efectivo' :
                       metodoPago === 'DEBITO' ? '💳 Débito' :
                       metodoPago === 'TARJETA_CREDITO' ? '💳 Tarjeta Crédito' :
                       metodoPago === 'QR' ? '📱 QR' :
                       metodoPago === 'TRANSFERENCIA' ? '🏦 Transferencia' :
                       metodoPago === 'MIXTO' ? '💳 Mixto' : metodoPago}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        {!ventaCompletada && (
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-white">
            <button
              onClick={onClose}
              disabled={procesando}
              className="px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={confirmarVenta}
              disabled={procesando || carrito.length === 0}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg flex items-center shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              {procesando ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Procesando...
                </>
              ) : (
                <>
                  <Check className="w-6 h-6 mr-2" />
                  Confirmar Venta
                </>
              )}
            </button>
          </div>
        )}
      </div>
      </div>

      {/* Modal del Ticket - Ventana emergente */}
      {mostrarTicket && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setMostrarTicket(false);
              finalizar();
            }
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col print:shadow-none print:max-w-none print:w-full print:max-h-none print:rounded-none"
            id="ticket-print"
          >
            {/* Header del modal del ticket */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 print:hidden">
              <h3 className="text-lg font-semibold text-gray-900">Ticket de Venta</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={imprimirTicket}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center text-sm"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir
                </button>
                <button
                  onClick={() => {
                    setMostrarTicket(false);
                    finalizar();
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Cerrar (ESC)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Contenido del ticket */}
            <div className="flex-1 overflow-y-auto p-6 print:p-4">
              <div className="max-w-sm mx-auto">
                {/* Header del ticket */}
                <div className="text-center border-b-2 border-dashed border-gray-400 pb-4 mb-4">
                  <img src="/logo.svg" alt="lolo DRUGSTORE" className="h-20 w-20 mx-auto mb-3 object-contain print:h-16 print:w-16" />
                  <h3 className="text-2xl font-bold print:text-xl">lolo DRUGSTORE</h3>
                  <p className="text-sm text-gray-600 print:text-xs">Sistema POS</p>
                  <p className="text-sm text-gray-600 mt-1 print:text-xs">{user?.local?.nombre || ''}</p>
                </div>

                {/* Información de la venta */}
                <div className="text-sm text-gray-700 mb-4 space-y-1 print:text-xs">
                  <p><strong>Fecha:</strong> {new Date().toLocaleString('es-ES')}</p>
                  <p><strong>Vendedor:</strong> {user?.nombre || ''}</p>
                  {cliente ? (
                    <p><strong>Cliente:</strong> {cliente.nombre}{cliente.telefono ? ` - ${cliente.telefono}` : ''}</p>
                  ) : (
                    <p><strong>Cliente:</strong> Cliente General</p>
                  )}
                  <p><strong>Método de Pago:</strong> {metodoPago.replace(/_/g, ' ')}</p>
                </div>

                {/* Productos */}
                <div className="border-t border-b border-dashed border-gray-400 py-4 mb-4">
                  {carrito.map((item) => {
                    const esPorPeso = item.producto.unidadMedida === 'KG' || item.producto.unidadMedida === 'G';
                    return (
                      <div key={item.producto.id} className="flex justify-between text-sm mb-2 print:text-xs">
                        <div className="flex-1">
                          <div className="font-medium">{item.producto.nombre}</div>
                          <div className="text-gray-600">
                            {esPorPeso 
                              ? `${item.cantidad} ${item.producto.unidadMedida?.toLowerCase()} x $${item.precioUnitario.toFixed(2)}/${item.producto.unidadMedida?.toLowerCase()}`
                              : `${item.cantidad} x $${item.precioUnitario.toFixed(2)}`
                            }
                          </div>
                        </div>
                        <div className="text-right font-medium">
                          ${item.subtotal.toFixed(2)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Total */}
                <div className="text-right mb-4">
                  {usarCredito && cliente && (
                    <div className="text-sm text-gray-600 mb-2 print:text-xs">
                      <div>Subtotal: ${calcularTotal().toFixed(2)}</div>
                      <div className="text-blue-600">Crédito aplicado: -${(montoCredito ? Math.min(parseFloat(montoCredito) || 0, getCreditoAsNumber(cliente.credito), calcularTotal()) : Math.min(getCreditoAsNumber(cliente.credito), calcularTotal())).toFixed(2)}</div>
                    </div>
                  )}
                  <div className="text-xl font-bold print:text-lg">
                    TOTAL: ${calcularTotalAPagar().toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600 mt-2 print:text-xs space-y-1">
                    <div><strong>Método de Pago:</strong> {metodoPago.replace(/_/g, ' ')}</div>
                    {metodoPago === MetodoPago.EFECTIVO && montoEfectivo && (
                      <>
                        <div>Recibido: ${parseFloat(montoEfectivo).toFixed(2)}</div>
                        {parseFloat(montoEfectivo) > calcularTotalAPagar() && (
                          <div>Cambio: ${(parseFloat(montoEfectivo) - calcularTotalAPagar()).toFixed(2)}</div>
                        )}
                      </>
                    )}
                    {metodoPago === MetodoPago.MIXTO && montoEfectivo && montoOtro && (
                      <>
                        <div>Efectivo: ${parseFloat(montoEfectivo).toFixed(2)}</div>
                        <div>Otro: ${parseFloat(montoOtro).toFixed(2)}</div>
                        <div>Total recibido: ${(parseFloat(montoEfectivo) + parseFloat(montoOtro)).toFixed(2)}</div>
                        {(parseFloat(montoEfectivo) + parseFloat(montoOtro)) > calcularTotalAPagar() && (
                          <div>Cambio: ${((parseFloat(montoEfectivo) + parseFloat(montoOtro)) - calcularTotalAPagar()).toFixed(2)}</div>
                        )}
                      </>
                    )}
                    {metodoPago !== MetodoPago.EFECTIVO && metodoPago !== MetodoPago.MIXTO && montoOtro && (
                      <>
                        <div>Monto pagado: ${parseFloat(montoOtro).toFixed(2)}</div>
                        {parseFloat(montoOtro) > calcularTotalAPagar() && (
                          <div>Diferencia: ${(parseFloat(montoOtro) - calcularTotalAPagar()).toFixed(2)}</div>
                        )}
                      </>
                    )}
                  </div>
                  {usarCredito && cliente && (
                    <div className="text-sm text-blue-600 mt-2 print:text-xs border-t border-gray-300 pt-2">
                      <div><strong>Crédito restante:</strong> ${(getCreditoAsNumber(cliente.credito) - (montoCredito ? Math.min(parseFloat(montoCredito) || 0, getCreditoAsNumber(cliente.credito), calcularTotal()) : Math.min(getCreditoAsNumber(cliente.credito), calcularTotal())) + (depositarRestoACredito && metodoPago === MetodoPago.EFECTIVO && montoEfectivo && parseFloat(montoEfectivo) > calcularTotalAPagar() ? (parseFloat(montoEfectivo) - calcularTotalAPagar()) : 0)).toFixed(2)}</div>
                    </div>
                  )}
                </div>

                {/* Footer del ticket */}
                <div className="text-center text-sm text-gray-500 border-t-2 border-dashed border-gray-400 pt-4 print:text-xs">
                  <p>¡Gracias por su compra!</p>
                  <p>Vuelva pronto</p>
                </div>
              </div>
            </div>

            {/* Footer del modal (solo visible en pantalla, no en impresión) */}
            <div className="p-4 border-t border-gray-200 print:hidden">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Presiona ESC para cerrar</span>
                <button
                  onClick={() => {
                    setMostrarTicket(false);
                    finalizar();
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

