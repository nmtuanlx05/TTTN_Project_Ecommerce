import type { StockStatus } from "./types"

/** Tồn khả dụng luôn là `stock - reserved`, không dùng riêng `stock`. */
export function availableOf(stock: number, reserved: number): number {
  return stock - reserved
}

/**
 * Trạng thái tồn theo cùng công thức backend (docs/api/inventory.md). Chỉ dùng để xem trước phía
 * client (vd. ngưỡng mới); số liệu thật luôn lấy từ `stockStatus` server trả về.
 */
export function stockStatusOf(available: number, minStock: number): StockStatus {
  if (available <= 0) return "out"
  if (available <= minStock) return "low"
  return "in_stock"
}
