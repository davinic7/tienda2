-- AlterTable
ALTER TABLE `Cliente` ADD COLUMN `dni` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Cliente_dni_key` ON `Cliente`(`dni`);

-- CreateIndex
CREATE INDEX `Cliente_dni_idx` ON `Cliente`(`dni`);

-- CreateIndex
CREATE INDEX `Cliente_nombre_idx` ON `Cliente`(`nombre`);

