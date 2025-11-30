/**
 * Script para importar datos de la base de datos FASTFOODSTORE (SQL Server)
 * al sistema POS actual (MySQL/Prisma)
 * 
 * Este script adapta los datos del formato SQL Server al esquema actual.
 * 
 * Uso:
 * tsx scripts/import-fastfood-data.ts
 */

import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/bcrypt.util';
import * as readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

// Datos de ejemplo basados en el SQL Server
const categorias = [
  'Comida Rápida',
  'Bebidas',
  'Postres',
  'Comida Internacional',
  'Ensaladas',
  'Platos Principales',
  'Comida Mexicana',
  'Mariscos',
  'Cocina Tradicional',
  'Panadería'
];

const productos = [
  { nombre: 'Hamburguesa', descripcion: 'Deliciosa hamburguesa con carne, lechuga, tomate y queso', precio: 150, categoria: 'Comida Rápida', codigo_barras: '1000000000001' },
  { nombre: 'Pizza', descripcion: 'Pizza recién horneada con los ingredientes de tu elección', precio: 200, categoria: 'Comida Rápida', codigo_barras: '1000000000002' },
  { nombre: 'Hot Dog', descripcion: 'Hot dog clásico con salchicha, pan y tus aderezos favoritos', precio: 100, categoria: 'Comida Rápida', codigo_barras: '1000000000003' },
  { nombre: 'Papas Fritas', descripcion: 'Papas fritas crujientes y doradas, perfectas como acompañamiento', precio: 50, categoria: 'Comida Rápida', codigo_barras: '1000000000004' },
  { nombre: 'Refresco', descripcion: 'Bebida refrescante de tu sabor favorito', precio: 50, categoria: 'Bebidas', codigo_barras: '1000000000005' },
  { nombre: 'Pollo Frito', descripcion: 'Trozos de pollo crujientes y sabrosos', precio: 180, categoria: 'Platos Principales', codigo_barras: '1000000000006' },
  { nombre: 'Ensalada César', descripcion: 'Ensalada fresca con lechuga, crutones, pollo y aderezo César', precio: 120, categoria: 'Ensaladas', codigo_barras: '1000000000007' },
  { nombre: 'Tacos', descripcion: 'Tacos mexicanos con carne, guacamole, salsa y cilantro', precio: 160, categoria: 'Comida Mexicana', codigo_barras: '1000000000008' },
  { nombre: 'Sushi Roll', descripcion: 'Rollos de sushi variados con pescado fresco y arroz', precio: 250, categoria: 'Comida Internacional', codigo_barras: '1000000000009' },
  { nombre: 'Alitas de Pollo', descripcion: 'Alitas de pollo picantes o a la barbacoa', precio: 130, categoria: 'Comida Rápida', codigo_barras: '1000000000010' },
  { nombre: 'Pasta Alfredo', descripcion: 'Pasta con salsa Alfredo cremosa y queso parmesano', precio: 170, categoria: 'Platos Principales', codigo_barras: '1000000000011' },
  { nombre: 'Empanadas', descripcion: 'Empanadas rellenas de carne, pollo o queso', precio: 90, categoria: 'Panadería', codigo_barras: '1000000000012' },
  { nombre: 'Burrito', descripcion: 'Burrito mexicano con carne, frijoles, arroz y salsa', precio: 140, categoria: 'Comida Mexicana', codigo_barras: '1000000000013' },
  { nombre: 'Sándwich Club', descripcion: 'Sándwich con pollo, tocino, lechuga, tomate y mayonesa', precio: 110, categoria: 'Comida Rápida', codigo_barras: '1000000000014' },
  { nombre: 'Arroz con Pollo', descripcion: 'Plato tradicional de arroz con pollo y vegetales', precio: 160, categoria: 'Cocina Tradicional', codigo_barras: '1000000000015' },
  { nombre: 'Ceviche', descripcion: 'Ceviche de pescado fresco marinado con limón y especias', precio: 200, categoria: 'Mariscos', codigo_barras: '1000000000016' },
  { nombre: 'Churrasco', descripcion: 'Churrasco argentino con carne asada y chimichurri', precio: 220, categoria: 'Comida Internacional', codigo_barras: '1000000000017' },
  { nombre: 'Sopa de Tortilla', descripcion: 'Sopa mexicana de tortilla con pollo, aguacate y queso', precio: 120, categoria: 'Comida Mexicana', codigo_barras: '1000000000018' },
  { nombre: 'Pastel de Chocolate', descripcion: 'Delicioso pastel de chocolate con cobertura de ganache', precio: 180, categoria: 'Postres', codigo_barras: '1000000000019' },
  { nombre: 'Gelatina', descripcion: 'Gelatina de frutas frescas con crema batida', precio: 80, categoria: 'Postres', codigo_barras: '1000000000020' },
];

