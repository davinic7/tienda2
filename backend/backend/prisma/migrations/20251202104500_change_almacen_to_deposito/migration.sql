-- Migración para cambiar ALMACEN a DEPOSITO en el enum Role
-- Paso 1: Actualizar todos los usuarios con role='ALMACEN' a 'DEPOSITO'
UPDATE "User" SET "role" = 'DEPOSITO' WHERE "role" = 'ALMACEN';

-- Paso 2: Crear un nuevo tipo enum con DEPOSITO en lugar de ALMACEN
CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'VENDEDOR', 'DEPOSITO');

-- Paso 3: Cambiar la columna al nuevo tipo
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING "role"::text::"Role_new";

-- Paso 4: Eliminar el tipo viejo
DROP TYPE "Role";

-- Paso 5: Renombrar el nuevo tipo
ALTER TYPE "Role_new" RENAME TO "Role";

