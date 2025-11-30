-- AlterTable
ALTER TABLE `venta` ADD COLUMN `turnoId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `Turno` (
    `id` VARCHAR(191) NOT NULL,
    `vendedorId` VARCHAR(191) NOT NULL,
    `localId` VARCHAR(191) NOT NULL,
    `fecha_apertura` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_cierre` DATETIME(3) NULL,
    `efectivo_inicial` DECIMAL(10, 2) NOT NULL,
    `efectivo_final` DECIMAL(10, 2) NULL,
    `efectivo_esperado` DECIMAL(10, 2) NULL,
    `diferencia` DECIMAL(10, 2) NULL,
    `estado` ENUM('ABIERTO', 'CERRADO') NOT NULL DEFAULT 'ABIERTO',
    `observaciones` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Turno_vendedorId_idx`(`vendedorId`),
    INDEX `Turno_localId_idx`(`localId`),
    INDEX `Turno_fecha_apertura_idx`(`fecha_apertura`),
    INDEX `Turno_estado_idx`(`estado`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Venta_turnoId_idx` ON `Venta`(`turnoId`);

-- AddForeignKey
ALTER TABLE `Venta` ADD CONSTRAINT `Venta_turnoId_fkey` FOREIGN KEY (`turnoId`) REFERENCES `Turno`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Turno` ADD CONSTRAINT `Turno_vendedorId_fkey` FOREIGN KEY (`vendedorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Turno` ADD CONSTRAINT `Turno_localId_fkey` FOREIGN KEY (`localId`) REFERENCES `Local`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
