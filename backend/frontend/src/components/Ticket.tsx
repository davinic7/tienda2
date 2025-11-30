import { Venta } from '../types';
import { Printer, X } from 'lucide-react';
import { format } from 'date-fns';

interface TicketProps {
  venta: Venta;
  onClose: () => void;
}

const Ticket = ({ venta, onClose }: TicketProps) => {
  const handlePrint = () => {
    window.print();
  };

  const calcularCambio = () => {
    if (!venta.efectivoRecibido) return 0;
    const total = Number(venta.total);
    const efectivo = Number(venta.efectivoRecibido);
    const credito = venta.creditoUsado || 0;
    return Math.max(0, efectivo - (total - credito));
  };

  return (
    <>
      {/* Controles fuera del área de impresión */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={handlePrint}
          className="btn btn-primary flex items-center gap-2"
        >
          <Printer className="h-5 w-5" />
          Imprimir
        </button>
        <button
          onClick={onClose}
          className="btn btn-secondary flex items-center gap-2"
        >
          <X className="h-5 w-5" />
          Cerrar
        </button>
      </div>

      {/* Ticket/Factura */}
      <div className="max-w-md mx-auto bg-white p-6 print:p-4 print:max-w-none">
        {/* Encabezado */}
        <div className="text-center mb-6 border-b-2 border-gray-300 pb-4">
          <h1 className="text-2xl font-bold mb-2">TICKET DE VENTA</h1>
          {venta.local && (
            <div>
              <p className="font-semibold text-lg">{venta.local.nombre}</p>
              {venta.local.direccion && (
                <p className="text-sm text-gray-600">{venta.local.direccion}</p>
              )}
              {venta.local.telefono && (
                <p className="text-sm text-gray-600">Tel: {venta.local.telefono}</p>
              )}
            </div>
          )}
        </div>

        {/* Información de la venta */}
        <div className="mb-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Fecha:</span>
            <span className="font-semibold">
              {format(new Date(venta.fecha), 'dd/MM/yyyy HH:mm')}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Ticket #:</span>
            <span className="font-semibold font-mono">{venta.id.substring(0, 8).toUpperCase()}</span>
          </div>
          {venta.vendedor && (
            <div className="flex justify-between">
              <span className="text-gray-600">Vendedor:</span>
              <span className="font-semibold">{venta.vendedor.nombre}</span>
            </div>
          )}
          {venta.cliente && (
            <div className="flex justify-between">
              <span className="text-gray-600">Cliente:</span>
              <span className="font-semibold">{venta.cliente.nombre}</span>
            </div>
          )}
        </div>

        {/* Línea separadora */}
        <div className="border-t-2 border-dashed border-gray-400 my-4"></div>

        {/* Productos */}
        <div className="mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="text-left py-2">Cant.</th>
                <th className="text-left py-2">Producto</th>
                <th className="text-right py-2">Precio</th>
                <th className="text-right py-2">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {venta.detalles?.map((detalle) => (
                <tr key={detalle.id} className="border-b border-gray-200">
                  <td className="py-2">{detalle.cantidad}</td>
                  <td className="py-2">
                    <div>
                      <p className="font-semibold">{detalle.producto?.nombre || 'Producto'}</p>
                      {detalle.producto?.codigo_barras && (
                        <p className="text-xs text-gray-500">{detalle.producto.codigo_barras}</p>
                      )}
                    </div>
                  </td>
                  <td className="text-right py-2">${Number(detalle.precio_unitario).toFixed(2)}</td>
                  <td className="text-right py-2 font-semibold">
                    ${Number(detalle.subtotal).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Línea separadora */}
        <div className="border-t-2 border-dashed border-gray-400 my-4"></div>

        {/* Totales */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-lg">
            <span className="font-semibold">Subtotal:</span>
            <span className="font-semibold">${Number(venta.total).toFixed(2)}</span>
          </div>

          {venta.creditoUsado && venta.creditoUsado > 0 && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Crédito usado:</span>
                <span className="text-gray-600">-${Number(venta.creditoUsado).toFixed(2)}</span>
              </div>
              {venta.cliente && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Saldo restante:</span>
                  <span className="font-semibold text-blue-600">
                    ${Number(venta.cliente.credito || 0).toFixed(2)}
                  </span>
                </div>
              )}
            </>
          )}

          {venta.metodoPago === 'EFECTIVO' || venta.metodoPago === 'MIXTO' ? (
            <>
              {venta.efectivoRecibido && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Efectivo recibido:</span>
                  <span className="text-gray-600">${Number(venta.efectivoRecibido).toFixed(2)}</span>
                </div>
              )}
              {calcularCambio() > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Cambio:</span>
                  <span className="text-gray-600">${calcularCambio().toFixed(2)}</span>
                </div>
              )}
            </>
          ) : null}

          <div className="flex justify-between text-2xl font-bold border-t-2 border-gray-400 pt-2">
            <span>TOTAL:</span>
            <span>${Number(venta.total).toFixed(2)}</span>
          </div>
        </div>

        {/* Método de pago */}
        <div className="mb-4 text-center">
          <p className="text-sm text-gray-600">
            Método de pago: <span className="font-semibold">{venta.metodoPago || 'EFECTIVO'}</span>
          </p>
        </div>

        {/* Pie de página */}
        <div className="text-center text-xs text-gray-500 border-t border-gray-300 pt-4 mt-4">
          <p>¡Gracias por su compra!</p>
          <p className="mt-2">Este ticket es válido como comprobante</p>
        </div>
      </div>

      {/* Estilos para impresión */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            margin: 0;
            padding: 0;
          }
          @page {
            size: 80mm auto;
            margin: 0;
          }
        }
      `}</style>
    </>
  );
};

export default Ticket;

