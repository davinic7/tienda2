import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'admin@test.com' }
    });

    if (user) {
      console.log('✅ Usuario encontrado:');
      console.log('Email:', user.email);
      console.log('Nombre:', user.nombre);
      console.log('Role:', user.role);
      console.log('Activo:', user.activo);
    } else {
      console.log('❌ Usuario no encontrado');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

