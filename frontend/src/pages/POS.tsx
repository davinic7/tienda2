import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Layout from '@/components/Layout';
import ModalCaja from '@/components/ModalCaja';
import ModalConfirmarVenta from '@/components/ModalConfirmarVenta';
import type { Producto, Cliente, Combo, Local } from '@shared/types';
import { Search, ShoppingCart, User, Plus, Minus, X, Trash2, Scan, DollarSign, Package, Gift, AlertCircle, Scale } from 'lucide-react';
import { setupBarcodeScanner } from '@/utils/scanner.util';
import { detectScale } from '@/utils/scale.util';

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
  stockDisponible: number;
}

export default function POS() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  // Solo vendedores pueden acceder al POS
  useEffect(() => {
    if (user && user.role !== 'VENDEDOR') {
      toast.error('Solo los vendedores pueden realizar ventas');
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const [productos, setProductos] = useState<Producto[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [locales, setLocales] = useState<Local[]>([]);
  const [productosFiltrados, setProductosFiltrados] = useState<Producto[]>([]);
  const [productosMostrados, setProductosMostrados] = useState<Producto[]>([]);
  const [vistaActual, setVistaActual] = useState<'productos' | 'combos'>('productos');
  const [busqueda, setBusqueda] = useState('');
  const [categoriaSeleccionada] = useState<string>('');
  const [carrito, setCarrito] = useState<CarritoItem[]>([]);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [clientesSugeridos, setClientesSugeridos] = useState<Cliente[]>([]);
  const [mostrandoBusquedaCliente, setMostrandoBusquedaCliente] = useState(false);
  const [cajaAbierta, setCajaAbierta] = useState<boolean>(false);
  const [mostrarModalCaja, setMostrarModalCaja] = useState(false);
  const [mostrarModalConfirmar, setMostrarModalConfirmar] = useState(false);
  const [vistaProductos] = useState<'grid' | 'lista'>('grid');
  const [localOrigenId, setLocalOrigenId] = useState<string>('');
  const [nombreComprador, setNombreComprador] = useState('');
  const [pesoActual, setPesoActual] = useState<number | null>(null);
  const [productoConPeso, setProductoConPeso] = useState<Producto | null>(null);
  const [mostrarModalPeso, setMostrarModalPeso] = useState(false);
  const busquedaRef = useRef<HTMLInputElement>(null);
  const [escannerActivo, setEscannerActivo] = useState(true);

  useEffect(() => {
    if (user?.role === 'VENDEDOR') {
      cargarProductos();
      cargarCombos();
      cargarLocales();
      verificarCaja();
      verificarBalanza();
    }
  }, [user]);

  // Configurar escáner de código de barras (después de definir agregarAlCarrito)
  useEffect(() => {
    if (!escannerActivo || vistaActual !== 'productos') return;

    const cleanup = setupBarcodeScanner(async (barcode: string) => {
      // Buscar producto por código de barras
      try {
        const response = await api.get<Producto>(`/productos/codigo/${barcode}`);
        const producto = response.data;
        
        // Si el producto requiere peso, mostrar modal de peso
        if (producto.unidadMedida === 'KG' || producto.unidadMedida === 'G') {
          setProductoConPeso(producto);
          setMostrarModalPeso(true);
        } else {
          await agregarAlCarrito(producto);
        }
        
        // Limpiar búsqueda
        setBusqueda('');
        if (busquedaRef.current) {
          busquedaRef.current.value = '';
        }
      } catch (error: any) {
        if (error.response?.status === 404) {
          toast.error(`Producto con código ${barcode} no encontrado`);
        } else {
          toast.error('Error al buscar producto');
        }
      }
    }, {
      minLength: 3,
      maxLength: 50,
      delay: 50,
    });

    return cleanup;
  }, [escannerActivo, vistaActual]);

  const verificarBalanza = async () => {
    try {
      const tieneBalanza = await detectScale();
      if (tieneBalanza) {
        toast.success('Balanza detectada', { duration: 2000 });
      }
    } catch (error) {
      // Silencioso - no todas las balanzas son detectables
    }
  };

  const verificarCaja = async () => {
    try {
      const response = await api.get('/caja/estado');
      setCajaAbierta(response.data.cajaAbierta);
    } catch (error: any) {
      console.error('Error al verificar caja:', error);
    }
  };

  useEffect(() => {
    if (busqueda) {
      const termino = busqueda.toLowerCase();
      const filtrados = productos.filter(
        (p) =>
          p.nombre.toLowerCase().includes(termino) ||
          p.codigoBarras?.toLowerCase().includes(termino) ||
          p.categoria?.toLowerCase().includes(termino)
      );
      setProductosFiltrados(filtrados.slice(0, 20));
    } else {
      setProductosFiltrados([]);
    }
  }, [busqueda, productos]);

  // const categorias = Array.from(new Set(productos.map((p) => p.categoria).filter((cat): cat is string => Boolean(cat)))).sort();

  useEffect(() => {
    // Mostrar productos según búsqueda o categoría
    if (busqueda && productosFiltrados.length > 0) {
      setProductosMostrados(productosFiltrados);
    } else if (categoriaSeleccionada) {
      const filtrados = productos.filter((p) => p.categoria === categoriaSeleccionada);
      setProductosMostrados(filtrados);
    } else {
      // Mostrar todos los productos activos
      setProductosMostrados(productos.slice(0, 50));
    }
  }, [busqueda, productosFiltrados, categoriaSeleccionada, productos]);

  useEffect(() => {
    if (busquedaCliente.length >= 2) {
      buscarClientes();
    } else {
      setClientesSugeridos([]);
    }
  }, [busquedaCliente]);

  const cargarProductos = async () => {
    try {
      const response = await api.get<Producto[]>('/productos?activo=true');
      // Cargar stock para cada producto
      const productosConStock = await Promise.all(
        response.data.map(async (producto) => {
          try {
            const stockResponse = await api.get(`/stock?productoId=${producto.id}`);
            const stock = stockResponse.data[0];
            return { ...producto, stockDisponible: stock?.cantidad || 0 };
          } catch {
            return { ...producto, stockDisponible: 0 };
          }
        })
      );
      setProductos(productosConStock);
    } catch (error: any) {
      toast.error('Error al cargar productos');
      console.error('Error al cargar productos:', error);
    }
  };

  const cargarCombos = async () => {
    try {
      const response = await api.get<Combo[]>('/combos?activo=true');
      setCombos(response.data);
    } catch (error: any) {
      console.error('Error al cargar combos:', error);
    }
  };

  const cargarLocales = async () => {
    try {
      const response = await api.get<Local[]>('/locales?activo=true');
      setLocales(response.data);
    } catch (error: any) {
      console.error('Error al cargar locales:', error);
    }
  };

  const buscarClientes = async () => {
    try {
      const response = await api.get<Cliente[]>(`/clientes?search=${encodeURIComponent(busquedaCliente)}`);
      setClientesSugeridos(response.data);
    } catch (error: any) {
      console.error('Error al buscar clientes:', error);
      toast.error('Error al buscar clientes');
    }
  };

  const agregarAlCarrito = async (producto: Producto | any) => {
    try {
      // Obtener stock del producto usando la ruta correcta con query params
      const stockResponse = await api.get(`/stock?productoId=${producto.id}`);
      const stock = stockResponse.data[0];
      const stockDisponible = stock?.cantidad || 0;

      if (stockDisponible <= 0) {
        // Consultar disponibilidad en otros locales
        const otrosStocks = await consultarDisponibilidadOtrosLocales(producto.id);
        if (otrosStocks.length > 0) {
          const localesDisponibles = otrosStocks.map((s: any) => {
            const local = locales.find((l) => l.id === s.localId);
            return local?.nombre || s.localId;
          }).join(', ');
          toast.error(
            `Sin stock en tu local. Disponible en: ${localesDisponibles}. Activa "Venta Remota" al confirmar.`,
            { duration: 6000 }
          );
        } else {
          toast.error('Producto sin stock disponible en ningún local');
        }
        return;
      }

      const itemExistente = carrito.find((item) => item.producto.id === producto.id);

      if (itemExistente) {
        const nuevaCantidad = itemExistente.cantidad + 1;
        if (nuevaCantidad > stockDisponible) {
          toast.error(`Stock insuficiente. Disponible: ${stockDisponible}`);
          return;
        }
        setCarrito(
          carrito.map((item) =>
            item.producto.id === producto.id
              ? {
                  ...item,
                  cantidad: nuevaCantidad,
                  subtotal: nuevaCantidad * item.precioUnitario,
                  stockDisponible, // Actualizar stock disponible
                }
              : item
          )
        );
        toast.success(`${producto.nombre} - Cantidad actualizada`, { duration: 2000 });
      } else {
        // Usar precioFinal si está disponible, sino precio
        const precioUnitario = Number(producto.precioFinal || producto.precio || 0);
        setCarrito([
          ...carrito,
          {
            producto,
            cantidad: 1,
            precioUnitario,
            subtotal: precioUnitario,
            stockDisponible,
          },
        ]);
        toast.success(`${producto.nombre} agregado al carrito`, { duration: 2000 });
      }
      setBusqueda('');
      setProductosFiltrados([]);
    } catch (error: any) {
      console.error('Error al obtener stock:', error);
      toast.error(error.response?.data?.error || 'Error al obtener stock del producto');
    }
  };

  const eliminarDelCarrito = (productoId: string) => {
    setCarrito(carrito.filter((item) => item.producto.id !== productoId));
    toast.success('Producto eliminado del carrito');
  };

  const actualizarCantidad = (productoId: string, nuevaCantidad: number) => {
    if (nuevaCantidad <= 0) {
      eliminarDelCarrito(productoId);
      return;
    }

    const item = carrito.find((item) => item.producto.id === productoId);
    if (!item) return;

    // Si el stock disponible es 0, permitir cualquier cantidad (será venta remota)
    if (item.stockDisponible > 0 && nuevaCantidad > item.stockDisponible) {
      toast.error(`Stock insuficiente. Disponible: ${item.stockDisponible}. Activa venta remota para más cantidad.`);
      return;
    }

    setCarrito(
      carrito.map((item) =>
        item.producto.id === productoId
          ? {
              ...item,
              cantidad: nuevaCantidad,
              subtotal: nuevaCantidad * item.precioUnitario,
            }
          : item
      )
    );
  };

  const calcularTotal = () => {
    return carrito.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const abrirModalConfirmar = () => {
    if (carrito.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }

    if (!cajaAbierta) {
      toast.error('Debes abrir una caja antes de realizar ventas', {
        duration: 5000,
      });
      setMostrarModalCaja(true);
      return;
    }

    setMostrarModalConfirmar(true);
  };

  const agregarComboAlCarrito = (combo: Combo) => {
    if (!combo.productos || combo.productos.length === 0) {
      toast.error('El combo no tiene productos');
      return;
    }

    // Verificar stock de todos los productos del combo
    const productosSinStock: string[] = [];
    combo.productos.forEach((item: { productoId: string; cantidad: number }) => {
      const producto = productos.find((p: Producto) => p.id === item.productoId);
      if (producto) {
        const stock = producto.stockDisponible || 0;
        if (stock < item.cantidad) {
          productosSinStock.push(`${producto.nombre} (necesita ${item.cantidad}, disponible ${stock})`);
        }
      }
    });

    if (productosSinStock.length > 0) {
      toast.error(`Stock insuficiente: ${productosSinStock.join(', ')}`);
      return;
    }

    // Agregar todos los productos del combo al carrito
    combo.productos.forEach((item: { productoId: string; cantidad: number }) => {
      const producto = productos.find((p: Producto) => p.id === item.productoId);
      if (producto) {
        const precioUnitario = Number(producto.precioFinal || producto.precio || 0);
        const precioCombo = Number(combo.precioPromocional) / (combo.productos?.reduce((sum: number, p: { cantidad: number }) => sum + p.cantidad, 0) || 1);
        const precioFinal = precioCombo < precioUnitario ? precioCombo : precioUnitario;
        
        const itemExistente = carrito.find((item) => item.producto.id === producto.id);
        if (itemExistente) {
          const nuevaCantidad = itemExistente.cantidad + item.cantidad;
          setCarrito(
            carrito.map((cItem) =>
              cItem.producto.id === producto.id
                ? {
                    ...cItem,
                    cantidad: nuevaCantidad,
                    precioUnitario: precioFinal,
                    subtotal: nuevaCantidad * precioFinal,
                  }
                : cItem
            )
          );
        } else {
          setCarrito([
            ...carrito,
            {
              producto,
              cantidad: item.cantidad,
              precioUnitario: precioFinal,
              subtotal: item.cantidad * precioFinal,
              stockDisponible: producto.stockDisponible || 0,
            },
          ]);
        }
      }
    });

    toast.success(`Combo "${combo.nombre}" agregado al carrito`, { duration: 2000 });
  };

  const consultarDisponibilidadOtrosLocales = async (productoId: string) => {
    try {
      const response = await api.get(`/stock?productoId=${productoId}`);
      const stocks = response.data.filter((s: any) => s.cantidad > 0 && s.localId !== user?.localId);
      return stocks;
    } catch (error) {
      return [];
    }
  };

  const handleVentaCompletada = () => {
    setCarrito([]);
    setCliente(null);
    setBusqueda('');
    setLocalOrigenId('');
    setNombreComprador('');
    cargarProductos();
    cargarCombos();
    verificarCaja();
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && productosFiltrados.length > 0) {
      const producto = productosFiltrados[0];
      // Si requiere peso, mostrar modal
      if (producto.unidadMedida === 'KG' || producto.unidadMedida === 'G') {
        setProductoConPeso(producto);
        setMostrarModalPeso(true);
      } else {
        agregarAlCarrito(producto);
      }
      setBusqueda('');
    }
  };

  const agregarProductoConPeso = async (peso: number) => {
    if (!productoConPeso) return;
    
    try {
      const stockResponse = await api.get(`/stock?productoId=${productoConPeso.id}`);
      const stock = stockResponse.data[0];
      const stockDisponible = stock?.cantidad || 0;

      // Para productos por peso, verificar que haya stock suficiente
      if (stockDisponible <= 0) {
        toast.error('Producto sin stock disponible');
        return;
      }

      const precioUnitario = Number(productoConPeso.precioFinal || productoConPeso.precio || 0);
      const precioPorPeso = precioUnitario * peso; // Precio por kg/g * peso
      
      setCarrito([
        ...carrito,
        {
          producto: productoConPeso,
          cantidad: peso, // La cantidad es el peso
          precioUnitario: precioUnitario,
          subtotal: precioPorPeso,
          stockDisponible,
        },
      ]);

      toast.success(`${productoConPeso.nombre} (${peso} ${productoConPeso.unidadMedida?.toLowerCase()}) agregado`, { duration: 2000 });
      setMostrarModalPeso(false);
      setProductoConPeso(null);
      setPesoActual(null);
      setBusqueda('');
    } catch (error: any) {
      toast.error('Error al agregar producto');
    }
  };

  const leerPesoDesdeBalanza = async () => {
    // Intentar leer desde dispositivo HID
    try {
      if ('hid' in navigator) {
        // Solicitar acceso al dispositivo
        const devices = await (navigator as any).hid.requestDevice({
          filters: [
            { usagePage: 0xff00 }, // Algunas balanzas
            { usagePage: 0x0c }, // Consumer devices
          ],
        });
        
        if (devices.length > 0) {
          const device = devices[0];
          await device.open();
          
          // Escuchar datos de la balanza
          device.addEventListener('inputreport', (event: any) => {
            try {
              const data = new Uint8Array(event.data.buffer);
              // Parsear según formato común de balanzas (varía por modelo)
              // Formato común: peso en bytes específicos
              if (data.length >= 6) {
                // Intentar parsear como número decimal
                const pesoStr = String.fromCharCode(...data.slice(0, 6))
                  .replace(/[^\d.]/g, '');
                const peso = parseFloat(pesoStr);
                if (!isNaN(peso) && peso > 0) {
                  setPesoActual(peso);
                  toast.success(`Peso leído: ${peso} ${productoConPeso?.unidadMedida?.toLowerCase()}`);
                }
              }
            } catch (error) {
              console.error('Error al parsear peso:', error);
            }
          });
          
          toast.success('Balanza conectada. Coloca el producto en la balanza.');
        } else {
          // Si no hay dispositivo HID, intentar leer desde entrada de texto
          // (algunas balanzas envían peso como texto)
          toast('Ingresa el peso manualmente o conecta la balanza USB', { duration: 3000, icon: 'ℹ️' });
        }
      } else {
        // Navegador no soporta HID, usar entrada manual
        toast('Tu navegador no soporta lectura directa de balanzas. Ingresa el peso manualmente.', { duration: 4000, icon: 'ℹ️' });
      }
    } catch (error: any) {
      // Si el usuario cancela o hay error, usar entrada manual
      if (error.name !== 'NotFoundError') {
        console.error('Error al conectar balanza:', error);
      }
      toast('Ingresa el peso manualmente', { duration: 3000, icon: 'ℹ️' });
    }
  };

  // Detectar peso desde entrada de texto (para balanzas que funcionan como teclado)
  // Esto se maneja en el input del modal de peso directamente

  // Si no es vendedor, mostrar mensaje
  if (user?.role !== 'VENDEDOR') {
    return (
      <Layout>
        <div className="p-8 text-center">
          <p className="text-gray-600">Solo los vendedores pueden realizar ventas</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-[calc(100vh-4rem)] flex flex-col bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">Punto de Venta</h1>
              <p className="text-sm text-gray-600 mt-1">{user?.local?.nombre}</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setMostrarModalCaja(true)}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors font-medium ${
                  cajaAbierta
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                }`}
                title={cajaAbierta ? 'Cerrar Caja' : 'Abrir Caja'}
              >
                <DollarSign className="w-5 h-5 mr-2" />
                {cajaAbierta ? 'Caja Abierta' : 'Caja Cerrada'}
              </button>
              {cliente && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center px-4 py-2 bg-green-50 rounded-lg border border-green-200">
                    <User className="w-4 h-4 text-green-600 mr-2" />
                    <span className="text-sm font-medium text-green-900">{cliente.nombre}</span>
                    {getCreditoAsNumber(cliente.credito) > 0 && (
                      <span className="ml-3 text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded">
                        ${getCreditoAsNumber(cliente.credito).toFixed(2)} crédito
                      </span>
                    )}
                    <button
                      onClick={() => {
                        setCliente(null);
                        setBusquedaCliente('');
                      }}
                      className="ml-2 text-green-600 hover:text-green-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Panel izquierdo - Búsqueda */}
          <div className="w-1/2 border-r bg-white overflow-y-auto">
            {/* Búsqueda de cliente */}
            <div className="p-4 border-b bg-gray-50">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Cliente (opcional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={busquedaCliente}
                  onChange={(e) => {
                    setBusquedaCliente(e.target.value);
                    setMostrandoBusquedaCliente(true);
                  }}
                  onFocus={() => setMostrandoBusquedaCliente(true)}
                  placeholder="Buscar cliente..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                {mostrandoBusquedaCliente && clientesSugeridos.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {clientesSugeridos.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setCliente(c);
                          setBusquedaCliente(c.nombre);
                          setMostrandoBusquedaCliente(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-green-50 transition-colors"
                      >
                        <div className="font-medium text-gray-900">{c.nombre}</div>
                        {c.email && <div className="text-sm text-gray-600">{c.email}</div>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tabs Productos/Combos */}
            <div className="p-4 border-b bg-white sticky top-0 z-10">
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setVistaActual('productos')}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    vistaActual === 'productos'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Package className="w-4 h-4 inline mr-2" />
                  Productos
                </button>
                <button
                  onClick={() => setVistaActual('combos')}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    vistaActual === 'combos'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Gift className="w-4 h-4 inline mr-2" />
                  Combos
                </button>
              </div>
              {vistaActual === 'productos' && (
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="relative">
                    <input
                      ref={busquedaRef}
                      type="text"
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Buscar producto o escanear código de barras..."
                      className="block w-full pl-12 pr-20 py-3 text-base border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 shadow-sm transition-all"
                      autoFocus
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <button
                        onClick={() => setEscannerActivo(!escannerActivo)}
                        className={`p-2 rounded-lg transition-colors ${
                          escannerActivo
                            ? 'bg-green-100 text-green-600'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                        title={escannerActivo ? 'Escáner activo' : 'Escáner desactivado'}
                      >
                        <Scan className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  {busqueda && (
                    <button
                      onClick={() => {
                        setBusqueda('');
                        setProductosFiltrados([]);
                      }}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center"
                    >
                      <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Lista de productos o combos */}
            <div className="p-4">
              {vistaActual === 'combos' ? (
                // Vista de Combos
                combos.length === 0 ? (
                  <div className="text-center text-gray-500 py-12">
                    <Gift className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-lg font-medium">No hay combos disponibles</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {combos.map((combo) => {
                      const precioTotalProductos = combo.productos?.reduce((sum: number, p: { producto?: { precioFinal?: number | null; precio?: number | null }; cantidad: number }) => {
                        const precio = p.producto?.precioFinal || p.producto?.precio || 0;
                        return sum + Number(precio) * p.cantidad;
                      }, 0) || 0;
                      const ahorro = precioTotalProductos - Number(combo.precioPromocional);

                      return (
                        <button
                          key={combo.id}
                          onClick={() => agregarComboAlCarrito(combo)}
                          className="text-left p-3 border-2 rounded-xl border-purple-200 bg-white hover:border-purple-500 hover:shadow-md transition-all"
                        >
                          <div className="w-full h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg mb-2 flex items-center justify-center">
                            <Gift className="w-8 h-8 text-purple-400" />
                          </div>
                          <h3 className="font-semibold text-sm text-gray-900 mb-1 line-clamp-2">
                            {combo.nombre}
                          </h3>
                          <div className="text-lg font-bold text-purple-600 mb-1">
                            ${Number(combo.precioPromocional).toFixed(2)}
                          </div>
                          {ahorro > 0 && (
                            <p className="text-xs text-green-600">Ahorro: ${ahorro.toFixed(2)}</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )
              ) : (
                // Vista de Productos
                productosMostrados.length === 0 && (
                  <div className="text-center text-gray-500 py-12">
                    <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-lg font-medium">
                      {busqueda ? 'No se encontraron productos' : 'No hay productos disponibles'}
                    </p>
                    {busqueda && (
                      <p className="text-sm mt-2">Intenta con otro término de búsqueda</p>
                    )}
                  </div>
                )
              )}

              {vistaActual === 'productos' && productosMostrados.length > 0 && (
                <div
                  className={
                    vistaProductos === 'grid'
                      ? 'grid grid-cols-2 gap-3'
                      : 'grid gap-3'
                  }
                >
                  {productosMostrados.map((producto: any) => {
                    const itemEnCarrito = carrito.find((item) => item.producto.id === producto.id);
                    const stockDisponible = producto.stockDisponible || 0;
                    const sinStock = stockDisponible <= 0;

                    if (vistaProductos === 'grid') {
                      return (
                        <button
                          key={producto.id}
                          onClick={() => !sinStock && agregarAlCarrito(producto)}
                          disabled={sinStock}
                          className={`group relative text-left p-3 border-2 rounded-xl transition-all duration-200 ${
                            sinStock
                              ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                              : 'border-gray-200 bg-white hover:border-green-500 hover:shadow-md'
                          }`}
                        >
                          {producto.imagenUrl ? (
                            <div className="w-full h-24 bg-gray-100 rounded-lg mb-2 overflow-hidden">
                              <img
                                src={producto.imagenUrl}
                                alt={producto.nombre}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-full h-24 bg-gradient-to-br from-green-100 to-green-50 rounded-lg mb-2 flex items-center justify-center">
                              <Package className="w-8 h-8 text-green-400" />
                            </div>
                          )}
                          <div className="space-y-1">
                            <div className="flex items-start justify-between">
                              <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 flex-1">
                                {producto.nombre}
                              </h3>
                              {itemEnCarrito && (
                                <span className="flex-shrink-0 ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                  {itemEnCarrito.cantidad}
                                </span>
                              )}
                            </div>
                            {producto.categoria && (
                              <p className="text-xs text-gray-500">{producto.categoria}</p>
                            )}
                            <div className="flex items-center justify-between">
                              <div className="text-lg font-bold text-green-600">
                                ${Number(producto.precioFinal || producto.precio || 0).toFixed(2)}
                              </div>
                              {sinStock ? (
                                <span className="text-xs text-red-600 font-medium">Sin stock</span>
                              ) : (
                                <span className="text-xs text-gray-500">Stock: {stockDisponible}</span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    }

                    // Vista lista
                    return (
                      <button
                        key={producto.id}
                        onClick={() => !sinStock && agregarAlCarrito(producto)}
                        disabled={sinStock}
                        className={`group relative text-left p-4 border-2 rounded-xl transition-all duration-200 ${
                          sinStock
                            ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                            : 'border-gray-200 bg-white hover:border-green-500 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="font-semibold text-gray-900 truncate">
                                {producto.nombre}
                              </h3>
                              {itemEnCarrito && (
                                <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                  {itemEnCarrito.cantidad} en carrito
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-500">
                              {producto.categoria && (
                                <span className="px-2 py-0.5 bg-gray-100 rounded">{producto.categoria}</span>
                              )}
                              {producto.codigoBarras && (
                                <span>Código: {producto.codigoBarras}</span>
                              )}
                              {sinStock ? (
                                <span className="text-red-600 font-medium">Sin stock</span>
                              ) : (
                                <span>Stock: {stockDisponible}</span>
                              )}
                            </div>
                          </div>
                          <div className="ml-4 text-right">
                            <div className="text-xl font-bold text-green-600">
                              ${Number(producto.precioFinal || producto.precio || 0).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Panel derecho - Carrito */}
          <div className="w-1/2 bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
            <div className="p-6 border-b bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <ShoppingCart className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Carrito</h2>
                    <p className="text-sm text-gray-600">{carrito.length} producto(s)</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {carrito.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <ShoppingCart className="w-24 h-24 mb-4 opacity-30" />
                  <p className="text-lg font-medium">El carrito está vacío</p>
                  <p className="text-sm mt-2">Busca productos para agregarlos</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {carrito.map((item) => {
                    const requiereVentaRemota = item.stockDisponible === 0;
                    return (
                      <div
                        key={item.producto.id}
                        className={`bg-white rounded-xl border-2 p-4 shadow-sm hover:shadow-md transition-shadow ${
                          requiereVentaRemota ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'
                        }`}
                      >
                        {requiereVentaRemota && (
                          <div className="flex items-center gap-2 mb-2 p-2 bg-yellow-100 rounded-lg text-xs text-yellow-800">
                            <AlertCircle className="w-4 h-4" />
                            <span>Requiere venta remota - Sin stock en tu local</span>
                          </div>
                        )}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 mb-1">{item.producto.nombre}</h3>
                            <p className="text-sm text-gray-600">
                              ${item.precioUnitario.toFixed(2)} c/u
                            </p>
                          </div>
                        <button
                          onClick={() => eliminarDelCarrito(item.producto.id)}
                          className="ml-2 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => actualizarCantidad(item.producto.id, item.cantidad - 1)}
                            className="w-9 h-9 flex items-center justify-center rounded-lg border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 transition-colors"
                          >
                            <Minus className="w-4 h-4 text-gray-600" />
                          </button>
                          <input
                            type="number"
                            value={item.cantidad}
                            onChange={(e) =>
                              actualizarCantidad(
                                item.producto.id,
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-16 text-center border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-semibold"
                            min="1"
                            max={item.stockDisponible}
                          />
                          <button
                            onClick={() => actualizarCantidad(item.producto.id, item.cantidad + 1)}
                            disabled={item.stockDisponible > 0 && item.cantidad >= item.stockDisponible}
                            className="w-9 h-9 flex items-center justify-center rounded-lg border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Plus className="w-4 h-4 text-gray-600" />
                          </button>
                          <span className={`text-xs ml-2 ${requiereVentaRemota ? 'text-yellow-600 font-medium' : 'text-gray-500'}`}>
                            {requiereVentaRemota ? 'Venta remota' : `Stock: ${item.stockDisponible}`}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">
                            ${item.subtotal.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer - Total y botón */}
            <div className="border-t bg-white p-6 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <span className="text-xl font-semibold text-gray-700">Total:</span>
                <span className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  ${calcularTotal().toFixed(2)}
                </span>
              </div>
              {!cajaAbierta && (
                <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  ⚠️ Debes abrir una caja antes de realizar ventas
                </div>
              )}
              <button
                onClick={abrirModalConfirmar}
                disabled={carrito.length === 0 || !cajaAbierta}
                className="w-full flex items-center justify-center py-4 px-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Procesar Venta
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Caja */}
      <ModalCaja
        isOpen={mostrarModalCaja}
        onClose={() => setMostrarModalCaja(false)}
        modo="auto"
        onCajaAbierta={() => {
          verificarCaja();
        }}
      />

      {/* Modal de Peso para productos que requieren peso */}
      {mostrarModalPeso && productoConPeso && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => {
              setMostrarModalPeso(false);
              setProductoConPeso(null);
              setPesoActual(null);
            }} />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Ingresar Peso</h3>
                  <button
                    onClick={() => {
                      setMostrarModalPeso(false);
                      setProductoConPeso(null);
                      setPesoActual(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      Producto: <span className="font-semibold">{productoConPeso.nombre}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      Unidad: {productoConPeso.unidadMedida}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Peso ({productoConPeso.unidadMedida?.toLowerCase()}) *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.001"
                        min="0.001"
                        value={pesoActual || ''}
                        onChange={(e) => {
                          const peso = parseFloat(e.target.value);
                          setPesoActual(isNaN(peso) ? null : peso);
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-lg font-semibold"
                        placeholder="0.000"
                        autoFocus
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && pesoActual && pesoActual > 0) {
                            agregarProductoConPeso(pesoActual);
                          }
                        }}
                      />
                      <button
                        onClick={leerPesoDesdeBalanza}
                        className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center"
                        title="Leer desde balanza"
                      >
                        <Scale className="w-5 h-5" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Presiona Enter para agregar o haz clic en el botón de balanza
                    </p>
                  </div>
                  {pesoActual && pesoActual > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm text-green-800">
                        Precio: ${(Number(productoConPeso.precioFinal || productoConPeso.precio || 0) * pesoActual).toFixed(2)}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        {pesoActual} {productoConPeso.unidadMedida?.toLowerCase()} × ${Number(productoConPeso.precioFinal || productoConPeso.precio || 0).toFixed(2)}/{productoConPeso.unidadMedida?.toLowerCase()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={() => pesoActual && pesoActual > 0 && agregarProductoConPeso(pesoActual)}
                  disabled={!pesoActual || pesoActual <= 0}
                  className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Agregar al Carrito
                </button>
                <button
                  onClick={() => {
                    setMostrarModalPeso(false);
                    setProductoConPeso(null);
                    setPesoActual(null);
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmar Venta */}
      <ModalConfirmarVenta
        isOpen={mostrarModalConfirmar}
        onClose={() => setMostrarModalConfirmar(false)}
        onVentaCompletada={handleVentaCompletada}
        carrito={carrito}
        clienteActual={cliente}
        locales={locales}
        localOrigenId={localOrigenId}
        nombreComprador={nombreComprador}
        onLocalOrigenChange={setLocalOrigenId}
        onNombreCompradorChange={setNombreComprador}
        onClienteSeleccionado={(cliente) => {
          setCliente(cliente);
          setBusquedaCliente(cliente ? cliente.nombre : '');
        }}
      />
    </Layout>
  );
}
