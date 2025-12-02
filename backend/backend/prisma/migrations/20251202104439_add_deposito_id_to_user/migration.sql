-- AlterTable
ALTER TABLE "User" ADD COLUMN "depositoId" TEXT;

-- CreateIndex
CREATE INDEX "User_depositoId_idx" ON "User"("depositoId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_depositoId_fkey" FOREIGN KEY ("depositoId") REFERENCES "Deposito"("id") ON DELETE SET NULL ON UPDATE CASCADE;

