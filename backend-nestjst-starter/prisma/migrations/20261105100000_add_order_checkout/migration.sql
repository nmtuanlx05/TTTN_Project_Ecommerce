-- Đặt đơn: địa chỉ 3 cấp, voucherCode, idempotencyKey, lịch sử trạng thái, giao dịch thanh toán, enum mới.
-- Chỉ thêm cột/bảng/giá trị cuối enum và nới độ dài cột; không xóa hay đổi dữ liệu có sẵn.
-- AlterTable
ALTER TABLE `order_items` ADD COLUMN `colorHex` VARCHAR(7) NULL,
    ADD COLUMN `imageUrl` VARCHAR(500) NULL;

-- AlterTable
ALTER TABLE `orders` ADD COLUMN `addressLine` VARCHAR(255) NULL,
    ADD COLUMN `districtCode` VARCHAR(10) NULL,
    ADD COLUMN `districtName` VARCHAR(191) NULL,
    ADD COLUMN `idempotencyKey` VARCHAR(64) NULL,
    ADD COLUMN `provinceCode` VARCHAR(10) NULL,
    ADD COLUMN `provinceName` VARCHAR(191) NULL,
    ADD COLUMN `voucherCode` VARCHAR(50) NULL,
    ADD COLUMN `wardCode` VARCHAR(10) NULL,
    ADD COLUMN `wardName` VARCHAR(191) NULL,
    MODIFY `shippingAddress` VARCHAR(500) NOT NULL,
    MODIFY `note` VARCHAR(500) NULL,
    MODIFY `paymentStatus` ENUM('UNPAID', 'PAID', 'REFUNDED', 'FAILED') NOT NULL DEFAULT 'UNPAID',
    MODIFY `status` ENUM('PENDING', 'CONFIRMED', 'PACKING', 'SHIPPING', 'COMPLETED', 'CANCELLED', 'RETURNED', 'PENDING_PAYMENT') NOT NULL DEFAULT 'PENDING',
    MODIFY `cancelReason` VARCHAR(500) NULL;

-- AlterTable
ALTER TABLE `stock_movements` MODIFY `type` ENUM('IMPORT', 'EXPORT', 'ADJUST', 'SALE') NOT NULL;

-- CreateTable
CREATE TABLE `order_status_histories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `fromStatus` ENUM('PENDING', 'CONFIRMED', 'PACKING', 'SHIPPING', 'COMPLETED', 'CANCELLED', 'RETURNED', 'PENDING_PAYMENT') NULL,
    `toStatus` ENUM('PENDING', 'CONFIRMED', 'PACKING', 'SHIPPING', 'COMPLETED', 'CANCELLED', 'RETURNED', 'PENDING_PAYMENT') NOT NULL,
    `actorId` INTEGER NULL,
    `reason` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `order_status_histories_orderId_createdAt_idx`(`orderId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `provider` VARCHAR(20) NOT NULL,
    `providerTxnId` VARCHAR(100) NULL,
    `amount` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    `rawData` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `payment_transactions_orderId_idx`(`orderId`),
    UNIQUE INDEX `payment_transactions_provider_providerTxnId_key`(`provider`, `providerTxnId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `orders_userId_createdAt_idx` ON `orders`(`userId`, `createdAt`);

-- CreateIndex
CREATE UNIQUE INDEX `orders_userId_idempotencyKey_key` ON `orders`(`userId`, `idempotencyKey`);

-- AddForeignKey
ALTER TABLE `order_status_histories` ADD CONSTRAINT `order_status_histories_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_status_histories` ADD CONSTRAINT `order_status_histories_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_transactions` ADD CONSTRAINT `payment_transactions_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;


-- AddCheck: payment_transactions
ALTER TABLE `payment_transactions`
    ADD CONSTRAINT `chk_payment_transactions_amount` CHECK (`amount` >= 0);
