import type { ExportReason, InventorySortBy, StockStatus } from "./types"

/** Kho cần quét nhiều dòng nên 20 thay vì 10; luôn gửi `limit` tường minh. */
export const PAGE_SIZE = 20
export const MOVEMENTS_PAGE_SIZE = 20

/** Backend (GET /admin/inventory) chỉ cho sắp theo `name`, `stock` hoặc `available`. */
export const SORT_FIELDS: readonly InventorySortBy[] = ["name", "stock", "available"]

/** Mặc định của backend. Giá trị mặc định không ghi lên URL. */
export const DEFAULT_SORT = { sortBy: "name", order: "asc" } as const

export const STOCK_STATUSES: readonly StockStatus[] = ["in_stock", "low", "out"]

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  in_stock: "Còn hàng",
  low: "Sắp hết",
  out: "Hết hàng",
}

export const EXPORT_REASONS: readonly ExportReason[] = ["DAMAGED", "LOST", "OTHER"]

export const EXPORT_REASON_LABEL: Record<ExportReason, string> = {
  DAMAGED: "Hư hỏng",
  LOST: "Thất lạc/mất",
  OTHER: "Khác",
}

export const MOVEMENT_TYPE_LABEL: Record<string, string> = {
  IMPORT: "Nhập kho",
  EXPORT: "Xuất kho",
  ADJUST: "Điều chỉnh",
}

/** Giới hạn của backend (docs/api/inventory.md, DTO trong src/inventory/). */
export const MAX_STOCK = 2147483647
export const MAX_QUANTITY_PER_OPERATION = 100000
export const NOTE_MAX_LENGTH = 500
export const REASON_MAX_LENGTH = 191
export const SEARCH_MAX_LENGTH = 100

/** Cùng câu chữ với lỗi 400 của backend khi lý do là "Khác" mà thiếu ghi chú. */
export const OTHER_NOTE_REQUIRED_MESSAGE = 'Xuất kho với lý do "Khác" phải có ghi chú'

/** Mất mạng khi đổi tồn: request có thể đã tới server, nên không được tự thử lại. */
export const UNCERTAIN_RESULT_MESSAGE =
  "Chưa rõ thao tác đã được ghi hay chưa, hãy xem Lịch sử trước khi thử lại."
