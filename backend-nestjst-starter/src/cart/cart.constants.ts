// Số lượng tối đa của MỘT dòng giỏ (một biến thể). Chỉ kiểm ở ứng dụng, DB chỉ có CHECK quantity > 0.
export const MAX_QUANTITY_PER_ITEM = 10;

// Số lần chạy lại transaction khi MySQL báo deadlock/write conflict (P2034)
export const MAX_TX_RETRIES = 3;
