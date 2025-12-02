-- Agregar el nuevo campo depositoId
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "depositoId" TEXT;

-- Crear índice para depositoId
CREATE INDEX IF NOT EXISTS "User_depositoId_idx" ON "User"("depositoId");

-- Agregar foreign key (solo si no existe)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'User_depositoId_fkey'
    ) THEN
        ALTER TABLE "User" ADD CONSTRAINT "User_depositoId_fkey" 
        FOREIGN KEY ("depositoId") REFERENCES "Deposito"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

