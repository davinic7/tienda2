/**
 * Utilidades para detectar y manejar escáneres de código de barras
 * Los escáneres USB/HID funcionan como teclados, así que detectamos
 * cuando se ingresa un código rápidamente (sin pausas entre caracteres)
 */

let scannerBuffer = '';
let scannerTimeout: NodeJS.Timeout | null = null;
let lastKeyTime = 0;
const SCANNER_DELAY = 100; // ms entre caracteres para considerar que es un escáner
const MIN_BARCODE_LENGTH = 3; // Longitud mínima de código de barras

export function setupBarcodeScanner(
  onScan: (barcode: string) => void,
  options: {
    minLength?: number;
    maxLength?: number;
    delay?: number;
  } = {}
): () => void {
  const minLength = options.minLength || MIN_BARCODE_LENGTH;
  const maxLength = options.maxLength || 50;
  const delay = options.delay || SCANNER_DELAY;

  const handleKeyPress = (e: KeyboardEvent) => {
    // Ignorar teclas especiales
    if (e.key === 'Enter' || e.key === 'Tab' || e.key === 'Escape') {
      if (scannerBuffer.length >= minLength && scannerBuffer.length <= maxLength) {
        // Es un código de barras escaneado
        onScan(scannerBuffer);
        scannerBuffer = '';
        if (scannerTimeout) {
          clearTimeout(scannerTimeout);
          scannerTimeout = null;
        }
        e.preventDefault();
        return;
      }
      scannerBuffer = '';
      return;
    }

    // Ignorar si es una tecla especial
    if (e.key.length > 1) {
      return;
    }

    const now = Date.now();
    const timeSinceLastKey = now - lastKeyTime;

    // Si pasó mucho tiempo desde la última tecla, es escritura manual
    if (timeSinceLastKey > delay * 3) {
      scannerBuffer = '';
    }

    // Agregar carácter al buffer
    scannerBuffer += e.key;
    lastKeyTime = now;

    // Limpiar buffer después de un tiempo
    if (scannerTimeout) {
      clearTimeout(scannerTimeout);
    }

    scannerTimeout = setTimeout(() => {
      if (scannerBuffer.length < minLength) {
        scannerBuffer = '';
      }
    }, delay * 2);
  };

  window.addEventListener('keydown', handleKeyPress);

  // Retornar función de limpieza
  return () => {
    window.removeEventListener('keydown', handleKeyPress);
    if (scannerTimeout) {
      clearTimeout(scannerTimeout);
    }
    scannerBuffer = '';
  };
}

