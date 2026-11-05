import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { WISHLIST_MAX_ITEMS } from './wishlist.constants';
import { WishlistService } from './wishlist.service';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));

// Prisma giả: chỉ kiểm logic và tham số truy vấn. Khóa dòng users và UNIQUE thật chưa được test trên MySQL.
const USER = 7;
const PRODUCT = 21;

const p2002 = () =>
  new Prisma.PrismaClientKnownRequestError('dup', {
    code: 'P2002',
    clientVersion: 'test',
  });

function setup(
  opts: {
    product?: object | null;
    existing?: object | null;
    count?: number;
  } = {},
) {
  const tx = {
    product: {
      findFirst: jest
        .fn()
        .mockResolvedValue('product' in opts ? opts.product : { id: PRODUCT }),
    },
    $queryRaw: jest.fn().mockResolvedValue([{ id: USER }]),
    wishlistItem: {
      findUnique: jest
        .fn()
        .mockResolvedValue('existing' in opts ? opts.existing : null),
      count: jest.fn().mockResolvedValue(opts.count ?? 0),
      create: jest.fn().mockResolvedValue({}),
    },
  };
  const prisma = {
    $transaction: jest.fn((arg: unknown) =>
      typeof arg === 'function'
        ? (arg as (t: typeof tx) => unknown)(tx)
        : Promise.all(arg as unknown[]),
    ),
    wishlistItem: {
      findMany: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
  return { service: new WishlistService(prisma as never), prisma, tx };
}

describe('WishlistService.add', () => {
  it('thêm mới: kiểm sản phẩm đang bán, khóa user, tạo dòng, added=true', async () => {
    const { service, tx } = setup();
    expect(await service.add(USER, PRODUCT)).toEqual({
      productId: PRODUCT,
      added: true,
    });
    expect(tx.product.findFirst).toHaveBeenCalledWith({
      where: {
        id: PRODUCT,
        isActive: true,
        variants: { some: { isActive: true } },
      },
      select: { id: true },
    });
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.wishlistItem.create).toHaveBeenCalledWith({
      data: { userId: USER, productId: PRODUCT },
    });
    // khóa user phải trước khi đọc/ghi wishlist
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.wishlistItem.findUnique.mock.invocationCallOrder[0],
    );
  });

  it('thêm trùng: added=false, không tạo dòng, không lỗi', async () => {
    const { service, tx } = setup({ existing: { id: 1 } });
    expect(await service.add(USER, PRODUCT)).toEqual({
      productId: PRODUCT,
      added: false,
    });
    expect(tx.wishlistItem.create).not.toHaveBeenCalled();
  });

  it('hai request đồng thời: P2002 lọt qua thì coi như đã có (added=false)', async () => {
    const { service, tx } = setup();
    tx.wishlistItem.create.mockRejectedValue(p2002());
    expect(await service.add(USER, PRODUCT)).toEqual({
      productId: PRODUCT,
      added: false,
    });
  });

  it('đủ trần: thêm mới → 409 WISHLIST_FULL', async () => {
    const { service, tx } = setup({ count: WISHLIST_MAX_ITEMS });
    const error = await service.add(USER, PRODUCT).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toMatchObject({
      code: 'WISHLIST_FULL',
    });
    expect(tx.wishlistItem.create).not.toHaveBeenCalled();
  });

  it('đủ trần nhưng thêm lại cái đã có: vẫn thành công', async () => {
    const { service, tx } = setup({
      count: WISHLIST_MAX_ITEMS,
      existing: { id: 1 },
    });
    expect((await service.add(USER, PRODUCT)).added).toBe(false);
    expect(tx.wishlistItem.count).not.toHaveBeenCalled();
  });

  it('còn 99 mục thì thêm được mục thứ 100', async () => {
    const { service } = setup({ count: WISHLIST_MAX_ITEMS - 1 });
    expect((await service.add(USER, PRODUCT)).added).toBe(true);
  });

  it('sản phẩm không tồn tại hoặc đã tắt/hết biến thể bán → 404, không khóa, không ghi', async () => {
    const { service, tx } = setup({ product: null });
    await expect(service.add(USER, PRODUCT)).rejects.toThrow(
      new NotFoundException('Không tìm thấy sản phẩm'),
    );
    expect(tx.$queryRaw).not.toHaveBeenCalled();
    expect(tx.wishlistItem.create).not.toHaveBeenCalled();
  });

  it('P2034 được chạy lại rồi thành công', async () => {
    const { service, prisma } = setup();
    const real = prisma.$transaction.getMockImplementation()!;
    prisma.$transaction
      .mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('deadlock', {
          code: 'P2034',
          clientVersion: 'test',
        }),
      )
      .mockImplementation(real);
    expect((await service.add(USER, PRODUCT)).added).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });
});

