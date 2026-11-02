// Mock của Jest có kiểu any nên test đọc calls/giá trị trả về cần tắt các rule unsafe-* cho file này.
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import { InventoryService } from '../inventory.service';
import type { QueryInventoryDto } from '../dto/query-inventory.dto';

// PrismaService thật kéo theo client Prisma/adapter (không cần cho unit test này)
jest.mock('../../prisma/prisma.service', () => ({ PrismaService: class {} }));

// Prisma giả: KHÔNG chạy SQL thật nên các câu SQL thô chỉ được kiểm ở mức chuỗi và tham số,
// còn kết quả trên MySQL thật phải kiểm tay (xem danh sách test tay trong báo cáo).
describe('InventoryService', () => {
  const tx = {
    $queryRaw: jest.fn(),
    productVariant: { update: jest.fn() },
    stockMovement: { create: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    category: { findUnique: jest.fn(), findMany: jest.fn() },
    productVariant: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    stockMovement: { findMany: jest.fn(), count: jest.fn() },
  };
  let service: InventoryService;

  const variantRow = (id: number, over: Record<string, unknown> = {}) => ({
    id,
    sku: `SKU-${id}`,
    size: 'M',
    color: 'Đen',
    stock: 20,
    reserved: 3,
    minStock: 5,
    isActive: true,
    product: {
      id: 1,
      name: 'Áo',
      imageUrl: null,
      isActive: true,
      category: { id: 2, name: 'Áo thun' },
    },
    ...over,
  });

  const lockRow = (stock: number, reserved: number) =>
    tx.$queryRaw.mockResolvedValue([{ id: 5, stock, reserved }]);

  beforeEach(() => {
    jest.resetAllMocks();
    // Giống Prisma: callback nhận tx, mảng thì chạy lần lượt
    prisma.$transaction.mockImplementation((arg: unknown) =>
      typeof arg === 'function'
        ? (arg as (t: typeof tx) => unknown)(tx)
        : Promise.all(arg as unknown[]),
    );
    tx.productVariant.update.mockImplementation(
      ({ data }: { data: { stock: number } }) =>
        Promise.resolve(variantRow(5, { stock: data.stock })),
    );
    tx.stockMovement.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 99, ...data }),
    );
    service = new InventoryService(prisma as unknown as PrismaService);
  });

  describe('nhập / xuất / điều chỉnh', () => {
    it('nhập kho: khóa dòng, cập nhật stock, ghi movement đúng before/after/delta trong cùng transaction', async () => {
      lockRow(20, 3);

      const result = await service.importStock(
        5,
        { quantity: 50, note: 'Đợt 3' },
        7,
      );

      expect(tx.productVariant.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 5 }, data: { stock: 70 } }),
      );
      expect(tx.stockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            variantId: 5,
            type: 'IMPORT',
            quantity: 50,
            stockBefore: 20,
            stockAfter: 70,
            reason: null,
            note: 'Đợt 3',
            createdById: 7,
          },
        }),
      );
      expect(result.variant).toMatchObject({
        id: 5,
        stock: 70,
        available: 67,
        stockStatus: 'in_stock',
      });
      expect(result.movement).toMatchObject({ id: 99, stockAfter: 70 });
      // Mọi thao tác ghi đều đi qua tx, không chạm vào prisma ngoài transaction
      expect(prisma.productVariant.update).not.toHaveBeenCalled();
    });

    it('lấy khóa dòng (FOR UPDATE, id là tham số) TRƯỚC khi cập nhật và ghi movement', async () => {
      lockRow(20, 3);

      await service.importStock(5, { quantity: 1 }, 7);

      const lockSql = tx.$queryRaw.mock.calls[0][0] as Prisma.Sql;
      expect(lockSql.sql).toContain(
        'FROM product_variants WHERE id = ? FOR UPDATE',
      );
      expect(lockSql.values).toEqual([5]);
      const lockOrder = tx.$queryRaw.mock.invocationCallOrder[0];
      expect(lockOrder).toBeLessThan(
        tx.productVariant.update.mock.invocationCallOrder[0],
      );
      expect(lockOrder).toBeLessThan(
        tx.stockMovement.create.mock.invocationCallOrder[0],
      );
    });

    it('stockBefore lấy từ giá trị đã khóa (bản đọc trong transaction), kể cả khi là BigInt/chuỗi từ driver', async () => {
      tx.$queryRaw.mockResolvedValue([{ id: 5, stock: '12', reserved: 2 }]);

      await service.importStock(5, { quantity: 3 }, 7);

      expect(tx.stockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ stockBefore: 12, stockAfter: 15 }),
        }),
      );
    });

    it('xuất kho: trừ tồn, movement quantity âm, lưu mã lý do', async () => {
      lockRow(10, 3);

      await service.exportStock(
        5,
        { quantity: 4, reason: 'OTHER', note: 'Làm mẫu chụp ảnh' },
        7,
      );

      expect(tx.productVariant.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { stock: 6 } }),
      );
      expect(tx.stockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'EXPORT',
            quantity: -4,
            stockBefore: 10,
            stockAfter: 6,
            reason: 'OTHER',
            note: 'Làm mẫu chụp ảnh',
          }),
        }),
      );
    });

    it('xuất vượt khả dụng: 409, không cập nhật và không ghi movement', async () => {
      lockRow(10, 8);

      await expect(
        service.exportStock(5, { quantity: 3, reason: 'LOST' }, 7),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(tx.productVariant.update).not.toHaveBeenCalled();
      expect(tx.stockMovement.create).not.toHaveBeenCalled();
    });

    it('điều chỉnh: tự tính delta từ số đếm thực tế, ghi lý do', async () => {
      lockRow(20, 3);

      await service.adjustStock(
        5,
        { newStock: 14, reason: 'Kiểm kê cuối tháng' },
        7,
      );

      expect(tx.productVariant.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { stock: 14 } }),
      );
      expect(tx.stockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'ADJUST',
            quantity: -6,
            stockBefore: 20,
            stockAfter: 14,
            reason: 'Kiểm kê cuối tháng',
          }),
        }),
      );
    });

    it('điều chỉnh xuống dưới số đang giữ: 409, không ghi gì', async () => {
      lockRow(20, 6);

      await expect(
        service.adjustStock(5, { newStock: 5, reason: 'Kiểm kê' }, 7),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(tx.productVariant.update).not.toHaveBeenCalled();
      expect(tx.stockMovement.create).not.toHaveBeenCalled();
    });

    it('điều chỉnh bằng tồn hiện tại (delta = 0): 400 và KHÔNG ghi movement', async () => {
      lockRow(20, 3);

      await expect(
        service.adjustStock(5, { newStock: 20, reason: 'Kiểm kê' }, 7),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(tx.productVariant.update).not.toHaveBeenCalled();
      expect(tx.stockMovement.create).not.toHaveBeenCalled();
    });

    it('biến thể không tồn tại (khóa không ra dòng nào): 404, không ghi gì', async () => {
      tx.$queryRaw.mockResolvedValue([]);

      await expect(
        service.importStock(404, { quantity: 1 }, 7),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(tx.productVariant.update).not.toHaveBeenCalled();
      expect(tx.stockMovement.create).not.toHaveBeenCalled();
    });

    it('không lọc theo isActive: khóa và cập nhật chỉ theo id nên biến thể/sản phẩm đã ẩn vẫn thao tác được', async () => {
      lockRow(20, 0);
      tx.productVariant.update.mockResolvedValue(
        variantRow(5, {
          stock: 21,
          isActive: false,
          product: { ...variantRow(5).product, isActive: false },
        }),
      );

      const result = await service.importStock(5, { quantity: 1 }, 7);

      const lockSql = tx.$queryRaw.mock.calls[0][0] as Prisma.Sql;
      expect(lockSql.sql).not.toContain('isActive');
      expect(tx.productVariant.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 5 } }),
      );
      expect(result.variant.isHidden).toBe(true);
    });

    it('nhận tx từ bên ngoài thì dùng luôn, không mở transaction mới', async () => {
      lockRow(20, 3);

      await service.importStock(
        5,
        { quantity: 1 },
        7,
        tx as unknown as Prisma.TransactionClient,
      );

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(tx.stockMovement.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateMinStock', () => {
    it('chỉ cập nhật ngưỡng theo id, không ghi movement, không lọc isActive', async () => {
      prisma.productVariant.update.mockResolvedValue(
        variantRow(5, { minStock: 17 }),
      );

      const result = await service.updateMinStock(5, 17);

      expect(prisma.productVariant.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 5 }, data: { minStock: 17 } }),
      );
      expect(prisma.stockMovement.findMany).not.toHaveBeenCalled();
      expect(tx.stockMovement.create).not.toHaveBeenCalled();
      // stock 20, reserved 3 → khả dụng 17 = ngưỡng 17 nên là low
      expect(result).toMatchObject({ minStock: 17, stockStatus: 'low' });
    });

    it('id không tồn tại (Prisma P2025): 404 tiếng Việt, không phải 500', async () => {
      prisma.productVariant.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('not found', {
          code: 'P2025',
          clientVersion: 'test',
        }),
      );

      await expect(service.updateMinStock(404, 3)).rejects.toThrow(
        new NotFoundException('Không tìm thấy biến thể với ID #404'),
      );
    });

    it('lỗi khác được ném lại nguyên vẹn', async () => {
      const boom = new Error('db down');
      prisma.productVariant.update.mockRejectedValue(boom);

      await expect(service.updateMinStock(5, 3)).rejects.toBe(boom);
    });
  });

  describe('findMovements', () => {
    const query = { page: 2, limit: 5 };

    it('id không tồn tại: 404, không trả danh sách rỗng', async () => {
      prisma.productVariant.findUnique.mockResolvedValue(null);
      prisma.stockMovement.findMany.mockResolvedValue([]);
      prisma.stockMovement.count.mockResolvedValue(0);

      await expect(service.findMovements(404, query)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('mới nhất trước, phân trang, chỉ tìm theo variantId (không lọc isActive)', async () => {
      prisma.productVariant.findUnique.mockResolvedValue({ id: 5 });
      prisma.stockMovement.findMany.mockResolvedValue([{ id: 3 }]);
      prisma.stockMovement.count.mockResolvedValue(11);

      const result = await service.findMovements(5, query);

      expect(prisma.productVariant.findUnique).toHaveBeenCalledWith({
        where: { id: 5 },
        select: { id: true },
      });
      expect(prisma.stockMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { variantId: 5 },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: 5,
          take: 5,
        }),
      );
      expect(result.meta).toEqual({
        page: 2,
        limit: 5,
        total: 11,
        totalPages: 3,
      });
    });

    it('select người thực hiện chỉ có id và name (không lộ email, password)', async () => {
      prisma.productVariant.findUnique.mockResolvedValue({ id: 5 });
      prisma.stockMovement.findMany.mockResolvedValue([]);
      prisma.stockMovement.count.mockResolvedValue(0);

      await service.findMovements(5, query);

      const args = prisma.stockMovement.findMany.mock.calls[0][0] as {
        select: { createdBy: { select: object } };
      };
      expect(args.select.createdBy).toEqual({
        select: { id: true, name: true },
      });
    });
  });

  describe('findAll', () => {
    const query = (
      over: Partial<QueryInventoryDto> = {},
    ): QueryInventoryDto => ({
      sortBy: 'name',
      order: 'asc',
      includeHidden: false,
      page: 1,
      limit: 10,
      ...over,
    });

    it('categoryId không tồn tại: danh sách rỗng, total 0, không chạy SQL thô', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      const result = await service.findAll(query({ categoryId: 999 }));

      expect(result.data).toEqual([]);
      expect(result.meta).toEqual({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      });
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('summary với categoryId không tồn tại: toàn 0, không chạy SQL thô', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(
        service.getSummary({ categoryId: 999, includeHidden: false }),
      ).resolves.toEqual({ total: 0, inStock: 0, low: 0, out: 0 });
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });

    it('lọc theo danh mục gồm cả danh mục con/cháu (tham số của SQL đếm)', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 1 });
      prisma.category.findMany
        .mockResolvedValueOnce([{ id: 2 }, { id: 3 }])
        .mockResolvedValueOnce([{ id: 4 }])
        .mockResolvedValueOnce([]);
      prisma.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: 0n }]);

      await service.findAll(query({ categoryId: 1 }));

      const countSql = prisma.$queryRaw.mock.calls[1][0] as Prisma.Sql;
      expect(countSql.values).toEqual([1, 2, 3, 4]);
    });

    it('hai bước: giữ đúng thứ tự id của SQL thô, total ép từ BigInt, một lượt findMany', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([{ id: 3 }, { id: 1 }, { id: 2 }])
        .mockResolvedValueOnce([{ total: 25n }]);
      // Prisma trả theo thứ tự khác
      prisma.productVariant.findMany.mockResolvedValue([
        variantRow(1),
        variantRow(2),
        variantRow(3),
      ]);

      const result = await service.findAll(query({ page: 3, limit: 10 }));

      expect(result.data.map((item) => item.id)).toEqual([3, 1, 2]);
      expect(result.meta).toEqual({
        page: 3,
        limit: 10,
        total: 25,
        totalPages: 3,
      });
      expect(prisma.productVariant.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.productVariant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: { in: [3, 1, 2] } } }),
      );
      const listSql = prisma.$queryRaw.mock.calls[0][0] as Prisma.Sql;
      expect(listSql.values).toEqual([10, 20]);
    });

    it('trang rỗng: không gọi findMany', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: 4n }]);

      const result = await service.findAll(query({ page: 9 }));

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(4);
      expect(prisma.productVariant.findMany).not.toHaveBeenCalled();
    });

    it('q: thoát % _ ! và đi qua tham số, không nối vào SQL', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: 0n }]);

      await service.findAll(query({ q: "50%_x'; DROP TABLE users" }));

      for (const call of prisma.$queryRaw.mock.calls) {
        const sql = call[0] as Prisma.Sql;
        expect(sql.sql).not.toContain('DROP');
        expect(sql.values).toContain("%50!%!_x'; DROP TABLE users%");
      }
    });

    it('sortBy/order được ánh xạ sang đoạn SQL cố định', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: 0n }]);

      await service.findAll(query({ sortBy: 'available', order: 'desc' }));

      const listSql = prisma.$queryRaw.mock.calls[0][0] as Prisma.Sql;
      expect(listSql.sql).toContain(
        'ORDER BY (pv.stock - pv.reserved) DESC, pv.id ASC',
      );
    });
  });

  describe('getSummary', () => {
    it('ép BigInt/Decimal từ MySQL về number', async () => {
      prisma.$queryRaw.mockResolvedValue([
        { total: 10n, inStock: '6', low: 3, out: 1n },
      ]);

      await expect(
        service.getSummary({ includeHidden: false }),
      ).resolves.toEqual({ total: 10, inStock: 6, low: 3, out: 1 });
    });

    it('không có biến thể nào: toàn 0', async () => {
      prisma.$queryRaw.mockResolvedValue([
        { total: 0n, inStock: 0n, low: 0n, out: 0n },
      ]);

      await expect(
        service.getSummary({ includeHidden: true }),
      ).resolves.toEqual({ total: 0, inStock: 0, low: 0, out: 0 });
    });
  });
});