const ubicaciones = [
  { ciudad: 'Madrid', pais: 'España' },
  { ciudad: 'Barcelona', pais: 'España' },
  { ciudad: 'Lima', pais: 'Perú' },
  { ciudad: 'Buenos Aires', pais: 'Argentina' },
  { ciudad: 'Santiago', pais: 'Chile' },
  { ciudad: 'Bogotá', pais: 'Colombia' },
  { ciudad: 'Ciudad de México', pais: 'México' },
  { ciudad: 'San José', pais: 'Costa Rica' },
  { ciudad: 'Montevideo', pais: 'Uruguay' },
  { ciudad: 'Quito', pais: 'Ecuador' },
];

const vendedores = [
  { nombre: 'Juan Perez', email: 'juan.perez@example.com', ubicacion: 'Madrid' },
  { nombre: 'Maria Vizcaino', email: 'maria.vizcaino@example.com', ubicacion: 'Barcelona' },
  { nombre: 'Ana Santana', email: 'ana.santana@example.com', ubicacion: 'Lima' },
  { nombre: 'Luis Diaz', email: 'luis.diaz@example.com', ubicacion: 'Buenos Aires' },
  { nombre: 'Sofia Bergara', email: 'sofia.bergara@example.com', ubicacion: 'Santiago' },
];

const clientes = [
  { nombre: 'Pedro Sánchez', email: 'pedro.sanchez@example.com', ubicacion: 'Madrid' },
  { nombre: 'Laura Martínez', email: 'laura.martinez@example.com', ubicacion: 'Barcelona' },
  { nombre: 'Jorge Ramírez', email: 'jorge.ramirez@example.com', ubicacion: 'Lima' },
  { nombre: 'Sofía Díaz', email: 'sofia.diaz@example.com', ubicacion: 'Buenos Aires' },
  { nombre: 'Fernando Ruiz', email: 'fernando.ruiz@example.com', ubicacion: 'Santiago' },
  { nombre: 'Ana Belén Álvarez', email: 'ana.belen.alvarez@example.com', ubicacion: 'Madrid' },
  { nombre: 'Mario Castillo', email: 'mario.castillo@example.com', ubicacion: 'Barcelona' },
  { nombre: 'Sandra López', email: 'sandra.lopez@example.com', ubicacion: 'Lima' },
  { nombre: 'Antonio Fernández', email: 'antonio.fernandez@example.com', ubicacion: 'Buenos Aires' },
  { nombre: 'Natalia González', email: 'natalia.gonzalez@example.com', ubicacion: 'Santiago' },
];

