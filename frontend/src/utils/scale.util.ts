/**
 * Utilidades para leer datos de balanzas
 * Soporta balanzas que se conectan como dispositivos HID o serial
 */

export interface ScaleReading {
  weight: number;
  unit: 'kg' | 'g' | 'lb' | 'oz';
  stable: boolean;
  timestamp: number;
}

// Detectar si hay una balanza conectada
export async function detectScale(): Promise<boolean> {
  try {
    // Intentar acceder a dispositivos HID (requiere permisos del navegador)
    if ('hid' in navigator) {
      const devices = await (navigator as any).hid.getDevices();
      return devices.some((device: any) => 
        device.vendorId && 
        (device.productName?.toLowerCase().includes('scale') || 
         device.productName?.toLowerCase().includes('balanza') ||
         device.productName?.toLowerCase().includes('weight'))
      );
    }
    return false;
  } catch (error) {
    console.error('Error al detectar balanza:', error);
    return false;
  }
}

// Leer peso desde una balanza HID
export async function readFromScale(): Promise<ScaleReading | null> {
  try {
    if ('hid' in navigator) {
      const devices = await (navigator as any).hid.getDevices();
      const scaleDevice = devices.find((device: any) => 
        device.vendorId && 
        (device.productName?.toLowerCase().includes('scale') || 
         device.productName?.toLowerCase().includes('balanza'))
      );

      if (scaleDevice) {
        await scaleDevice.open();
        // Leer datos de la balanza (formato depende del modelo)
        // Por ahora retornamos null, se implementará según el modelo específico
        return null;
      }
    }
    return null;
  } catch (error) {
    console.error('Error al leer balanza:', error);
    return null;
  }
}

// Función para parsear peso desde texto (para balanzas que envían como teclado)
export function parseWeightFromText(text: string): number | null {
  // Buscar patrones comunes de peso: "1.234 kg", "1234 g", "1.234", etc.
  const patterns = [
    /(\d+\.?\d*)\s*(kg|kilogramo)/i,
    /(\d+\.?\d*)\s*(g|gramo)/i,
    /(\d+\.?\d*)\s*(lb|libra)/i,
    /^(\d+\.?\d*)$/, // Solo número
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const weight = parseFloat(match[1]);
      if (!isNaN(weight) && weight > 0) {
        return weight;
      }
    }
  }

  return null;
}

