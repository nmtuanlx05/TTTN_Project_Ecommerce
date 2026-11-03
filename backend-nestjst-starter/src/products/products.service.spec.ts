// Mock của Jest có kiểu any nên test đọc calls cần tắt các rule unsafe-* cho file này.
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { QueryPublicProductsDto } from './dto/query-public-products.dto';
import { ProductsService } from './products.service';

// PrismaService thật kéo theo client Prisma/adapter (không cần cho unit test này)
jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));

// Prisma giả: chỉ kiểm câu truy vấn được dựng (where, orderBy, phân trang), KHÔNG chạy SQL thật.
// Kết quả trên MySQL thật phải kiểm tay (xem danh sách test tay trong báo cáo).
describe('ProductsService (public)', () => {
  const prisma = {
    $transaction: jest.fn(),
    product: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn() },
    category: { findMany: jest.fn() },
  };
  let service: ProductsService;

  const query = (over: Partial<QueryPublicProductsDto> = {}) =>
    Object.assign(new QueryPublicProductsDto(), over);
  const lastFindMany = () => prisma.product.findMany.mock.lastCall[0];

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((ops: Promise<unknown>[]) =>
      Promise.all(ops),
    );
    prisma.product.findMany.mockResolvedValue([]);
    prisma.product.count.mockResolvedValue(0);
    prisma.category.findMany.mockResolvedValue([]);
    service = new ProductsService(prisma as unknown as PrismaService);
  });

  describe('findAllPublic: sắp xếp ổn định khi phân trang', () => {
    // Giá, ngày tạo, tên đều có thể trùng nhau; thiếu khóa phụ id thì MySQL được phép
    // trả thứ tự tùy ý giữa các dòng trùng, làm sản phẩm lặp hoặc sót giữa các trang.
    const cases = [
      { sortBy: 'createdAt', order: 'desc' },
      { sortBy: 'createdAt', order: 'asc' },
      { sortBy: 'price', order: 'asc' },
      { sortBy: 'price', order: 'desc' },
      { sortBy: 'name', order: 'asc' },
      { sortBy: 'name', order: 'desc' },
    ] as const;

    it.each(cases)(
      'sortBy=$sortBy order=$order → orderBy có id làm khóa phụ cùng chiều',
      async ({ sortBy, order }) => {
        await service.findAllPublic(query({ sortBy, order }));
        expect(lastFindMany().orderBy).toEqual([
          { [sortBy]: order },
          { id: order },
        ]);
      },
    );

    it('mặc định (mới nhất trước) cũng có khóa phụ id', async () => {
      await service.findAllPublic(query());
      expect(lastFindMany().orderBy).toEqual([
        { createdAt: 'desc' },
        { id: 'desc' },
      ]);
    });

    it('skip/take theo page và limit, count dùng cùng where với findMany', async () => {
      await service.findAllPublic(
        query({ page: 3, limit: 12, minPrice: 100, excludeId: 5 }),
      );
      expect(lastFindMany().skip).toBe(24);
      expect(lastFindMany().take).toBe(12);
      expect(prisma.product.count).toHaveBeenCalledWith({
        where: lastFindMany().where,
      });
    });
  });

  describe('findAllPublic: điều kiện lọc', () => {
    const whereOf = async (over: Partial<QueryPublicProductsDto> = {}) => {
      await service.findAllPublic(query(over));
      return lastFindMany().where;
    };

    it('luôn chỉ lấy sản phẩm đang bán có ít nhất một biến thể đang bán', async () => {
      expect(await whereOf()).toEqual({
        isActive: true,
        variants: { some: { isActive: true } },
      });
    });

    it('minPrice, maxPrice → price gte/lte; chỉ gửi một trong hai thì chỉ có một cận', async () => {
      expect((await whereOf({ minPrice: 100, maxPrice: 500 })).price).toEqual({
        gte: 100,
        lte: 500,
      });
      expect((await whereOf({ minPrice: 100 })).price).toEqual({ gte: 100 });
      expect((await whereOf({ maxPrice: 500 })).price).toEqual({ lte: 500 });
    });

    it('minPrice = 0 và maxPrice = 0 vẫn được áp dụng (0 không bị coi là "không gửi")', async () => {
      expect((await whereOf({ minPrice: 0 })).price).toEqual({ gte: 0 });
      expect((await whereOf({ maxPrice: 0 })).price).toEqual({ lte: 0 });
    });

    it('không gửi giá thì where không có price', async () => {
      expect(await whereOf()).not.toHaveProperty('price');
    });

    it('excludeId → id: { not }', async () => {
      expect((await whereOf({ excludeId: 7 })).id).toEqual({ not: 7 });
      expect(await whereOf()).not.toHaveProperty('id');
    });

    it('không bao giờ cho đặt isActive từ query', async () => {
      // Dù có ai ép thêm trường vào đối tượng query, where vẫn cố định isActive: true
      const where = await whereOf({ isActive: false } as never);
      expect(where.isActive).toBe(true);
    });

    it('categoryId → lấy cả danh mục con/cháu', async () => {
      prisma.category.findMany
        .mockResolvedValueOnce([{ id: 11 }, { id: 12 }])
        .mockResolvedValueOnce([{ id: 21 }])
        .mockResolvedValueOnce([]);
      const where = await whereOf({ categoryId: 1 });
      expect(where.categoryId).toEqual({ in: [1, 11, 12, 21] });
    });

    it('chỉ select các trường public (không có isActive ở cấp sản phẩm)', async () => {
      await service.findAllPublic(query());
      const { select } = lastFindMany();
      expect(select).not.toHaveProperty('isActive');
      expect(select.variants.where).toEqual({ isActive: true });
    });
  });

  describe('findBySlug', () => {
    it('chỉ tìm sản phẩm đang bán có biến thể đang bán', async () => {
      prisma.product.findFirst.mockResolvedValue({
        id: 1,
        name: 'Áo',
        slug: 'ao',
        description: null,
        price: 1,
        imageUrl: null,
        category: { id: 1, name: 'Áo', slug: 'ao' },
        variants: [],
      });
      await service.findBySlug('ao');
      expect(prisma.product.findFirst.mock.lastCall[0].where).toEqual({
        slug: 'ao',
        isActive: true,
        variants: { some: { isActive: true } },
      });
    });

    it('không tìm thấy (ẩn hoặc không tồn tại) → 404', async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(service.findBySlug('da-an')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
