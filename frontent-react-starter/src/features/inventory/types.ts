import type { SortOrder } from "@/types/api"

/** Trạng thái tồn theo `available` và `minStock` (docs/api/inventory.md, mục Khái niệm). */
export type StockStatus = "in_stock" | "low" | "out"

export type InventorySortBy = "name" | "stock" | "available"

/** Mã lý do xuất kho thủ công; `OTHER` bắt buộc có ghi chú. */
export type ExportReason = "DAMAGED" | "LOST" | "OTHER"

/** Một biến thể trong kho (GET /admin/inventory, và `variant` trong response các thao tác đổi tồn). */
export interface InventoryItem {
  id: number
  sku: string
  size: string
  color: string
  stock: number
  reserved: number
  minStock: number
  /** Cờ của chính biến thể (đang bán hay ngừng bán). */
  isActive: boolean
  product: {
    id: number
    name: string
    imageUrl: string | null
    isActive: boolean
    category: { id: number; name: string }
  }
  /** `stock - reserved`, backend tính sẵn. */
  available: number
  stockStatus: StockStatus
  /** `!isActive || !product.isActive`. */
  isHidden: boolean
}

/** Một dòng lịch sử đổi tồn. `type` có thể có giá trị mới (SALE, RETURN...) nên để chuỗi. */
export interface StockMovement {
  id: number
  type: string
  /** Có dấu: nhập dương, xuất âm, điều chỉnh = số đếm - tồn cũ. */
  quantity: number
  stockBefore: number
  stockAfter: number
  /** EXPORT: mã `ExportReason`; ADJUST: chữ tự do; IMPORT: `null`. */
  reason: string | null
  note: string | null
  createdAt: string
  /** `name` có thể `null`. */
  createdBy: { id: number; name: string | null }
}

export interface InventorySummary {
  total: number
  inStock: number
  low: number
  out: number
}

/** Query của GET /admin/inventory. Trường nào bỏ trống thì không gửi lên. */
export interface InventoryListParams {
  q?: string
  /** Gồm cả danh mục con. */
  categoryId?: number
  stockStatus?: StockStatus
  sortBy?: InventorySortBy
  order?: SortOrder
  /** Chỉ gửi khi `true`; mặc định của backend là `false`. */
  includeHidden?: true
  page?: number
  limit?: number
}

/** Query của GET /admin/inventory/summary: chỉ nhận hai trường này (trường khác bị 400). */
export interface InventorySummaryParams {
  categoryId?: number
  includeHidden?: true
}

export interface MovementListParams {
  page?: number
  limit?: number
}

export interface ImportStockInput {
  quantity: number
  note?: string
}

export interface ExportStockInput {
  quantity: number
  reason: ExportReason
  note?: string
}

export interface AdjustStockInput {
  /** Số đếm thực tế, không phải độ chênh. */
  newStock: number
  reason: string
  note?: string
}

/** Response 201 của import / export / adjust. */
export interface StockChangeResult {
  variant: InventoryItem
  movement: StockMovement
}
