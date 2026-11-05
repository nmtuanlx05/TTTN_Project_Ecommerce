// Số sản phẩm tối đa trong wishlist của một khách. Chỉ kiểm ở ứng dụng (khóa dòng users khi thêm).
// Cũng là trần số id mà GET /wishlist/ids có thể trả.
export const WISHLIST_MAX_ITEMS = 100;

// Số lần chạy lại transaction khi MySQL báo deadlock/write conflict (P2034)
export const WISHLIST_MAX_TX_RETRIES = 3;
