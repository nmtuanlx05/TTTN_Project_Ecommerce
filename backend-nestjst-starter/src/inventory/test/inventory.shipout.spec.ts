// Mock của Jest có kiểu any nên test đọc calls cần tắt các rule unsafe-* cho file này.
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { ConflictException, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { InventoryService } from '../inventory.service';

jest.mock('../../prisma/prisma.service', () => ({ PrismaService: class {} }));

// Prisma giả: kiểm logic và tham số câu SQL. UPDATE có điều kiện và khóa dòng trên MySQL thật chưa được test tự động.
describe('InventoryService.shipOut', () => {
  const tx = {
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    stockMovement: { create: jest.fn() },
  };
  let service: InventoryService;
  const run = (qty = 3) =>
    service.shipOut(
      tx as unknown as Prisma.TransactionClient,
      7,
      qty,
      42,
      'MS-261105-ABCD',
    );
  const sqlOf = (call: unknown[]) =>
    call[0] as { sql: string; values: unknown[] };

  beforeEach(() => {
    jest.resetAllMocks();
    service = new InventoryService({} as never);
    tx.stockMovement.create.mockResolvedValue({ id: 1, type: 'SALE' });
  });

  it('khóa dòng biến thể, giảm CẢ stock và reserved bằng một UPDATE có điều kiện, ghi movement SALE', async () => {
    tx.$queryRaw.mockResolvedValue([{ id: 7, stock: 10, reserved: 4 }]);
    tx.$executeRaw.mockResolvedValue(1);

    await run(3);

    expect(sqlOf(tx.$queryRaw.mock.calls[0]).sql).toContain('FOR UPDATE');
    const update = sqlOf(tx.$executeRaw.mock.calls[0]);
    expect(update.sql).toContain('stock = stock - ?');
    expect(update.sql).toContain('reserved = reserved - ?');
    expect(update.sql).toContain('stock >= ?');
    expect(update.sql).toContain('reserved >= ?');
    expect(update.values).toEqual([3, 3, 7, 3, 3]);

    expect(tx.stockMovement.create.mock.calls[0][0].data).toEqual({
      variantId: 7,
      type: 'SALE',
      quantity: -3,
      stockBefore: 10,
      stockAfter: 7,
      reason: 'ORDER_SHIPPED',
      note: 'Xuất kho cho đơn MS-261105-ABCD',
      createdById: 42,
    });
  });

  it('biến thể không tồn tại → 404, không ghi gì', async () => {
    tx.$queryRaw.mockResolvedValue([]);
    await expect(run()).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.$executeRaw).not.toHaveBeenCalled();
    expect(tx.stockMovement.create).not.toHaveBeenCalled();
  });

  it('UPDATE ảnh hưởng 0 dòng (không đủ stock hoặc reserved) → 409, không ghi movement', async () => {
    tx.$queryRaw.mockResolvedValue([{ id: 7, stock: 2, reserved: 2 }]);
    tx.$executeRaw.mockResolvedValue(0);

    await expect(run(3)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.stockMovement.create).not.toHaveBeenCalled();
  });

  it('xuất đúng bằng tồn: stockAfter = 0', async () => {
    tx.$queryRaw.mockResolvedValue([{ id: 7, stock: 3, reserved: 3 }]);
    tx.$executeRaw.mockResolvedValue(1);

    await run(3);
    expect(tx.stockMovement.create.mock.calls[0][0].data).toMatchObject({
      stockBefore: 3,
      stockAfter: 0,
      quantity: -3,
    });
  });
});
