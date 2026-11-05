-- Bỏ trạng thái PACKING khỏi OrderStatus (luồng mới: PENDING -> CONFIRMED -> SHIPPING -> COMPLETED).
-- Chỉ đổi định nghĩa ENUM của 3 cột; không thêm/xóa cột, không đổi default. MySQL sẽ dựng lại bảng vì bỏ giá trị nằm giữa enum.
-- TRƯỚC KHI áp ở môi trường nào, phải đếm = 0 (nếu còn dòng PACKING thì ALTER lỗi 1265 và không đổi gì):
--   SELECT (SELECT COUNT(*) FROM orders WHERE status = 'PACKING') AS orders_packing,
--          (SELECT COUNT(*) FROM order_status_histories WHERE fromStatus = 'PACKING' OR toStatus = 'PACKING') AS history_packing;
-- AlterTable
ALTER TABLE `order_status_histories` MODIFY `fromStatus` ENUM('PENDING', 'CONFIRMED', 'SHIPPING', 'COMPLETED', 'CANCELLED', 'RETURNED', 'PENDING_PAYMENT') NULL,
    MODIFY `toStatus` ENUM('PENDING', 'CONFIRMED', 'SHIPPING', 'COMPLETED', 'CANCELLED', 'RETURNED', 'PENDING_PAYMENT') NOT NULL;

-- AlterTable
ALTER TABLE `orders` MODIFY `status` ENUM('PENDING', 'CONFIRMED', 'SHIPPING', 'COMPLETED', 'CANCELLED', 'RETURNED', 'PENDING_PAYMENT') NOT NULL DEFAULT 'PENDING';


