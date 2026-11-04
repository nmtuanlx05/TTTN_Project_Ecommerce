/**
 * Số lượng tối đa của MỘT dòng trong giỏ. Backend là nguồn sự thật (`MAX_QUANTITY_PER_ITEM` = 10 ở `src/cart/`, docs/api/cart.md);
 * hằng số này chỉ để giao diện chặn sớm ở ô số lượng (trang chi tiết, hộp thoại thêm nhanh), người dùng không gõ quá. Trong giỏ,
 * giới hạn từng dòng lấy từ `maxQuantity` của API (đã tính cả tồn kho).
 */
export const MAX_QUANTITY_PER_ITEM = 10
