import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // Crear locales
  const local1 = await prisma.local.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      nombre: 'Local Central',
      direccion: 'Calle Principal 123',
      telefono: '+1234567890',
      activo: true,
    },
  });

  const local2 = await prisma.local.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      nombre: 'Sucursal Norte',
      direccion: 'Avenida Norte 456',
      telefono: '+1234567891',
      activo: true,
    },
  });

  console.log('✅ Locales creados');

  // Crear admin
  const adminPassword = await hashPassword('admin123');
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminPassword,
      nombre: 'Administrador',
      role: 'ADMIN',
      activo: true,
    },
  });

  console.log('✅ Usuario admin creado (username: admin, password: admin123)');

  // Crear vendedores
  const vendedor1Password = await hashPassword('vendedor123');
  const vendedor1 = await prisma.user.upsert({
    where: { username: 'vendedor1' },
    update: {},
    create: {
      username: 'vendedor1',
      password: vendedor1Password,
      nombre: 'Juan Vendedor',
      role: 'VENDEDOR',
      localId: local1.id,
      activo: true,
    },
  });

  const vendedor2Password = await hashPassword('vendedor123');
  const vendedor2 = await prisma.user.upsert({
    where: { username: 'vendedor2' },
    update: {},
    create: {
      username: 'vendedor2',
      password: vendedor2Password,
      nombre: 'María Vendedora',
      role: 'VENDEDOR',
      localId: local2.id,
      activo: true,
    },
  });

  console.log('✅ Usuarios vendedores creados (username: vendedor1/vendedor2, password: vendedor123)');

  // Crear productos de ejemplo
  const productos = [
    {
      nombre: 'Producto 1',
      descripcion: 'Descripción del producto 1',
      precio: 100.00,
      categoria: 'Categoría A',
      codigoBarras: '1234567890123',
    },
    {
      nombre: 'Producto 2',
      descripcion: 'Descripción del producto 2',
      precio: 200.00,
      categoria: 'Categoría B',
      codigoBarras: '1234567890124',
    },
    {
      nombre: 'Producto 3',
      descripcion: 'Descripción del producto 3',
      precio: 150.00,
      categoria: 'Categoría A',
      codigoBarras: '1234567890125',
    },
  ];

  for (const productoData of productos) {
    const producto = await prisma.producto.upsert({
      where: { codigoBarras: productoData.codigoBarras! },
      update: {},
      create: productoData,
    });

    // Crear stock para cada local
    await prisma.stock.upsert({
      where: {
        productoId_localId: {
          productoId: producto.id,
          localId: local1.id,
        },
      },
      update: {},
      create: {
        productoId: producto.id,
        localId: local1.id,
        cantidad: 100,
        stockMinimo: 10,
      },
    });

    await prisma.stock.upsert({
      where: {
        productoId_localId: {
          productoId: producto.id,
          localId: local2.id,
        },
      },
      update: {},
      create: {
        productoId: producto.id,
        localId: local2.id,
        cantidad: 50,
        stockMinimo: 10,
      },
    });
  }

  console.log('✅ Productos y stocks creados');

  console.log('🎉 Seed completado exitosamente!');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

