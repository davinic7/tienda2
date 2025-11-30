-- AlterTable
ALTER TABLE `cliente` ADD COLUMN `credito` DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `venta` ADD COLUMN `creditoUsado` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `efectivoRecibido` DECIMAL(10, 2) NULL,
    ADD COLUMN `metodoPago` ENUM('EFECTIVO', 'CREDITO', 'MIXTO') NOT NULL DEFAULT 'EFECTIVO';

-- CreateIndex
CREATE INDEX `Venta_metodoPago_idx` ON `Venta`(`metodoPago`);
