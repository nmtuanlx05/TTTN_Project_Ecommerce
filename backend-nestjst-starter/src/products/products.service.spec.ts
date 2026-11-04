// Mock của Jest có kiểu any nên test đọc calls cần tắt các rule unsafe-* cho file này.
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryPublicProductsDto } from './dto/query-public-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
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
        images: [],
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

// Ghi sản phẩm: kiểm ảnh (thay cả mảng, thứ tự, đồng bộ imageUrl cũ) và mã màu nhất quán.
describe('ProductsService (ghi: ảnh và màu)', () => {
  const prisma = {
    $transaction: jest.fn(),
    product: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    productImage: { deleteMany: jest.fn(), createMany: jest.fn() },
    productVariant: { findFirst: jest.fn() },
    category: { findUnique: jest.fn() },
  };
  let service: ProductsService;

  const baseDetail = {
    id: 1,
    name: 'Áo',
    slug: 'ao',
    description: null,
    price: 100,
    imageUrl: null,
    isActive: true,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    category: { id: 1, name: 'Áo', slug: 'ao' },
    variants: [],
    images: [],
  };
  const variant = (over: Record<string, unknown> = {}) => ({
    sku: 'A-M-DEN',
    size: 'M',
    color: 'Đen',
    ...over,
  });
  const createDto = (over: Record<string, unknown> = {}) =>
    ({
      name: 'Áo',
      slug: 'ao',
      price: 100,
      categoryId: 1,
      variants: [variant()],
      ...over,
    }) as CreateProductDto;
  const updateDto = (over: Record<string, unknown> = {}) =>
    over as UpdateProductDto;
  const imgs = (...urls: string[]) => urls.map((url) => ({ url }));

  // Biến thể hiện có của sản phẩm #1 khi PATCH
  const existingVariants = [
    {
      id: 10,
      sku: 'A-M-TRANG',
      size: 'M',
      color: 'Trắng',
      colorHex: '#FFFFFF',
    },
    {
      id: 11,
      sku: 'A-L-TRANG',
      size: 'L',
      color: 'Trắng',
      colorHex: '#FFFFFF',
    },
  ];

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((ops: Promise<unknown>[]) =>
      Promise.all(ops),
    );
    prisma.category.findUnique.mockResolvedValue({ id: 1 });
    prisma.product.findFirst.mockResolvedValue(null);
    prisma.productVariant.findFirst.mockResolvedValue(null);
    prisma.product.create.mockResolvedValue({ id: 1 });
    prisma.product.update.mockResolvedValue({ id: 1 });
    prisma.product.findUnique.mockImplementation(
      (args: { select: Record<string, unknown> }) =>
        // findOne (select chi tiết, có description) và truy vấn đầu của update (select slug/variants)
        Promise.resolve(
          'description' in args.select
            ? baseDetail
            : { id: 1, slug: 'ao', variants: existingVariants },
        ),
    );
    prisma.productImage.deleteMany.mockResolvedValue({ count: 0 });
    prisma.productImage.createMany.mockResolvedValue({ count: 0 });
    service = new ProductsService(prisma as unknown as PrismaService);
  });

  const createData = () => prisma.product.create.mock.lastCall[0].data;
  const updateData = () => prisma.product.update.mock.lastCall[0].data;

  describe('create: ảnh', () => {
    it('images → ProductImage theo thứ tự trong mảng (sortOrder 0,1,2); imageUrl cũ = ảnh đầu', async () => {
      await service.create(createDto({ images: imgs('a', 'b', 'c') }));
      expect(createData().images.create).toEqual([
        { url: 'a', sortOrder: 0 },
        { url: 'b', sortOrder: 1 },
        { url: 'c', sortOrder: 2 },
      ]);
      expect(createData().imageUrl).toBe('a');
    });

    it('không gửi ảnh nào → không có dòng ảnh, imageUrl = null', async () => {
      await service.create(createDto());
      expect(createData().images.create).toEqual([]);
      expect(createData().imageUrl).toBeNull();
    });

    it('tương thích tạm: chỉ gửi imageUrl cũ → coi như images = [imageUrl]', async () => {
      await service.create(createDto({ imageUrl: 'https://x/a.jpg' }));
      expect(createData().images.create).toEqual([
        { url: 'https://x/a.jpg', sortOrder: 0 },
      ]);
      expect(createData().imageUrl).toBe('https://x/a.jpg');
    });

    it('gửi cả images và imageUrl → images thắng', async () => {
      await service.create(
        createDto({ images: imgs('a'), imageUrl: 'https://x/old.jpg' }),
      );
      expect(createData().images.create).toEqual([{ url: 'a', sortOrder: 0 }]);
    });

    it('URL ảnh đầu dài hơn 191 ký tự: vẫn lưu ProductImage nhưng cột imageUrl cũ = null', async () => {
      const long = `https://x/${'a'.repeat(300)}`;
      await service.create(createDto({ images: imgs(long) }));
      expect(createData().images.create).toEqual([{ url: long, sortOrder: 0 }]);
      expect(createData().imageUrl).toBeNull();
    });

    it('URL trùng trong mảng → 400 tiếng Việt, không ghi gì', async () => {
      const call = service.create(createDto({ images: imgs('a', 'b', 'a') }));
      await expect(call).rejects.toBeInstanceOf(BadRequestException);
      await expect(call).rejects.toThrow('bị trùng trong danh sách ảnh');
      expect(prisma.product.create).not.toHaveBeenCalled();
    });
  });

  describe('update: thay cả mảng ảnh', () => {
    it('có images → trong MỘT transaction: update sản phẩm, xóa dòng cũ, thêm dòng mới theo thứ tự', async () => {
      await service.update(1, updateDto({ images: imgs('b', 'a') }));
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.$transaction.mock.lastCall[0]).toHaveLength(3);
      expect(prisma.productImage.deleteMany).toHaveBeenCalledWith({
        where: { productId: 1 },
      });
      expect(prisma.productImage.createMany).toHaveBeenCalledWith({
        data: [
          { productId: 1, url: 'b', sortOrder: 0 },
          { productId: 1, url: 'a', sortOrder: 1 },
        ],
      });
      expect(updateData().imageUrl).toBe('b');
    });

    it('đổi thứ tự = ghi lại sortOrder theo thứ tự mới', async () => {
      await service.update(1, updateDto({ images: imgs('c', 'b', 'a') }));
      const { data } = prisma.productImage.createMany.mock.lastCall[0] as {
        data: { url: string; sortOrder: number }[];
      };
      expect(data.map((d) => d.url)).toEqual(['c', 'b', 'a']);
      expect(data.map((d) => d.sortOrder)).toEqual([0, 1, 2]);
    });

    it('images: [] → xóa hết ảnh, không createMany, imageUrl cũ = null', async () => {
      await service.update(1, updateDto({ images: [] }));
      expect(prisma.productImage.deleteMany).toHaveBeenCalled();
      expect(prisma.productImage.createMany).not.toHaveBeenCalled();
      expect(updateData().imageUrl).toBeNull();
    });

    it('không gửi images/imageUrl → giữ nguyên ảnh: không transaction, không đụng ProductImage, imageUrl = undefined', async () => {
      await service.update(1, updateDto({ name: 'Tên mới' }));
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.productImage.deleteMany).not.toHaveBeenCalled();
      expect(updateData().imageUrl).toBeUndefined();
    });

    it('chỉ gửi imageUrl cũ → coi như images = [imageUrl]', async () => {
      await service.update(1, updateDto({ imageUrl: 'https://x/a.jpg' }));
      expect(prisma.productImage.createMany).toHaveBeenCalledWith({
        data: [{ productId: 1, url: 'https://x/a.jpg', sortOrder: 0 }],
      });
    });

    it.each([null, ''])(
      'chỉ gửi imageUrl = %p → xóa toàn bộ ảnh',
      async (imageUrl) => {
        await service.update(1, updateDto({ imageUrl }));
        expect(prisma.productImage.deleteMany).toHaveBeenCalled();
        expect(prisma.productImage.createMany).not.toHaveBeenCalled();
        expect(updateData().imageUrl).toBeNull();
      },
    );

    it('images trùng URL → 400, không ghi gì', async () => {
      await expect(
        service.update(1, updateDto({ images: imgs('a', 'a') })),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.product.update).not.toHaveBeenCalled();
      expect(prisma.productImage.deleteMany).not.toHaveBeenCalled();
    });

    it('images: null → 400 (muốn xóa hết thì gửi [])', async () => {
      await expect(
        service.update(1, updateDto({ images: null })),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.product.update).not.toHaveBeenCalled();
    });
  });

  describe('create: mã màu nhất quán', () => {
    it('lưu colorHex đã gửi; không gửi thì null', async () => {
      await service.create(
        createDto({
          variants: [
            variant({ colorHex: '#111111' }),
            variant({ sku: 'A-L-DEN', size: 'L' }),
          ],
        }),
      );
      const created = createData().variants.create;
      expect(created[0].colorHex).toBe('#111111');
      expect(created[1].colorHex).toBeNull();
    });

    it('cùng màu cùng hex → hợp lệ (so khớp màu bỏ qua hoa thường và dấu)', async () => {
      await expect(
        service.create(
          createDto({
            variants: [
              variant({ colorHex: '#111111' }),
              variant({
                sku: 'A-L-DEN',
                size: 'L',
                color: 'den',
                colorHex: '#111111',
              }),
            ],
          }),
        ),
      ).resolves.toBeDefined();
    });

    it('cùng màu khác hex → 400 nêu rõ màu và hai mã', async () => {
      const call = service.create(
        createDto({
          variants: [
            variant({ colorHex: '#111111' }),
            variant({
              sku: 'A-L-DEN',
              size: 'L',
              color: 'ĐEN',
              colorHex: '#000000',
            }),
          ],
        }),
      );
      await expect(call).rejects.toBeInstanceOf(BadRequestException);
      await expect(call).rejects.toThrow(
        'Màu "ĐEN" có hai mã màu khác nhau (#111111 và #000000)',
      );
      expect(prisma.product.create).not.toHaveBeenCalled();
    });

    it('cùng màu, một biến thể có hex và một biến thể không có → hợp lệ', async () => {
      await expect(
        service.create(
          createDto({
            variants: [
              variant({ colorHex: '#111111' }),
              variant({ sku: 'A-L-DEN', size: 'L', colorHex: null }),
            ],
          }),
        ),
      ).resolves.toBeDefined();
    });

    it('khác màu thì hex khác nhau là bình thường', async () => {
      await expect(
        service.create(
          createDto({
            variants: [
              variant({ colorHex: '#111111' }),
              variant({
                sku: 'A-M-TRANG',
                color: 'Trắng',
                colorHex: '#FFFFFF',
              }),
            ],
          }),
        ),
      ).resolves.toBeDefined();
    });
  });

  describe('update: mã màu nhất quán trên trạng thái sau khi sửa', () => {
    it('đổi hex một biến thể mà biến thể cùng màu (giữ nguyên) vẫn hex cũ → 400', async () => {
      await expect(
        service.update(
          1,
          updateDto({ variants: [{ id: 10, colorHex: '#F5F5F5' }] }),
        ),
      ).rejects.toThrow('có hai mã màu khác nhau (#FFFFFF và #F5F5F5)');
      expect(prisma.product.update).not.toHaveBeenCalled();
    });

    it('gửi đủ mọi biến thể cùng màu với hex mới → hợp lệ và ghi colorHex', async () => {
      await service.update(
        1,
        updateDto({
          variants: [
            { id: 10, colorHex: '#F5F5F5' },
            { id: 11, colorHex: '#F5F5F5' },
          ],
        }),
      );
      expect(updateData().variants.update).toEqual([
        { where: { id: 10 }, data: { colorHex: '#F5F5F5' } },
        { where: { id: 11 }, data: { colorHex: '#F5F5F5' } },
      ]);
    });

    it('xóa hex (null) của biến thể → hợp lệ, ghi null', async () => {
      await service.update(
        1,
        updateDto({ variants: [{ id: 10, colorHex: null }] }),
      );
      expect(updateData().variants.update).toEqual([
        { where: { id: 10 }, data: { colorHex: null } },
      ]);
    });

    it('biến thể mới cùng màu với biến thể có sẵn nhưng khác hex → 400', async () => {
      await expect(
        service.update(
          1,
          updateDto({
            variants: [
              {
                sku: 'A-XL-TRANG',
                size: 'XL',
                color: 'trắng',
                colorHex: '#EEEEEE',
              },
            ],
          }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('biến thể mới cùng màu, không gửi hex → hợp lệ, hex null (không tự kế thừa)', async () => {
      await service.update(
        1,
        updateDto({
          variants: [{ sku: 'A-XL-TRANG', size: 'XL', color: 'Trắng' }],
        }),
      );
      expect(updateData().variants.create[0].colorHex).toBeNull();
    });

    it('không gửi colorHex khi sửa biến thể → không đụng tới cột colorHex', async () => {
      await service.update(
        1,
        updateDto({ variants: [{ id: 10, isActive: false }] }),
      );
      expect(updateData().variants.update).toEqual([
        { where: { id: 10 }, data: { isActive: false } },
      ]);
    });

    it('đổi tên màu của một biến thể sang màu khác (hex khác) → hợp lệ', async () => {
      await expect(
        service.update(
          1,
          updateDto({
            variants: [{ id: 10, color: 'Đen', colorHex: '#111111' }],
          }),
        ),
      ).resolves.toBeDefined();
    });
  });
});
