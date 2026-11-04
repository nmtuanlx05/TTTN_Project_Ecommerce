-- AlterTable
ALTER TABLE `product_variants` ADD COLUMN `colorHex` VARCHAR(7) NULL;

-- CreateTable
CREATE TABLE `product_images` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productId` INTEGER NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `sortOrder` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `product_images_productId_sortOrder_idx`(`productId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `product_images` ADD CONSTRAINT `product_images_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddCheck: product_variants, product_images (thêm tay, theo docs/06)
-- REGEXP_LIKE với cờ 'c' = phân biệt hoa thường (collation _ci mặc định sẽ nhận cả chữ thường).
ALTER TABLE `product_variants`
    ADD CONSTRAINT `chk_product_variants_color_hex` CHECK (`colorHex` IS NULL OR REGEXP_LIKE(`colorHex`, '^#[0-9A-F]{6}$', 'c'));

ALTER TABLE `product_images`
    ADD CONSTRAINT `chk_product_images_sort_order` CHECK (`sortOrder` >= 0);

-- Dữ liệu 1: chuyển imageUrl cũ thành ảnh đầu tiên (chỉ sản phẩm chưa có dòng ảnh nào; chạy lại không nhân đôi)
INSERT INTO `product_images` (`productId`, `url`, `sortOrder`)
SELECT p.`id`, p.`imageUrl`, 0
FROM `products` p
WHERE p.`imageUrl` IS NOT NULL
  AND TRIM(p.`imageUrl`) <> ''
  AND NOT EXISTS (SELECT 1 FROM `product_images` i WHERE i.`productId` = p.`id`);

-- Dữ liệu 2: backfill colorHex từ bảng tra tên màu -> hex (không dùng bảng tạm).
-- So khớp theo collation utf8mb4_unicode_ci của cột (không phân biệt hoa thường), đã TRIM và gộp khoảng trắng thừa.
-- Tên màu lạ -> NULL (CASE không có nhánh khớp). Chỉ ghi vào biến thể chưa có hex.
-- LƯU Ý: bảng tra này lặp lại COLOR_HEX_MAP ở src/products/color-hex.ts; unit test đối chiếu hai nơi.
UPDATE `product_variants`
SET `colorHex` = CASE REGEXP_REPLACE(TRIM(`color`), '[[:space:]]+', ' ') COLLATE utf8mb4_unicode_ci
    WHEN 'Trắng' THEN '#FFFFFF'
    WHEN 'Đen' THEN '#111111'
    WHEN 'Xám' THEN '#9A9A9A'
    WHEN 'Xanh navy' THEN '#2C3E5C'
    WHEN 'Xanh' THEN '#4F7CAC'
    WHEN 'Hồng' THEN '#E2B4BD'
    WHEN 'Be' THEN '#C9B79C'
    WHEN 'Xanh rêu' THEN '#6B7A4F'
    WHEN 'Xanh đậm' THEN '#1F3A5F'
    WHEN 'Xanh nhạt' THEN '#A9C1D9'
    ELSE NULL
END
WHERE `colorHex` IS NULL;
