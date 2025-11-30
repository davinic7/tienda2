/**
 * Script para crear un usuario ADMIN inicial
 * 
 * Uso:
 * tsx scripts/create-admin.ts
 * 
 * O compilar y ejecutar:
 * npx tsx scripts/create-admin.ts
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

async function main() {
  try {
    console.log('=== Crear Usuario ADMIN ===\n');

    const email = await question('Email: ');
    if (!email) {
      console.error('El email es requerido');
      process.exit(1);
    }

    const nombre = await question('Nombre: ');
    if (!nombre) {
      console.error('El nombre es requerido');
      process.exit(1);
    }

    const password = await question('Contraseña (mínimo 6 caracteres): ');
    if (!password || password.length < 6) {
      console.error('La contraseña debe tener al menos 6 caracteres');
      process.exit(1);
    }

    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.error('Ya existe un usuario con este email');
      process.exit(1);
    }

    // Crear usuario admin
    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        nombre,
        password: hashedPassword,
        role: 'ADMIN',
        localId: null, // Los admins no tienen local asignado
      },
    });

    console.log('\n✅ Usuario ADMIN creado exitosamente!');
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Nombre: ${user.nombre}`);
    console.log(`Role: ${user.role}`);
  } catch (error) {
    console.error('Error al crear usuario:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

main();

