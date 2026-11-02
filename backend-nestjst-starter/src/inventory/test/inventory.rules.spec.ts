import { BadRequestException, ConflictException } from '@nestjs/common';
import { MAX_STOCK } from '../inventory.constants';
import { planStockChange } from '../inventory.rules';

describe('planStockChange', () => {
  describe('IMPORT', () => {
    it('cộng vào tồn, delta dương, reason null', () => {
      expect(
        planStockChange(
          { type: 'IMPORT', quantity: 50, note: 'Đợt 3' },
          { stock: 20, reserved: 3 },
        ),
      ).toEqual({
        type: 'IMPORT',
        stockAfter: 70,
        delta: 50,
        reason: null,
        note: 'Đợt 3',
      });
    });

    it('đúng bằng giới hạn INT thì được, vượt thì 409', () => {
      const current = { stock: MAX_STOCK - 10, reserved: 0 };
      expect(
        planStockChange({ type: 'IMPORT', quantity: 10, note: null }, current)
          .stockAfter,
      ).toBe(MAX_STOCK);
      expect(() =>
        planStockChange({ type: 'IMPORT', quantity: 11, note: null }, current),
      ).toThrow(ConflictException);
    });
  });

  describe('EXPORT', () => {
    const exp = (quantity: number) =>
      ({
        type: 'EXPORT',
        quantity,
        reason: 'DAMAGED',
        note: null,
      }) as const;

    it('trừ tồn, delta âm, lưu mã lý do', () => {
      expect(planStockChange(exp(4), { stock: 10, reserved: 3 })).toEqual({
        type: 'EXPORT',
        stockAfter: 6,
        delta: -4,
        reason: 'DAMAGED',
        note: null,
      });
    });

    it('xuất đúng bằng khả dụng thì được (stock sau = reserved)', () => {
      expect(
        planStockChange(exp(7), { stock: 10, reserved: 3 }).stockAfter,
      ).toBe(3);
    });

    it('xuất vượt khả dụng (chạm vào phần đang giữ) thì 409', () => {
      expect(() => planStockChange(exp(8), { stock: 10, reserved: 3 })).toThrow(
        ConflictException,
      );
    });

    it('xuất khi hết sạch khả dụng thì 409', () => {
      expect(() => planStockChange(exp(1), { stock: 3, reserved: 3 })).toThrow(
        ConflictException,
      );
    });
  });

  describe('ADJUST', () => {
    const adj = (newStock: number) =>
      ({
        type: 'ADJUST',
        newStock,
        reason: 'Kiểm kê',
        note: null,
      }) as const;

    it('đếm nhiều hơn: delta dương', () => {
      expect(planStockChange(adj(25), { stock: 20, reserved: 3 })).toEqual({
        type: 'ADJUST',
        stockAfter: 25,
        delta: 5,
        reason: 'Kiểm kê',
        note: null,
      });
    });

    it('đếm ít hơn: delta âm; về đúng bằng reserved thì được', () => {
      expect(planStockChange(adj(3), { stock: 20, reserved: 3 }).delta).toBe(
        -17,
      );
    });

    it('thấp hơn reserved thì 409', () => {
      expect(() => planStockChange(adj(2), { stock: 20, reserved: 3 })).toThrow(
        ConflictException,
      );
    });

    it('bằng tồn hiện tại (delta = 0) thì 400', () => {
      expect(() =>
        planStockChange(adj(20), { stock: 20, reserved: 3 }),
      ).toThrow(BadRequestException);
    });

    it('về 0 khi không có hàng đang giữ thì được', () => {
      expect(
        planStockChange(adj(0), { stock: 5, reserved: 0 }).stockAfter,
      ).toBe(0);
    });
  });
});
