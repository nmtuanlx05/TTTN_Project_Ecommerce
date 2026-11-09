-- DropForeignKey
ALTER TABLE `payment_transactions` DROP FOREIGN KEY `payment_transactions_orderId_fkey`;

-- AlterTable
ALTER TABLE `payment_transactions` ADD COLUMN `content` VARCHAR(500) NULL,
    ADD COLUMN `resolutionNote` VARCHAR(500) NULL,
    ADD COLUMN `resolvedAt` DATETIME(3) NULL,
    ADD COLUMN `resolvedById` INTEGER NULL,
    ADD COLUMN `reviewReason` ENUM('UNMATCHED', 'UNDERPAID', 'OVERPAID', 'ORDER_CLOSED', 'DUPLICATE_PAID') NULL,
    MODIFY `orderId` INTEGER NULL,
    MODIFY `status` ENUM('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED', 'NEEDS_REVIEW') NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX `payment_transactions_reviewReason_resolvedAt_idx` ON `payment_transactions`(`reviewReason`, `resolvedAt`);

-- AddForeignKey
ALTER TABLE `payment_transactions` ADD CONSTRAINT `payment_transactions_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `payment_transactions` ADD CONSTRAINT `payment_transactions_resolvedById_fkey` FOREIGN KEY (`resolvedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddCheck: payment_transactions
-- Giao dịch đã xác nhận (SUCCESS) phải gắn với một đơn. orderId không còn SET NULL/CASCADE ở FK (đã đặt RESTRICT) nên được phép nằm trong CHECK.
ALTER TABLE `payment_transactions`
    ADD CONSTRAINT `chk_payment_transactions_success_order` CHECK (`status` <> 'SUCCESS' OR `orderId` IS NOT NULL);
