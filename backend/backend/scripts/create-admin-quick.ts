import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/bcrypt.util';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('=== Crear Usuario ADMIN ===\n');

    const email = 'admin@test.com';
    const nombre = 'Administrador';
    const password = 'admin123';

    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log('⚠️  Ya existe un usuario con este email:', email);
      console.log('Puedes usar ese usuario o crear uno diferente con el script interactivo.');
      return;
    }

    // Crear usuario admin
    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        nombre,
        password: hashedPassword,
        role: 'ADMIN',
        localId: null,
      },
    });

    console.log('\n✅ Usuario ADMIN creado exitosamente!');
    console.log(`📧 Email: ${user.email}`);
    console.log(`👤 Nombre: ${user.nombre}`);
    console.log(`🔑 Contraseña: ${password}`);
    console.log(`🔐 Role: ${user.role}`);
    console.log(`\n💡 Puedes iniciar sesión con estas credenciales`);
  } catch (error) {
    console.error('❌ Error al crear usuario:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

