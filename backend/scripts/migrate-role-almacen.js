#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateAlmacenToDeposito() {
  try {
    console.log('🔄 Migrando usuarios con rol ALMACEN a DEPOSITO...');
    
    // Paso 1: Actualizar usuarios con ALMACEN a DEPOSITO
    try {
      const result = await prisma.$executeRawUnsafe(`
        UPDATE "User" 
        SET role = 'DEPOSITO'::text::"Role"
        WHERE role::text = 'ALMACEN'
      `);
      console.log(`✅ ${result} usuario(s) actualizado(s) de ALMACEN a DEPOSITO`);
    } catch (error) {
      // Si falla porque el tipo no acepta DEPOSITO, continuar
      if (error.message.includes('invalid input value')) {
        console.log('⚠️  DEPOSITO no existe en el enum aún, se agregará con db push');
      } else {
        console.log(`⚠️  Advertencia al actualizar usuarios: ${error.message}`);
      }
    }
    
    // Paso 2: Intentar agregar DEPOSITO al enum si no existe
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'DEPOSITO' 
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Role')
          ) THEN
            ALTER TYPE "Role" ADD VALUE 'DEPOSITO';
          END IF;
        END $$;
      `);
      console.log('✅ DEPOSITO agregado al enum Role (si no existía)');
    } catch (error) {
      console.log(`⚠️  No se pudo agregar DEPOSITO al enum: ${error.message}`);
      // Continuar, db push lo manejará
    }
    
  } catch (error) {
    console.error('❌ Error al migrar roles:', error.message);
    // No fallar, continuar con db push
  } finally {
    await prisma.$disconnect();
  }
}

migrateAlmacenToDeposito();

