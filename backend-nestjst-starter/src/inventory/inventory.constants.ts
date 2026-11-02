// Giới hạn của kiểu INT trong MySQL (cột stock)
export const MAX_STOCK = 2_147_483_647;

// Số lượng tối đa cho một lần nhập/xuất, tránh nhập nhầm thừa số 0
export const MAX_QUANTITY_PER_OPERATION = 100_000;

export const MAX_NOTE_LENGTH = 500;
export const MAX_REASON_LENGTH = 191;

// Trạng thái tồn: out (khả dụng <= 0), low (0 < khả dụng <= minStock), in_stock (còn lại)
export const STOCK_STATUSES = ['in_stock', 'low', 'out'] as const;
export type StockStatus = (typeof STOCK_STATUSES)[number];

// Mã lý do khi xuất kho thủ công; lưu nguyên mã vào StockMovement.reason
export const EXPORT_REASONS = ['DAMAGED', 'LOST', 'OTHER'] as const;
export type ExportReason = (typeof EXPORT_REASONS)[number];

export const INVENTORY_SORT_FIELDS = ['name', 'stock', 'available'] as const;
export type InventorySortField = (typeof INVENTORY_SORT_FIELDS)[number];