async function main() {
  try {
    console.log('=== Importar Datos de FASTFOODSTORE ===\n');
    console.log('Este script importará:');
    console.log('- Categorías y Productos');
    console.log('- Locales (Ubicaciones)');
    console.log('- Vendedores (como usuarios VENDEDOR)');
    console.log('- Clientes');
    console.log('- Stock inicial para todos los productos en todos los locales\n');

    const confirm = await question('¿Deseas continuar? (s/n): ');
    if (confirm.toLowerCase() !== 's') {
      console.log('Importación cancelada.');
      process.exit(0);
    }

    // 1. Crear locales (ubicaciones)
    console.log('\n📦 Creando locales...');
    const localesMap = new Map<string, string>();
    
    for (const ubicacion of ubicaciones) {
      const nombreLocal = `${ubicacion.ciudad} - ${ubicacion.pais}`;
      let local = await prisma.local.findFirst({
        where: { nombre: nombreLocal },
      });
      
      if (!local) {
        local = await prisma.local.create({
          data: {
            nombre: nombreLocal,
            direccion: `${ubicacion.ciudad}, ${ubicacion.pais}`,
            telefono: null,
            activo: true,
          },
        });
        console.log(`  ✓ Local creado: ${local.nombre}`);
      } else {
        console.log(`  → Local ya existe: ${local.nombre}`);
      }
      localesMap.set(ubicacion.ciudad, local.id);
    }

    // 2. Crear productos
    console.log('\n🍔 Creando productos...');
    const productosMap = new Map<string, string>();
    
    for (const productoData of productos) {
      const producto = await prisma.producto.upsert({
        where: { codigo_barras: productoData.codigo_barras },
        update: {
          nombre: productoData.nombre,
          descripcion: productoData.descripcion,
          precio: productoData.precio,
          categoria: productoData.categoria,
        },
        create: {
          nombre: productoData.nombre,
          descripcion: productoData.descripcion,
          precio: productoData.precio,
          categoria: productoData.categoria,
          codigo_barras: productoData.codigo_barras,
          activo: true,
        },
      });
      productosMap.set(productoData.nombre, producto.id);
      console.log(`  ✓ Producto creado: ${producto.nombre}`);
    }

    // 3. Crear stock inicial para todos los productos en todos los locales
    console.log('\n📊 Creando stock inicial...');
    let stockCount = 0;
    for (const [productoNombre, productoId] of productosMap) {
      for (const [ciudad, localId] of localesMap) {
        await prisma.stock.upsert({
          where: {
            productoId_localId: {
              productoId,
              localId,
            },
          },
          update: {
            cantidad: { increment: 100 }, // Incrementar si ya existe
          },
          create: {
            productoId,
            localId,
            cantidad: 100, // Stock inicial de 100 unidades
            stock_minimo: 10,
          },
        });
        stockCount++;
      }
    }
    console.log(`  ✓ Stock creado para ${stockCount} productos/locales`);

    // 4. Crear vendedores (como usuarios VENDEDOR)
    console.log('\n👤 Creando vendedores...');
    const vendedoresMap = new Map<string, string>();
    const defaultPassword = await hashPassword('vendedor123');

    for (const vendedorData of vendedores) {
      const localId = localesMap.get(vendedorData.ubicacion);
      if (!localId) {
        console.log(`  ⚠ Local no encontrado para ${vendedorData.ubicacion}`);
        continue;
      }

      const vendedor = await prisma.user.upsert({
        where: { email: vendedorData.email },
        update: {
          nombre: vendedorData.nombre,
          localId,
          role: 'VENDEDOR',
        },
        create: {
          email: vendedorData.email,
          nombre: vendedorData.nombre,
          password: defaultPassword,
          role: 'VENDEDOR',
          localId,
          activo: true,
        },
      });
      vendedoresMap.set(vendedorData.nombre, vendedor.id);
      console.log(`  ✓ Vendedor creado: ${vendedor.nombre} (${vendedor.email}) - Password: vendedor123`);
    }

    // 5. Crear clientes
    console.log('\n👥 Creando clientes...');
    const clientesMap = new Map<string, string>();

    for (const clienteData of clientes) {
      const cliente = await prisma.cliente.upsert({
        where: { email: clienteData.email },
        update: {
          nombre: clienteData.nombre,
        },
        create: {
          nombre: clienteData.nombre,
          email: clienteData.email,
          telefono: null,
          puntos: 0,
          credito: 0,
        },
      });
      clientesMap.set(clienteData.nombre, cliente.id);
      console.log(`  ✓ Cliente creado: ${cliente.nombre}`);
    }

    console.log('\n✅ Importación completada exitosamente!');
    console.log('\n📋 Resumen:');
    console.log(`  - Locales: ${localesMap.size}`);
    console.log(`  - Productos: ${productosMap.size}`);
    console.log(`  - Stock: ${stockCount} registros`);
    console.log(`  - Vendedores: ${vendedoresMap.size}`);
    console.log(`  - Clientes: ${clientesMap.size}`);
    console.log('\n💡 Nota: Todos los vendedores tienen la contraseña: vendedor123');
    console.log('💡 Puedes cambiar las contraseñas desde la interfaz de administración.\n');
  } catch (error) {
    console.error('❌ Error al importar datos:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

main();

