-- Collation utf8mb4_bin (sửa tay): publicId của Cloudinary phân biệt hoa/thường; Prisma không biểu diễn được collation nên
-- `migrate diff` không coi đây là drift.

-- AlterTable
ALTER TABLE `order_items` ADD COLUMN `imagePublicId` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL;

-- AlterTable
ALTER TABLE `product_images` ADD COLUMN `assetId` INTEGER NULL;

-- AlterTable
ALTER TABLE `products` MODIFY `imageUrl` VARCHAR(500) NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `avatarAssetId` INTEGER NULL,
    MODIFY `avatarUrl` VARCHAR(500) NULL;

-- CreateTable
CREATE TABLE `media_assets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `publicId` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    `secureUrl` VARCHAR(500) NOT NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `format` VARCHAR(10) NULL,
    `bytes` INTEGER NULL,
    `kind` ENUM('PRODUCT', 'AVATAR') NOT NULL,
    `status` ENUM('ACTIVE', 'PENDING_DELETE', 'DELETED') NOT NULL DEFAULT 'ACTIVE',
    `uploadedById` INTEGER NULL,
    `sourceUrl` VARCHAR(500) NULL,
    `deleteAttempts` INTEGER NOT NULL DEFAULT 0,
    `lastError` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `media_assets_publicId_key`(`publicId`),
    INDEX `media_assets_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `media_assets_uploadedById_createdAt_idx`(`uploadedById`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `order_items_imagePublicId_idx` ON `order_items`(`imagePublicId`);

-- CreateIndex
CREATE INDEX `product_images_assetId_idx` ON `product_images`(`assetId`);

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_avatarAssetId_fkey` FOREIGN KEY (`avatarAssetId`) REFERENCES `media_assets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_images` ADD CONSTRAINT `product_images_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `media_assets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `media_assets` ADD CONSTRAINT `media_assets_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