describe('WishlistService.remove', () => {
  it('bỏ cái có: removed=true, chỉ xóa của chính user', async () => {
    const { service, prisma } = setup();
    prisma.wishlistItem.deleteMany.mockResolvedValue({ count: 1 });
    expect(await service.remove(USER, PRODUCT)).toEqual({
      productId: PRODUCT,
      removed: true,
    });
    expect(prisma.wishlistItem.deleteMany).toHaveBeenCalledWith({
      where: { userId: USER, productId: PRODUCT },
    });
  });

  it('bỏ cái không có: vẫn thành công, removed=false', async () => {
    const { service, prisma } = setup();
    prisma.wishlistItem.deleteMany.mockResolvedValue({ count: 0 });
    expect(await service.remove(USER, PRODUCT)).toEqual({
      productId: PRODUCT,
      removed: false,
    });
  });
});

describe('WishlistService.listIds', () => {
  it('trả mảng id mới thêm trước, giới hạn đúng trần', async () => {
    const { service, prisma } = setup();
    prisma.wishlistItem.findMany.mockResolvedValue([
      { productId: 5 },
      { productId: 3 },
    ]);
    expect(await service.listIds(USER)).toEqual([5, 3]);
    expect(prisma.wishlistItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: USER },
        take: WISHLIST_MAX_ITEMS,
      }),
    );
  });
});

describe('WishlistService.list', () => {
  const row = (
    isActive: boolean,
    stock: number,
    createdAt = new Date('2026-11-01T00:00:00Z'),
    hasActiveVariant = true,
  ) => ({
    createdAt,
    product: {
      id: 1,
      name: 'Áo',
      slug: 'ao',
      price: 100000,
      imageUrl: null,
      isActive,
      category: { id: 1, name: 'Áo', slug: 'ao' },
      images: [{ url: '/a.jpg' }],
      variants: hasActiveVariant
        ? [
            {
              color: 'Đen',
              colorHex: '#000000',
              stock,
              reserved: 0,
              minStock: 0,
            },
          ]
        : [],
    },
  });

  it('phân trang theo user, dùng shape thẻ công khai + addedAt + isAvailable', async () => {
    const { service, prisma } = setup();
    prisma.wishlistItem.findMany.mockResolvedValue([row(true, 5)]);
    prisma.wishlistItem.count.mockResolvedValue(25);
    const result = await service.list(USER, { page: 2, limit: 12 });
    expect(prisma.wishlistItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: USER },
        skip: 12,
        take: 12,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    );
    expect(result.meta).toEqual({
      page: 2,
      limit: 12,
      total: 25,
      totalPages: 3,
    });
    expect(result.data[0]).toMatchObject({
      id: 1,
      slug: 'ao',
      imageUrl: '/a.jpg',
      inStock: true,
      isAvailable: true,
      addedAt: new Date('2026-11-01T00:00:00Z'),
    });
    expect(result.data[0]).not.toHaveProperty('isActive');
  });

  it('sản phẩm đã tắt vẫn hiện nhưng isAvailable=false', async () => {
    const { service, prisma } = setup();
    prisma.wishlistItem.findMany.mockResolvedValue([row(false, 5)]);
    prisma.wishlistItem.count.mockResolvedValue(1);
    const { data } = await service.list(USER, { page: 1, limit: 12 });
    expect(data).toHaveLength(1);
    expect(data[0].isAvailable).toBe(false);
  });

  it('sản phẩm bật nhưng hết hàng: isAvailable=false', async () => {
    const { service, prisma } = setup();
    prisma.wishlistItem.findMany.mockResolvedValue([row(true, 0)]);
    prisma.wishlistItem.count.mockResolvedValue(1);
    const { data } = await service.list(USER, { page: 1, limit: 12 });
    expect(data[0]).toMatchObject({ inStock: false, isAvailable: false });
  });

  // Bảng chân trị isListed / inStock / isAvailable (docs/api/wishlist.md)
  it.each([
    ['bình thường', true, 5, true, true, true, true],
    ['tắt còn tồn', false, 5, true, false, true, false],
    ['bật nhưng hết hàng', true, 0, true, true, false, false],
    ['bật nhưng mọi biến thể bị ẩn', true, 5, false, false, false, false],
    ['tắt và hết hàng', false, 0, true, false, false, false],
  ])(
    '%s',
    async (
      _name,
      isActive,
      stock,
      hasVariant,
      isListed,
      inStock,
      isAvailable,
    ) => {
      const { service, prisma } = setup();
      prisma.wishlistItem.findMany.mockResolvedValue([
        row(isActive, stock, undefined, hasVariant),
      ]);
      prisma.wishlistItem.count.mockResolvedValue(1);
      const { data } = await service.list(USER, { page: 1, limit: 12 });
      expect(data).toHaveLength(1);
      expect(data[0]).toMatchObject({ isListed, inStock, isAvailable });
    },
  );
});
