import { BadRequestException, ConflictException } from '@nestjs/common';
import { MAX_STOCK } from './inventory.constants';
import type { ExportReason } from './inventory.constants';

// Hàm thuần kiểm bất biến và tính tồn mới. Bất biến: stock >= reserved >= 0 và stock không vượt INT.

export type StockChange =
  | { type: 'IMPORT'; quantity: number; note: string | null }
  | {
      type: 'EXPORT';
      quantity: number;
      reason: ExportReason;
      note: string | null;
    }
  | { type: 'ADJUST'; newStock: number; reason: string; note: string | null };

export interface StockChangePlan {
  type: StockChange['type'];
  stockAfter: number;
  // Chênh lệch có dấu, ghi vào StockMovement.quantity
  delta: number;
  reason: string | null;
  note: string | null;
}

// `current` là giá trị đọc SAU KHI đã khóa dòng, nên kết quả không bị request khác làm lệch
export function planStockChange(
  change: StockChange,
  current: { stock: number; reserved: number },
): StockChangePlan {
  const { stock, reserved } = current;

  switch (change.type) {
    case 'IMPORT': {
      const stockAfter = stock + change.quantity;
      if (stockAfter > MAX_STOCK) {
        throw new ConflictException(
          `Tồn kho sau khi nhập (${stockAfter}) vượt giới hạn cho phép (${MAX_STOCK})`,
        );
      }
      return {
        type: 'IMPORT',
        stockAfter,
        delta: change.quantity,
        reason: null,
        note: change.note,
      };
    }

    case 'EXPORT': {
      // Không được xuất vào phần đang giữ cho đơn hàng
      const stockAfter = stock - change.quantity;
      if (stockAfter < reserved) {
        throw new ConflictException(
          `Tồn khả dụng không đủ để xuất: khả dụng ${stock - reserved}, cần xuất ${change.quantity}`,
        );
      }
      return {
        type: 'EXPORT',
        stockAfter,
        delta: -change.quantity,
        reason: change.reason,
        note: change.note,
      };
    }

    case 'ADJUST': {
      if (change.newStock < reserved) {
        throw new ConflictException(
          `Số lượng thực tế (${change.newStock}) không được nhỏ hơn số đang giữ cho đơn hàng (${reserved})`,
        );
      }
      const delta = change.newStock - stock;
      if (delta === 0) {
        throw new BadRequestException(
          'Số lượng thực tế trùng với tồn hiện tại, không có gì để điều chỉnh',
        );
      }
      return {
        type: 'ADJUST',
        stockAfter: change.newStock,
        delta,
        reason: change.reason,
        note: change.note,
      };
    }
  }
}
