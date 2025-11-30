/**
 * Utilidades para impresión de tickets
 * Soporta impresoras térmicas de 58mm y 80mm
 */

export interface TicketConfig {
  width?: 58 | 80; // Ancho en mm
  fontSize?: 'small' | 'medium' | 'large';
  showLogo?: boolean;
  showQR?: boolean;
}

export function printTicket(
  content: {
    header?: string;
    items: Array<{
      nombre: string;
      cantidad: number;
      precio: number;
      subtotal: number;
    }>;
    subtotal?: number;
    descuento?: number;
    total: number;
    metodoPago: string;
    cambio?: number;
    fecha: string;
    vendedor?: string;
    cliente?: string;
    local?: string;
  },
  config: TicketConfig = { width: 58 }
): void {
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) {
    alert('Por favor, permite ventanas emergentes para imprimir');
    return;
  }

  const width = config.width || 58;
  const fontSize = config.fontSize || 'small';
  const fontSizes = {
    small: '10px',
    medium: '12px',
    large: '14px',
  };

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Ticket de Venta</title>
      <style>
        @media print {
          @page {
            size: ${width}mm auto;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 8mm;
          }
        }
        body {
          font-family: 'Courier New', monospace;
          font-size: ${fontSizes[fontSize]};
          width: ${width}mm;
          margin: 0 auto;
          padding: 8mm;
          line-height: 1.4;
        }
        .header {
          text-align: center;
          border-bottom: 2px dashed #000;
          padding-bottom: 10px;
          margin-bottom: 10px;
        }
        .logo {
          max-width: 60px;
          height: auto;
          margin-bottom: 5px;
        }
        .item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
          padding-bottom: 5px;
          border-bottom: 1px dotted #ccc;
        }
        .item-name {
          flex: 1;
          margin-right: 10px;
        }
        .item-details {
          font-size: 0.9em;
          color: #666;
          margin-top: 2px;
        }
        .total {
          text-align: right;
          font-size: 1.2em;
          font-weight: bold;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 2px dashed #000;
        }
        .footer {
          text-align: center;
          margin-top: 15px;
          padding-top: 10px;
          border-top: 2px dashed #000;
          font-size: 0.9em;
        }
        .info {
          margin: 5px 0;
          font-size: 0.9em;
        }
        .divider {
          border-top: 1px dashed #000;
          margin: 10px 0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        ${content.header || '<h2>lolo DRUGSTORE</h2>'}
        ${content.local ? `<p>${content.local}</p>` : ''}
      </div>
      
      <div class="info">
        <p><strong>Fecha:</strong> ${content.fecha}</p>
        ${content.vendedor ? `<p><strong>Vendedor:</strong> ${content.vendedor}</p>` : ''}
        ${content.cliente ? `<p><strong>Cliente:</strong> ${content.cliente}</p>` : ''}
      </div>
      
      <div class="divider"></div>
      
      <div class="items">
        ${content.items.map(item => `
          <div class="item">
            <div class="item-name">
              <div><strong>${item.nombre}</strong></div>
              <div class="item-details">
                ${item.cantidad} x $${item.precio.toFixed(2)}
              </div>
            </div>
            <div>$${item.subtotal.toFixed(2)}</div>
          </div>
        `).join('')}
      </div>
      
      <div class="divider"></div>
      
      ${content.subtotal ? `
        <div class="info" style="text-align: right;">
          <p>Subtotal: $${content.subtotal.toFixed(2)}</p>
        </div>
      ` : ''}
      
      ${content.descuento ? `
        <div class="info" style="text-align: right;">
          <p>Descuento: -$${content.descuento.toFixed(2)}</p>
        </div>
      ` : ''}
      
      <div class="total">
        TOTAL: $${content.total.toFixed(2)}
      </div>
      
      <div class="info">
        <p><strong>Método de Pago:</strong> ${content.metodoPago.replace(/_/g, ' ')}</p>
        ${content.cambio ? `<p><strong>Cambio:</strong> $${content.cambio.toFixed(2)}</p>` : ''}
      </div>
      
      <div class="footer">
        <p>¡Gracias por su compra!</p>
        <p>Vuelva pronto</p>
      </div>
      
      <script>
        window.onload = function() {
          window.print();
          setTimeout(function() {
            window.close();
          }, 1000);
        };
      </script>
    </body>
    </html>
  `);

  printWindow.document.close();
}

// Función para imprimir usando ESC/POS (impresoras térmicas)
export function printESCPOS(
  content: {
    items: Array<{ nombre: string; cantidad: number; precio: number; subtotal: number }>;
    total: number;
    metodoPago: string;
    fecha: string;
  },
  printer?: any
): void {
  // Si hay una impresora ESC/POS conectada, usar comandos nativos
  // Por ahora, usar la función de impresión estándar
  printTicket(content);
}

