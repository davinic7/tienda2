-- Script para migrar el enum Role de ALMACEN a DEPOSITO
-- Este script debe ejecutarse antes de prisma db push

-- Paso 1: Actualizar todos los usuarios con rol ALMACEN a DEPOSITO
UPDATE "User" 
SET role = 'DEPOSITO'::text::"Role"
WHERE role::text = 'ALMACEN';

-- Paso 2: Agregar DEPOSITO al enum si no existe
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

-- Paso 3: Recrear el enum sin ALMACEN (solo si no hay usuarios con ALMACEN)
DO $$ 
DECLARE
  almacen_count INTEGER;
BEGIN
  -- Verificar si hay usuarios con ALMACEN
  SELECT COUNT(*) INTO almacen_count 
  FROM "User" 
  WHERE role::text = 'ALMACEN';
  
  -- Solo recrear si no hay usuarios con ALMACEN
  IF almacen_count = 0 THEN
    -- Renombrar el enum actual
    ALTER TYPE "Role" RENAME TO "Role_old";
    
    -- Crear el nuevo enum
    CREATE TYPE "Role" AS ENUM ('ADMIN', 'VENDEDOR', 'DEPOSITO');
    
    -- Actualizar la columna
    ALTER TABLE "User" ALTER COLUMN role TYPE "Role" USING role::text::"Role";
    
    -- Eliminar el enum viejo
    DROP TYPE "Role_old";
  END IF;
END $$;

