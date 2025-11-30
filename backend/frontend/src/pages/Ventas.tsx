import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api, isDatabaseError } from '../utils/api';
import { Producto, Cliente, CarritoItem, Venta, Stock, MetodoPago } from '../types';
import { ShoppingCart, Search, Trash2, Plus, Minus, UserPlus, Package, AlertTriangle, X, Maximize2, Minimize2, CreditCard, DollarSign, Lock, Keyboard } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Ticket from '../components/Ticket';
import AbrirTurnoModal from '../components/AbrirTurnoModal';
import { useFocusTrap } from '../hooks/useFocusTrap';
import ConfirmDialog from '../components/ConfirmDialog';

const clienteSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  dni: z.string().optional().or(z.literal('')),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefono: z.string().optional(),
});

type ClienteForm = z.infer<typeof clienteSchema>;

interface ProductoConStock extends Producto {
  stock?: number;
  stock_minimo?: number;
}

const Ventas = () => {
  const { user } = useAuth();
  const [productos, setProductos] = useState<ProductoConStock[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carrito, setCarrito] = useState<CarritoItem[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [clientesFiltrados, setClientesFiltrados] = useState<Cliente[]>([]);
  const [mostrarResultadosCliente, setMostrarResultadosCliente] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mostrarCrearCliente, setMostrarCrearCliente] = useState(false);
  const [mostrarPago, setMostrarPago] = useState(false);
  const [mostrarTicket, setMostrarTicket] = useState(false);
  const [ventaCompletada, setVentaCompletada] = useState<Venta | null>(null);
  const [stocks, setStocks] = useState<Record<string, number>>({});
  const [fullscreen, setFullscreen] = useState(false);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>(MetodoPago.EFECTIVO);
  const [creditoUsado, setCreditoUsado] = useState(0);
  const [efectivoRecibido, setEfectivoRecibido] = useState('');
  const [localSeleccionado, setLocalSeleccionado] = useState<string>('');
  const [locales, setLocales] = useState<any[]>([]);
  const [turnoActivo, setTurnoActivo] = useState<any>(null);
  const [mostrarModalAbrirCaja, setMostrarModalAbrirCaja] = useState(false);
  const [mostrarAbrirTurno, setMostrarAbrirTurno] = useState(false);
  const [mostrarAyudaTeclado, setMostrarAyudaTeclado] = useState(false);
  const [mostrarConfirmacionLimpiarCarrito, setMostrarConfirmacionLimpiarCarrito] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const clienteSearchRef = useRef<HTMLInputElement>(null);
  const efectivoInputRef = useRef<HTMLInputElement>(null);
  const barcodeBuffer = useRef({ value: '', timeout: null as NodeJS.Timeout | null });
  
  // Refs para modales (focus trap)
  const modalPagoRef = useRef<HTMLDivElement>(null);
  const modalCrearClienteRef = useRef<HTMLDivElement>(null);
  const modalTicketRef = useRef<HTMLDivElement>(null);
  const modalAbrirCajaRef = useRef<HTMLDivElement>(null);
  const modalAyudaTecladoRef = useRef<HTMLDivElement>(null);
  
  // Aplicar focus trap a los modales
  useFocusTrap(mostrarPago, modalPagoRef);
  useFocusTrap(mostrarCrearCliente, modalCrearClienteRef);
  useFocusTrap(mostrarTicket, modalTicketRef);
  useFocusTrap(mostrarModalAbrirCaja, modalAbrirCajaRef);
  useFocusTrap(mostrarAyudaTeclado, modalAyudaTecladoRef);

  const {
    register: registerCliente,
    handleSubmit: handleSubmitCliente,
    reset: resetCliente,
    formState: { errors: errorsCliente },
  } = useForm<ClienteForm>({
    resolver: zodResolver(clienteSchema),
  });

  useEffect(() => {
    cargarProductos();
    cargarClientes();
    if (user?.role === 'ADMIN') {
      cargarLocales();
    }
    if (user?.role === 'VENDEDOR') {
      cargarTurnoActivo();
      // Cargar locales disponibles para el modal
      const localesData = localStorage.getItem('localesDisponibles');
      if (localesData) {
        setLocales(JSON.parse(localesData));
      }
      // Verificar turno cada 30 segundos
      const interval = setInterval(cargarTurnoActivo, 30000);
      
      // Escuchar eventos de cambio de turno desde otros componentes
      const handleTurnoActualizado = () => {
        cargarTurnoActivo();
      };
      window.addEventListener('turno:actualizado', handleTurnoActualizado);
      
      return () => {
        clearInterval(interval);
        window.removeEventListener('turno:actualizado', handleTurnoActualizado);
      };
    }
  }, [user?.role]);

  useEffect(() => {
    if (user?.localId) {
      cargarStocks();
    } else if (user?.role === 'ADMIN' && localSeleccionado) {
      cargarStocks();
    }
  }, [user?.localId, localSeleccionado]);

  // Auto-focus en búsqueda al cargar
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Cerrar resultados de búsqueda de cliente al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.cliente-search-container')) {
        setMostrarResultadosCliente(false);
      }
    };

    if (mostrarResultadosCliente) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [mostrarResultadosCliente]);

  // Atajos de teclado globales
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Evitar conflictos si está escribiendo en un input, textarea o modal
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
      const isModalOpen = mostrarPago || mostrarCrearCliente || mostrarTicket || mostrarModalAbrirCaja || mostrarAbrirTurno;

      // Ctrl+Enter o F2: Procesar venta (si hay items en carrito y no hay modal abierto)
      if ((e.key === 'Enter' && e.ctrlKey) || e.key === 'F2') {
        if (carrito.length > 0 && !isModalOpen && !isInput) {
          e.preventDefault();
          abrirModalPago();
        }
      }

      // Escape: Cerrar modales o limpiar
      if (e.key === 'Escape') {
        if (mostrarPago) {
          e.preventDefault();
          setMostrarPago(false);
        } else if (mostrarCrearCliente) {
          e.preventDefault();
          setMostrarCrearCliente(false);
          resetCliente();
        } else if (mostrarTicket) {
          e.preventDefault();
          setMostrarTicket(false);
          setVentaCompletada(null);
        } else if (mostrarModalAbrirCaja) {
          e.preventDefault();
          setMostrarModalAbrirCaja(false);
        } else if (mostrarAbrirTurno) {
          e.preventDefault();
          setMostrarAbrirTurno(false);
        } else if (mostrarResultadosCliente) {
          e.preventDefault();
          setMostrarResultadosCliente(false);
        } else if (clienteSeleccionado) {
          e.preventDefault();
          setClienteSeleccionado(null);
          setBusquedaCliente('');
        } else if (busqueda) {
          e.preventDefault();
          setBusqueda('');
          searchInputRef.current?.focus();
        } else if (carrito.length > 0 && !isInput) {
          e.preventDefault();
          confirmarLimpiarCarrito();
        }
      }

      // F1: Mostrar ayuda de teclado
      if (e.key === 'F1') {
        e.preventDefault();
        setMostrarAyudaTeclado(!mostrarAyudaTeclado);
      }

      // F11: Pantalla completa
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }

      // Tab: Si está en búsqueda de productos y presiona Tab, mover a búsqueda de cliente
      if (e.key === 'Tab' && !e.shiftKey && target === searchInputRef.current) {
        // Permitir navegación normal con Tab
      }

      // Ctrl+K: Ir a búsqueda de cliente
      if (e.key === 'k' && e.ctrlKey) {
        e.preventDefault();
        if (clienteSearchRef.current && !isModalOpen) {
          clienteSearchRef.current.focus();
        }
      }

      // Ctrl+P: Ir a búsqueda de productos
      if (e.key === 'p' && e.ctrlKey) {
        e.preventDefault();
        if (searchInputRef.current && !isModalOpen) {
          searchInputRef.current.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carrito.length, busqueda, mostrarPago, mostrarCrearCliente, mostrarTicket, mostrarModalAbrirCaja, mostrarAbrirTurno, mostrarResultadosCliente, clienteSeleccionado]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  const cargarProductos = async () => {
    try {
      const response = await api.get('/productos?activo=true');
      setProductos(response.data.productos);
    } catch (error: any) {
      if (!isDatabaseError(error)) {
        toast.error('Error al cargar productos');
      }
    }
  };

  const cargarClientes = async () => {
    try {
      const response = await api.get('/clientes');
      // Normalizar los datos: convertir credito de string (Prisma Decimal) a number
      const clientesNormalizados = (response.data.clientes || []).map((cliente: any) => ({
        ...cliente,
        credito: typeof cliente.credito === 'string' ? Number(cliente.credito) : cliente.credito || 0,
      }));
      setClientes(clientesNormalizados);
      setClientesFiltrados(clientesNormalizados);
    } catch (error: any) {
      console.error('Error al cargar clientes:', error);
      if (!isDatabaseError(error)) {
        toast.error(error.response?.data?.error || 'Error al cargar clientes');
      }
    }
  };

  // Buscar clientes por DNI, nombre o apellido
  const buscarCliente = async (termino: string) => {
    setBusquedaCliente(termino);
    
    if (!termino || termino.trim() === '') {
      setClientesFiltrados([]);
      setMostrarResultadosCliente(false);
      return;
    }

    // Mostrar resultados después de escribir al menos 2 caracteres
    if (termino.trim().length < 2) {
      setClientesFiltrados([]);
      setMostrarResultadosCliente(false);
      return;
    }

    try {
      const response = await api.get(`/clientes?search=${encodeURIComponent(termino.trim())}`);
      const resultados = response.data.clientes || [];
      setClientesFiltrados(resultados);
      setMostrarResultadosCliente(resultados.length > 0 || termino.trim().length >= 2);
    } catch (error: any) {
      console.error('Error al buscar clientes:', error);
      // Si falla, filtrar localmente
      const filtrados = clientes.filter(c => 
        c.nombre.toLowerCase().includes(termino.toLowerCase()) ||
        (c.dni && c.dni.includes(termino)) ||
        (c.email && c.email.toLowerCase().includes(termino.toLowerCase())) ||
        (c.telefono && c.telefono.includes(termino))
      );
      setClientesFiltrados(filtrados);
      setMostrarResultadosCliente(filtrados.length > 0 || termino.trim().length >= 2);
    }
  };

  const cargarTurnoActivo = async () => {
    if (user?.role !== 'VENDEDOR') return;
    
    try {
      const response = await api.get('/turnos/activo');
      setTurnoActivo(response.data.turno);
    } catch (error: any) {
      setTurnoActivo(null);
    }
  };

  // Recargar crédito del cliente cuando se selecciona
  useEffect(() => {
    if (clienteSeleccionado) {
      const clienteActualizado = clientes.find(c => c.id === clienteSeleccionado.id);
      if (clienteActualizado) {
        setClienteSeleccionado(clienteActualizado);
      }
    }
  }, [clientes]);

  const cargarLocales = async () => {
    try {
      const response = await api.get('/locales?activo=true');
      const localesData = response.data.locales || [];
      setLocales(localesData);
      // Si no hay local seleccionado y hay locales disponibles, seleccionar el primero
      if (localesData.length > 0) {
        setLocalSeleccionado((prev) => {
          // Solo actualizar si no hay uno seleccionado
          if (!prev) {
            const primerLocalId = localesData[0].id;
            // Cargar stocks del primer local automáticamente después de actualizar el estado
            setTimeout(() => {
              cargarStocks();
            }, 100);
            return primerLocalId;
          }
          return prev;
        });
      }
    } catch (error: any) {
      console.error('Error al cargar locales:', error);
    }
  };

  const cargarStocks = async () => {
    try {
      // Para ADMIN, usar localSeleccionado; para VENDEDOR, usar user.localId
      const localId = user?.role === 'ADMIN' ? localSeleccionado : user?.localId;
      if (!localId) return;
      
      const response = await api.get(`/stock?localId=${localId}`);
      const stocksData: Stock[] = response.data.stocks || [];
      const stocksMap: Record<string, number> = {};
      stocksData.forEach((stock) => {
        stocksMap[stock.productoId] = stock.cantidad;
      });
      setStocks(stocksMap);
      
      // Actualizar productos con stock
      setProductos((prev) =>
        prev.map((p) => {
          const stock = stocksData.find((s) => s.productoId === p.id);
          return {
            ...p,
            stock: stock?.cantidad || 0,
            stock_minimo: stock?.stock_minimo || 0,
          };
        })
      );
    } catch (error: any) {
      console.error('Error al cargar stocks:', error);
    }
  };

  const buscarProducto = (codigoBarras: string) => {
    // Limpiar timeout anterior
    if (barcodeBuffer.current.timeout) {
      clearTimeout(barcodeBuffer.current.timeout);
    }

    // Limpiar espacios y caracteres especiales que algunos escáneres pueden agregar
    const codigoLimpio = codigoBarras.trim().replace(/\s+/g, '');

    if (!codigoLimpio) return;

    // Si es un código de barras (solo números y más de 8 caracteres), buscar directamente
    const esCodigoBarras = /^\d+$/.test(codigoLimpio) && codigoLimpio.length >= 8;
    
    if (esCodigoBarras) {
      const producto = productos.find((p) => p.codigo_barras === codigoLimpio);
      if (producto) {
        agregarAlCarrito(producto);
        setBusqueda('');
        // Pequeño delay antes de volver a enfocar para evitar conflictos
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 100);
        return;
      } else {
        toast.error(`Producto con código ${codigoLimpio} no encontrado`);
        setBusqueda('');
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 100);
        return;
      }
    }

    // Búsqueda normal por nombre o código (si no es código de barras puro)
    const producto = productos.find(
      (p) => p.codigo_barras === codigoLimpio || p.nombre.toLowerCase().includes(codigoLimpio.toLowerCase())
    );
    if (producto) {
      agregarAlCarrito(producto);
      setBusqueda('');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      toast.error('Producto no encontrado');
    }
  };

  // Manejar entrada de código de barras (escáner envía rápidamente)
  const handleBarcodeInput = (value: string) => {
    setBusqueda(value);
    
    // Si es código de barras (solo números, largo), buscar automáticamente después de un delay
    if (/^\d+$/.test(value) && value.length >= 8) {
      if (barcodeBuffer.current.timeout) {
        clearTimeout(barcodeBuffer.current.timeout);
      }
      
      // Los escáneres suelen enviar el código muy rápido, esperar un poco más
      barcodeBuffer.current.timeout = setTimeout(() => {
        buscarProducto(value);
      }, 500); // Esperar 500ms para confirmar que terminó de escanear
    }
  };

  // Manejar tecla Enter (los escáneres suelen enviar Enter al final)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Si se presiona Enter y hay un código de barras en el buffer, buscar inmediatamente
    if (e.key === 'Enter' && busqueda) {
      e.preventDefault();
      // Limpiar timeout si existe
      if (barcodeBuffer.current.timeout) {
        clearTimeout(barcodeBuffer.current.timeout);
      }
      buscarProducto(busqueda);
      // Mantener el focus en el input para siguiente escaneo
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
    // Escape para limpiar búsqueda
    if (e.key === 'Escape') {
      e.preventDefault();
      setBusqueda('');
      searchInputRef.current?.focus();
    }
  };

  // Manejar teclado en búsqueda de cliente
  const handleClienteKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Enter: Seleccionar primer resultado si hay uno
    if (e.key === 'Enter' && clientesFiltrados.length > 0 && busquedaCliente) {
      e.preventDefault();
      setClienteSeleccionado(clientesFiltrados[0]);
      setBusquedaCliente('');
      setMostrarResultadosCliente(false);
      // Volver a búsqueda de productos
      searchInputRef.current?.focus();
    }
    // Escape: Cerrar resultados o quitar cliente seleccionado
    if (e.key === 'Escape') {
      e.preventDefault();
      if (mostrarResultadosCliente) {
        setMostrarResultadosCliente(false);
      } else if (clienteSeleccionado) {
        setClienteSeleccionado(null);
        setBusquedaCliente('');
      }
    }
    // Flechas arriba/abajo: Navegar por resultados
    if (e.key === 'ArrowDown' && clientesFiltrados.length > 0) {
      e.preventDefault();
      setMostrarResultadosCliente(true);
    }
  };

  // Manejar teclado numérico en inputs de cantidad/precio
  const handleNumericKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Permitir números, punto decimal, backspace, delete, tab, enter, escape
    const allowedKeys = [
      'Backspace', 'Delete', 'Tab', 'Enter', 'Escape',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Home', 'End'
    ];
    const isNumber = /^[0-9]$/.test(e.key);
    const isDecimal = e.key === '.' || e.key === ',';
    const isAllowed = allowedKeys.includes(e.key) || 
                     (e.ctrlKey && (e.key === 'a' || e.key === 'c' || e.key === 'v' || e.key === 'x'));

    if (!isNumber && !isDecimal && !isAllowed) {
      e.preventDefault();
    }
    // Convertir coma a punto para decimales
    if (e.key === ',') {
      e.preventDefault();
      const input = e.currentTarget;
      const cursorPos = input.selectionStart || 0;
      const value = input.value;
      const newValue = value.slice(0, cursorPos) + '.' + value.slice(cursorPos);
      input.value = newValue;
      input.setSelectionRange(cursorPos + 1, cursorPos + 1);
    }
    // Enter en efectivo: confirmar pago si está completo
    if (e.key === 'Enter' && e.currentTarget === efectivoInputRef.current) {
      const efectivo = Number(e.currentTarget.value);
      const total = calcularTotal();
      if (efectivo >= total && !loading) {
        e.preventDefault();
        procesarVenta();
      }
    }
  };

  const agregarAlCarrito = (producto: ProductoConStock) => {
    const stockDisponible = producto.stock || stocks[producto.id] || 0;
    
    if (stockDisponible <= 0) {
      toast.error(`No hay stock disponible para ${producto.nombre}`);
      return;
    }

    const itemExistente = carrito.find((item) => item.producto.id === producto.id);
    const cantidadActual = itemExistente ? itemExistente.cantidad : 0;
    
    if (cantidadActual + 1 > stockDisponible) {
      toast.error(`Stock insuficiente. Disponible: ${stockDisponible}`);
      return;
    }

    if (itemExistente) {
      actualizarCantidad(producto.id, itemExistente.cantidad + 1);
    } else {
      const nuevoItem: CarritoItem = {
        producto,
        cantidad: 1,
        precio_unitario: Number(producto.precio),
        subtotal: Number(producto.precio),
      };
      setCarrito([...carrito, nuevoItem]);
    }
  };

  const actualizarCantidad = (productoId: string, cantidad: number) => {
    if (cantidad <= 0) {
      eliminarDelCarrito(productoId);
      return;
    }

    const producto = productos.find((p) => p.id === productoId);
    const stockDisponible = producto?.stock || stocks[productoId] || 0;

    if (cantidad > stockDisponible) {
      toast.error(`Stock insuficiente. Disponible: ${stockDisponible}`);
      return;
    }

    setCarrito(
      carrito.map((item) => {
        if (item.producto.id === productoId) {
          return {
            ...item,
            cantidad,
            subtotal: item.precio_unitario * cantidad,
          };
        }
        return item;
      })
    );
  };

  const eliminarDelCarrito = (productoId: string) => {
    setCarrito(carrito.filter((item) => item.producto.id !== productoId));
  };

  const confirmarLimpiarCarrito = () => {
    if (carrito.length > 0) {
      setMostrarConfirmacionLimpiarCarrito(true);
    }
  };

  const ejecutarLimpiarCarrito = () => {
    setCarrito([]);
    setMostrarConfirmacionLimpiarCarrito(false);
    searchInputRef.current?.focus();
  };

  const calcularTotal = () => {
    return carrito.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const abrirModalPago = () => {
    if (carrito.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }

    // Para vendedores, verificar que tengan un turno abierto
    if (user?.role === 'VENDEDOR' && !turnoActivo) {
      setMostrarModalAbrirCaja(true);
      return;
    }

    const localId = user?.role === 'ADMIN' ? localSeleccionado : user?.localId;
    if (!localId) {
      toast.error(user?.role === 'ADMIN' ? 'Debes seleccionar un local para realizar la venta' : 'No tienes un local asignado');
      return;
    }

    // Resetear valores
    setMetodoPago(MetodoPago.EFECTIVO);
    setCreditoUsado(0);
    setEfectivoRecibido('');
    setMostrarPago(true);
  };

  const procesarVenta = async () => {
    // Para vendedores, verificar que tengan un turno abierto
    if (user?.role === 'VENDEDOR' && !turnoActivo) {
      setMostrarModalAbrirCaja(true);
      setMostrarPago(false);
      return;
    }

    const total = calcularTotal();
    let creditoAUsar = 0;
    let efectivo = 0;

    // Validar según método de pago
    if (metodoPago === MetodoPago.CREDITO) {
      if (!clienteSeleccionado) {
        toast.error('Se requiere un cliente para pagar con crédito');
        return;
      }
      // Para pago con crédito, debe usar el total completo
      creditoAUsar = total;
      const creditoDisponible = Number(clienteSeleccionado.credito);
      if (creditoDisponible < total) {
        toast.error(`Crédito insuficiente. Disponible: $${creditoDisponible.toFixed(2)}, Total: $${total.toFixed(2)}`);
        return;
      }
    } else if (metodoPago === MetodoPago.MIXTO) {
      creditoAUsar = creditoUsado;
      efectivo = Number(efectivoRecibido) || 0;
      const totalPago = creditoAUsar + efectivo;
      if (totalPago < total) {
        toast.error(`El pago total ($${totalPago.toFixed(2)}) es menor al total de la venta ($${total.toFixed(2)})`);
        return;
      }
      if (clienteSeleccionado) {
        const creditoDisponible = Number(clienteSeleccionado.credito);
        if (creditoAUsar > creditoDisponible) {
          toast.error(`Crédito insuficiente. Disponible: $${creditoDisponible.toFixed(2)}`);
          return;
        }
      }
    } else {
      efectivo = Number(efectivoRecibido) || 0;
      if (efectivo < total) {
        toast.error(`El efectivo recibido ($${efectivo.toFixed(2)}) es menor al total ($${total.toFixed(2)})`);
        return;
      }
    }

    setLoading(true);
    try {
      const localId = user?.role === 'ADMIN' ? localSeleccionado : user?.localId;
      if (!localId) {
        toast.error('Debes seleccionar un local para realizar la venta');
        setLoading(false);
        return;
      }

      const ventaData: any = {
        localId: localId,
        clienteId: clienteSeleccionado?.id || null,
        metodoPago,
        creditoUsado: creditoAUsar,
        detalles: carrito.map((item) => ({
          productoId: item.producto.id,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          subtotal: item.subtotal,
        })),
        total,
      };

      // Solo agregar efectivoRecibido si no es pago con crédito
      if (metodoPago !== MetodoPago.CREDITO && efectivo) {
        ventaData.efectivoRecibido = efectivo;
      }

      const response = await api.post<{ venta: Venta }>('/ventas', ventaData);
      const venta = response.data.venta;
      
      toast.success(`Venta procesada exitosamente - Total: $${total.toLocaleString()}`);
      
      // Mostrar ticket
      setVentaCompletada(venta);
      setMostrarTicket(true);
      setMostrarPago(false);
      
      // Limpiar carrito y cliente
      setCarrito([]);
      setClienteSeleccionado(null);
      setBusqueda('');
      
      // Recargar stocks y clientes (para actualizar crédito)
      await Promise.all([cargarStocks(), cargarClientes()]);
    } catch (error: any) {
      console.error('Error al procesar venta:', error);
      const errorMessage = error.response?.data?.error || 'Error al procesar la venta';
      const errorDetails = error.response?.data?.details;
      
      if (errorDetails && Array.isArray(errorDetails)) {
        const detailsMessage = errorDetails.map((d: any) => `${d.path}: ${d.message}`).join(', ');
        toast.error(`${errorMessage}: ${detailsMessage}`);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const crearCliente = async (data: ClienteForm) => {
    try {
      const response = await api.post<{ cliente: Cliente }>('/clientes', data);
      const nuevoCliente = response.data.cliente;
      setClientes([...clientes, nuevoCliente]);
      setClienteSeleccionado(nuevoCliente);
      setMostrarCrearCliente(false);
      resetCliente();
      toast.success('Cliente creado exitosamente');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al crear cliente');
    }
  };

  const productosFiltrados = productos.filter(
    (p) =>
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.codigo_barras?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className={`space-y-4 ${fullscreen ? 'p-4' : ''}`}>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Punto de Venta</h1>
          {user?.role === 'ADMIN' ? (
            <div className="mt-2">
              <label className="text-sm font-medium text-gray-700 mr-2">Local:</label>
              <select
                value={localSeleccionado}
                onChange={(e) => {
                  setLocalSeleccionado(e.target.value);
                }}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Selecciona un local</option>
                {locales.map((local) => (
                  <option key={local.id} value={local.id}>
                    {local.nombre}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-2">
              {user?.local?.nombre && (
                <span className="text-lg text-gray-600">Local: {user.local.nombre}</span>
              )}
              {/* Indicador de turno */}
              {turnoActivo ? (
                <div className="flex items-center gap-2 px-3 py-1 bg-green-100 border border-green-300 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-semibold text-green-700">
                    Caja abierta - Turno activo
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 border border-yellow-300 rounded-lg">
                  <Lock className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-semibold text-yellow-700">
                    Caja cerrada - Abre un turno para vender
                  </span>
                  <button
                    onClick={() => setMostrarAbrirTurno(true)}
                    className="ml-2 text-xs px-2 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded transition-colors"
                  >
                    Abrir
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setMostrarAyudaTeclado(true)}
            className="btn btn-secondary p-3"
            title="Mostrar atajos de teclado (F1)"
          >
            <Keyboard className="h-5 w-5" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="btn btn-secondary p-3"
            title="Pantalla completa (F11)"
          >
            {fullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Panel izquierdo - Productos */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <Search className="h-6 w-6 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={busqueda}
                onChange={(e) => handleBarcodeInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escanear código de barras o buscar producto..."
                className="input flex-1 text-lg py-4 px-4"
                autoFocus
                autoComplete="off"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-[500px] overflow-y-auto">
              {productosFiltrados.slice(0, 20).map((producto) => {
                const stockDisponible = producto.stock || stocks[producto.id] || 0;
                const stockBajo = stockDisponible <= (producto.stock_minimo || 0);
                const sinStock = stockDisponible <= 0;
                
                return (
                  <button
                    key={producto.id}
                    onClick={() => !sinStock && agregarAlCarrito(producto)}
                    disabled={sinStock}
                    className={`p-4 border-2 rounded-xl transition-all text-left relative min-h-[120px] ${
                      sinStock
                        ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-200'
                        : 'hover:border-primary-500 hover:bg-primary-50 hover:shadow-md active:scale-95 border-gray-300'
                    }`}
                  >
                    <p className="font-bold text-base truncate mb-2">{producto.nombre}</p>
                    <p className="text-primary-600 font-bold text-xl mb-2">${Number(producto.precio).toLocaleString()}</p>
                    <div className="flex items-center gap-2">
                      <Package className={`h-4 w-4 ${sinStock ? 'text-red-500' : stockBajo ? 'text-yellow-500' : 'text-green-500'}`} />
                      <p className={`text-sm font-semibold ${sinStock ? 'text-red-500' : stockBajo ? 'text-yellow-600' : 'text-gray-600'}`}>
                        {stockDisponible}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Panel derecho - Carrito */}
        <div className="space-y-4">
          {/* Cliente */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <UserPlus className="h-6 w-6" />
                Cliente
              </h3>
              <button
                onClick={() => setMostrarCrearCliente(true)}
                className="btn btn-primary text-sm py-2 px-3 flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Nuevo
              </button>
            </div>

            {clienteSeleccionado ? (
              <div className="space-y-3">
                <div className="p-3 bg-green-50 rounded-lg border-2 border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-bold text-gray-900">{clienteSeleccionado.nombre}</p>
                      {clienteSeleccionado.dni && (
                        <p className="text-sm text-gray-600">DNI: {clienteSeleccionado.dni}</p>
                      )}
                      {clienteSeleccionado.telefono && (
                        <p className="text-sm text-gray-600">Tel: {clienteSeleccionado.telefono}</p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setClienteSeleccionado(null);
                        setBusquedaCliente('');
                        setMostrarResultadosCliente(false);
                      }}
                      className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                      title="Quitar cliente"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="mt-2 pt-2 border-t border-green-300">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-blue-900">Crédito disponible:</span>
                      <span className="text-lg font-bold text-blue-600">
                        ${Number(clienteSeleccionado.credito).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative cliente-search-container">
                <div className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-gray-400 absolute left-3 z-10" />
                  <input
                    ref={clienteSearchRef}
                    type="text"
                    value={busquedaCliente}
                    onChange={(e) => buscarCliente(e.target.value)}
                    onKeyDown={handleClienteKeyDown}
                    onFocus={() => {
                      if (busquedaCliente && clientesFiltrados.length > 0) {
                        setMostrarResultadosCliente(true);
                      }
                    }}
                    placeholder="Buscar cliente por DNI, nombre o apellido... (Ctrl+K)"
                    className="input text-base py-3 pl-10 pr-4 w-full"
                    autoComplete="off"
                  />
                </div>

                {/* Resultados de búsqueda */}
                {mostrarResultadosCliente && busquedaCliente && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {clientesFiltrados.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        <p>No se encontraron clientes</p>
                        <button
                          onClick={() => setMostrarCrearCliente(true)}
                          className="mt-2 text-sm text-primary-600 hover:text-primary-700 font-semibold"
                        >
                          Crear nuevo cliente
                        </button>
                      </div>
                    ) : (
                      clientesFiltrados.map((cliente) => (
                        <button
                          key={cliente.id}
                          onClick={() => {
                            setClienteSeleccionado(cliente);
                            setBusquedaCliente('');
                            setMostrarResultadosCliente(false);
                          }}
                          className="w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">{cliente.nombre}</p>
                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                {cliente.dni && (
                                  <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                    DNI: {cliente.dni}
                                  </span>
                                )}
                                {cliente.telefono && (
                                  <span className="text-xs text-gray-600">Tel: {cliente.telefono}</span>
                                )}
                                {cliente.email && (
                                  <span className="text-xs text-gray-500 truncate max-w-[150px]">
                                    {cliente.email}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right ml-3">
                              <p className="text-sm font-bold text-blue-600">
                                ${Number(cliente.credito || 0).toFixed(2)}
                              </p>
                              <p className="text-xs text-gray-500">Crédito</p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Crear Cliente */}
          {mostrarCrearCliente && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => { setMostrarCrearCliente(false); resetCliente(); }}>
              <div ref={modalCrearClienteRef} className="bg-white rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Crear Cliente</h3>
                  <button
                    onClick={() => {
                      setMostrarCrearCliente(false);
                      resetCliente();
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <form onSubmit={handleSubmitCliente(crearCliente)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre y Apellido *
                    </label>
                    <input
                      type="text"
                      {...registerCliente('nombre')}
                      className="input"
                      placeholder="Juan Pérez"
                    />
                    {errorsCliente.nombre && (
                      <p className="text-red-500 text-xs mt-1">{errorsCliente.nombre.message}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        DNI
                      </label>
                      <input
                        type="text"
                        {...registerCliente('dni')}
                        className="input"
                        placeholder="12345678"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Teléfono
                      </label>
                      <input
                        type="text"
                        {...registerCliente('telefono')}
                        className="input"
                        placeholder="1234567890"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      {...registerCliente('email')}
                      className="input"
                      placeholder="email@ejemplo.com"
                    />
                    {errorsCliente.email && (
                      <p className="text-red-500 text-xs mt-1">{errorsCliente.email.message}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMostrarCrearCliente(false);
                        resetCliente();
                      }}
                      className="btn btn-secondary flex-1"
                    >
                      Cancelar
                    </button>
                    <button type="submit" className="btn btn-primary flex-1">
                      Crear
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Carrito */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <ShoppingCart className="h-6 w-6" />
                Carrito ({carrito.length})
              </h3>
              {carrito.length > 0 && (
                <button
                  onClick={confirmarLimpiarCarrito}
                  className="text-sm text-red-600 hover:text-red-700 font-semibold"
                  title="Limpiar carrito (Esc)"
                >
                  Limpiar ({carrito.length})
                </button>
              )}
            </div>

            {carrito.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-500">El carrito está vacío</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left p-3 font-semibold text-gray-700">Producto</th>
                      <th className="text-center p-3 font-semibold text-gray-700">Cantidad</th>
                      <th className="text-right p-3 font-semibold text-gray-700">Precio Unit.</th>
                      <th className="text-right p-3 font-semibold text-gray-700">Subtotal</th>
                      <th className="text-center p-3 font-semibold text-gray-700 w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {carrito.map((item) => {
                      const producto = productos.find((p) => p.id === item.producto.id);
                      const stockDisponible = producto?.stock || stocks[item.producto.id] || 0;
                      const stockRestante = stockDisponible - item.cantidad;
                      
                      return (
                        <tr key={item.producto.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="p-3">
                            <div>
                              <p className="font-semibold text-gray-900">{item.producto.nombre}</p>
                              {item.producto.descripcion && (
                                <p className="text-xs text-gray-500 mt-1">{item.producto.descripcion}</p>
                              )}
                              {item.producto.categoria && (
                                <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                  {item.producto.categoria}
                                </span>
                              )}
                              {stockRestante <= (producto?.stock_minimo || 0) && stockRestante > 0 && (
                                <p className="text-xs text-yellow-600 flex items-center gap-1 mt-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Stock bajo: {stockRestante}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => actualizarCantidad(item.producto.id, item.cantidad - 1)}
                                className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 transition-colors"
                                title="Disminuir"
                              >
                                <Minus className="h-4 w-4 text-gray-700" />
                              </button>
                              <span className="font-bold text-base w-12 text-center">{item.cantidad}</span>
                              <button
                                onClick={() => actualizarCantidad(item.producto.id, item.cantidad + 1)}
                                disabled={stockRestante <= 0}
                                className={`p-1.5 rounded border transition-colors ${
                                  stockRestante <= 0 
                                    ? 'opacity-50 cursor-not-allowed bg-gray-100 border-gray-300' 
                                    : 'bg-gray-100 hover:bg-gray-200 border-gray-300'
                                }`}
                                title="Aumentar"
                              >
                                <Plus className="h-4 w-4 text-gray-700" />
                              </button>
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <span className="font-medium text-gray-700">
                              ${item.precio_unitario.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <span className="font-bold text-primary-600 text-base">
                              ${item.subtotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => eliminarDelCarrito(item.producto.id)}
                              className="mx-auto flex items-center justify-center p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-300 bg-gray-50">
                      <td colSpan={3} className="p-3 text-right font-bold text-gray-900">
                        Total:
                      </td>
                      <td className="p-3 text-right">
                        <span className="font-bold text-xl text-green-600">
                          ${calcularTotal().toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {carrito.length > 0 && (
              <div className="mt-4 pt-4 border-t-2 border-gray-300">
                <button
                  onClick={abrirModalPago}
                  disabled={loading}
                  className="w-full btn btn-primary py-4 text-lg font-bold disabled:opacity-50 shadow-lg hover:shadow-xl transition-shadow"
                  title="Ctrl+Enter o F2 para procesar"
                >
                  {loading ? 'Procesando...' : 'Procesar Venta (Ctrl+Enter / F2)'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Pago */}
      {mostrarPago && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setMostrarPago(false)}>
          <div ref={modalPagoRef} className="bg-white rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Método de Pago</h3>
              <button
                onClick={() => setMostrarPago(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-lg font-semibold mb-2">Total: ${calcularTotal().toFixed(2)}</p>
              </div>

              {/* Método de pago */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Método de Pago
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      setMetodoPago(MetodoPago.EFECTIVO);
                      setCreditoUsado(0);
                    }}
                    className={`p-3 border-2 rounded-lg flex flex-col items-center gap-1 ${
                      metodoPago === MetodoPago.EFECTIVO
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-300'
                    }`}
                  >
                    <DollarSign className="h-5 w-5" />
                    <span className="text-sm font-semibold">Efectivo</span>
                  </button>
                  <button
                    onClick={() => {
                      setMetodoPago(MetodoPago.CREDITO);
                      if (clienteSeleccionado) {
                        // Para crédito, usar el total completo
                        setCreditoUsado(calcularTotal());
                      }
                    }}
                    disabled={!clienteSeleccionado || Number(clienteSeleccionado.credito) <= 0 || (clienteSeleccionado && Number(clienteSeleccionado.credito) < calcularTotal())}
                    className={`p-3 border-2 rounded-lg flex flex-col items-center gap-1 ${
                      metodoPago === MetodoPago.CREDITO
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-300'
                    } ${!clienteSeleccionado || clienteSeleccionado.credito <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <CreditCard className="h-5 w-5" />
                    <span className="text-sm font-semibold">Crédito</span>
                  </button>
                  <button
                    onClick={() => setMetodoPago(MetodoPago.MIXTO)}
                    disabled={!clienteSeleccionado || Number(clienteSeleccionado.credito) <= 0}
                    className={`p-3 border-2 rounded-lg flex flex-col items-center gap-1 ${
                      metodoPago === MetodoPago.MIXTO
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-300'
                    } ${!clienteSeleccionado || clienteSeleccionado.credito <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <DollarSign className="h-5 w-5" />
                    <span className="text-sm font-semibold">Mixto</span>
                  </button>
                </div>
              </div>

              {/* Crédito usado (si aplica) */}
              {(metodoPago === MetodoPago.CREDITO || metodoPago === MetodoPago.MIXTO) && clienteSeleccionado && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Crédito a usar (Disponible: ${Number(clienteSeleccionado.credito).toFixed(2)})
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    max={metodoPago === MetodoPago.CREDITO ? calcularTotal() : Number(clienteSeleccionado.credito)}
                    value={metodoPago === MetodoPago.CREDITO ? calcularTotal() : creditoUsado || ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9.]/g, '');
                      const parts = value.split('.');
                      if (parts.length <= 2) {
                        const numValue = Number(value) || 0;
                        const maxValue = metodoPago === MetodoPago.CREDITO ? calcularTotal() : Number(clienteSeleccionado.credito);
                        setCreditoUsado(Math.max(0, Math.min(numValue, maxValue)));
                      }
                    }}
                    onKeyDown={handleNumericKeyDown}
                    disabled={metodoPago === MetodoPago.CREDITO}
                    className="input w-full"
                    placeholder="0.00"
                  />
                </div>
              )}

              {/* Efectivo recibido */}
              {(metodoPago === MetodoPago.EFECTIVO || metodoPago === MetodoPago.MIXTO) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Efectivo recibido
                  </label>
                  <input
                    ref={efectivoInputRef}
                    type="text"
                    inputMode="decimal"
                    step="0.01"
                    value={efectivoRecibido}
                    onChange={(e) => {
                      // Solo permitir números y punto decimal
                      const value = e.target.value.replace(/[^0-9.]/g, '');
                      // Permitir solo un punto decimal
                      const parts = value.split('.');
                      if (parts.length > 2) {
                        return;
                      }
                      setEfectivoRecibido(value);
                    }}
                    onKeyDown={handleNumericKeyDown}
                    className="input w-full text-lg font-semibold"
                    placeholder={metodoPago === MetodoPago.MIXTO ? `Mínimo: $${(calcularTotal() - creditoUsado).toFixed(2)}` : `Mínimo: $${calcularTotal().toFixed(2)}`}
                    autoFocus
                  />
                  {efectivoRecibido && Number(efectivoRecibido) >= (metodoPago === MetodoPago.MIXTO ? calcularTotal() - creditoUsado : calcularTotal()) && (
                    <p className="text-sm text-green-600 mt-1">
                      Cambio: ${(Number(efectivoRecibido) - (metodoPago === MetodoPago.MIXTO ? calcularTotal() - creditoUsado : calcularTotal())).toFixed(2)}
                    </p>
                  )}
                </div>
              )}

              {/* Resumen */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between text-sm mb-1">
                  <span>Total:</span>
                  <span className="font-semibold">${calcularTotal().toFixed(2)}</span>
                </div>
                {metodoPago === MetodoPago.MIXTO && creditoUsado > 0 && (
                  <div className="flex justify-between text-sm mb-1">
                    <span>Crédito:</span>
                    <span className="font-semibold">-${creditoUsado.toFixed(2)}</span>
                  </div>
                )}
                {metodoPago === MetodoPago.CREDITO && (
                  <div className="flex justify-between text-sm mb-1">
                    <span>Crédito:</span>
                    <span className="font-semibold">-${calcularTotal().toFixed(2)}</span>
                  </div>
                )}
                {(metodoPago === MetodoPago.EFECTIVO || metodoPago === MetodoPago.MIXTO) && efectivoRecibido && (
                  <div className="flex justify-between text-sm mb-1">
                    <span>Efectivo:</span>
                    <span className="font-semibold">${Number(efectivoRecibido).toFixed(2)}</span>
                  </div>
                )}
                {(metodoPago === MetodoPago.EFECTIVO || metodoPago === MetodoPago.MIXTO) && efectivoRecibido && Number(efectivoRecibido) >= (metodoPago === MetodoPago.MIXTO ? calcularTotal() - creditoUsado : calcularTotal()) && (
                  <div className="flex justify-between text-sm font-bold border-t border-gray-300 pt-1 mt-1">
                    <span>Cambio:</span>
                    <span className="text-green-600">
                      ${(Number(efectivoRecibido) - (metodoPago === MetodoPago.MIXTO ? calcularTotal() - creditoUsado : calcularTotal())).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setMostrarPago(false)}
                  className="btn btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button
                  onClick={procesarVenta}
                  disabled={loading}
                  className="btn btn-primary flex-1"
                >
                  {loading ? 'Procesando...' : 'Confirmar Pago'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Ticket */}
      {mostrarTicket && ventaCompletada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-auto" onClick={() => { setMostrarTicket(false); setVentaCompletada(null); }}>
          <div ref={modalTicketRef} onClick={(e) => e.stopPropagation()}>
            <Ticket
              venta={ventaCompletada}
              onClose={() => {
                setMostrarTicket(false);
                setVentaCompletada(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Modal: Sugerencia de abrir caja */}
      {mostrarModalAbrirCaja && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setMostrarModalAbrirCaja(false)}>
          <div ref={modalAbrirCajaRef} className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mx-auto mb-4">
                <Lock className="h-8 w-8 text-yellow-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
                Caja Cerrada
              </h2>
              <p className="text-gray-600 text-center mb-6">
                Para realizar una venta, primero debes abrir un turno (caja).
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <strong>¿Qué es abrir un turno?</strong>
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Al abrir un turno, registras el efectivo inicial en la caja y comienzas a trabajar en un local específico.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setMostrarModalAbrirCaja(false)}
                  className="flex-1 btn btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setMostrarModalAbrirCaja(false);
                    setMostrarAbrirTurno(true);
                  }}
                  className="flex-1 btn btn-primary"
                >
                  Abrir Caja
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Abrir Turno */}
      {mostrarAbrirTurno && user?.role === 'VENDEDOR' && (
        <AbrirTurnoModal
          isOpen={mostrarAbrirTurno}
          onClose={() => setMostrarAbrirTurno(false)}
          locales={locales.length > 0 ? locales : (() => {
            const localesData = localStorage.getItem('localesDisponibles');
            return localesData ? JSON.parse(localesData) : [];
          })()}
          onTurnoAbierto={(turno) => {
            setTurnoActivo(turno);
            setMostrarAbrirTurno(false);
            // Emitir evento para sincronizar con Layout
            window.dispatchEvent(new CustomEvent('turno:actualizado', { detail: turno }));
            toast.success('Turno abierto. Ya puedes realizar ventas.');
            // Si hay items en el carrito, abrir modal de pago
            if (carrito.length > 0) {
              setTimeout(() => {
                abrirModalPago();
              }, 500);
            }
          }}
          esObligatorio={false}
        />
      )}

      {/* Modal de Ayuda de Teclado */}
      {mostrarAyudaTeclado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setMostrarAyudaTeclado(false)}>
          <div ref={modalAyudaTecladoRef} className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <Keyboard className="h-6 w-6 text-primary-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Atajos de Teclado</h2>
                </div>
                <button
                  onClick={() => setMostrarAyudaTeclado(false)}
                  className="text-gray-500 hover:text-gray-700"
                  title="Escape para cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Navegación */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Navegación</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-gray-700">Tab</span>
                      <span className="text-gray-600">Navegar entre campos</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-gray-700"><kbd className="px-2 py-1 bg-gray-200 rounded text-sm">Ctrl</kbd> + <kbd className="px-2 py-1 bg-gray-200 rounded text-sm">K</kbd></span>
                      <span className="text-gray-600">Ir a búsqueda de cliente</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-gray-700"><kbd className="px-2 py-1 bg-gray-200 rounded text-sm">Ctrl</kbd> + <kbd className="px-2 py-1 bg-gray-200 rounded text-sm">P</kbd></span>
                      <span className="text-gray-600">Ir a búsqueda de productos</span>
                    </div>
                  </div>
                </div>

                {/* Ventas */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Ventas</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-gray-700"><kbd className="px-2 py-1 bg-gray-200 rounded text-sm">Ctrl</kbd> + <kbd className="px-2 py-1 bg-gray-200 rounded text-sm">Enter</kbd> o <kbd className="px-2 py-1 bg-gray-200 rounded text-sm">F2</kbd></span>
                      <span className="text-gray-600">Procesar venta (si hay items en carrito)</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-gray-700"><kbd className="px-2 py-1 bg-gray-200 rounded text-sm">Enter</kbd> (en búsqueda)</span>
                      <span className="text-gray-600">Buscar producto</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-gray-700"><kbd className="px-2 py-1 bg-gray-200 rounded text-sm">Enter</kbd> (en efectivo recibido)</span>
                      <span className="text-gray-600">Confirmar pago (si está completo)</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-gray-700"><kbd className="px-2 py-1 bg-gray-200 rounded text-sm">Enter</kbd> (en búsqueda cliente)</span>
                      <span className="text-gray-600">Seleccionar primer resultado</span>
                    </div>
                  </div>
                </div>

                {/* Teclado Numérico */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Teclado Numérico</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-gray-700">Números (0-9)</span>
                      <span className="text-gray-600">Ingresar cantidades y precios</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-gray-700">Punto (.) o Coma (,)</span>
                      <span className="text-gray-600">Separador decimal (se convierte a punto)</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-gray-700">Teclado numérico</span>
                      <span className="text-gray-600">Funciona en todos los campos numéricos</span>
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Acciones</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-gray-700"><kbd className="px-2 py-1 bg-gray-200 rounded text-sm">Esc</kbd></span>
                      <span className="text-gray-600">Cerrar modales, limpiar búsqueda, quitar cliente o limpiar carrito</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-gray-700"><kbd className="px-2 py-1 bg-gray-200 rounded text-sm">F1</kbd></span>
                      <span className="text-gray-600">Mostrar/ocultar esta ayuda</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-gray-700"><kbd className="px-2 py-1 bg-gray-200 rounded text-sm">F11</kbd></span>
                      <span className="text-gray-600">Pantalla completa</span>
                    </div>
                  </div>
                </div>

                {/* Información adicional */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Tip:</strong> Los escáneres de código de barras funcionan automáticamente cuando estás en el campo de búsqueda de productos. Simplemente escanea y presiona Enter.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setMostrarAyudaTeclado(false)}
                  className="btn btn-primary"
                  title="Escape para cerrar"
                >
                  Cerrar (Esc)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo de confirmación para limpiar carrito */}
      <ConfirmDialog
        isOpen={mostrarConfirmacionLimpiarCarrito}
        onClose={() => setMostrarConfirmacionLimpiarCarrito(false)}
        onConfirm={ejecutarLimpiarCarrito}
        title="Limpiar Carrito"
        message={`¿Estás seguro de que deseas limpiar el carrito?\n\n` +
          `Productos en el carrito: ${carrito.length}\n` +
          `Total: $${calcularTotal().toLocaleString('es-ES', { minimumFractionDigits: 2 })}\n\n` +
          `Esta acción eliminará todos los productos del carrito y no se puede deshacer.`}
        confirmText="Sí, limpiar"
        cancelText="Cancelar"
        variant="warning"
        isLoading={false}
      />
    </div>
  );
};

export default Ventas;


