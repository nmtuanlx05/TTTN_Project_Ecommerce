// Mock của Jest có kiểu any nên test đọc calls/giá trị trả về cần tắt các rule unsafe-* cho file này.
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import 'reflect-metadata';
import { HttpException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CartService } from '../cart/cart.service';
import { Prisma } from '../generated/prisma/client';
import { QueryMyOrdersDto } from './dto/query-orders.dto';
import { OrdersService } from './orders.service';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../inventory/inventory.service', () => ({
  InventoryService: class {},
}));

// Prisma giả có trạng thái trong bộ nhớ, MÔ PHỎNG (không phải MySQL thật): lọc/sắp xếp/phân trang đơn, groupBy,
// và giỏ + biến thể cho "mua lại". Khóa FOR UPDATE thật và đua nhiều request chưa được test trên MySQL.
const ME = 7;
const OTHER = 8;

interface OrderFake {
  id: number;
  code: string;
  userId: number;
  status: string;
  createdAt: Date;
  items: {
    variantId: number;
    productName: string;
    size: string;
    color: string;
    quantity: number;
    imageUrl: string | null;
  }[];
}

const item = (variantId: number, quantity = 1, name = 'Áo thun') => ({
  variantId,
  productName: name,
  size: 'M',
  color: 'Đen',
  quantity,
  imageUrl: `https://cdn/${variantId}.jpg`,
});

const order = (
  id: number,
  code: string,
  status: string,
  over: Partial<OrderFake> = {},
): OrderFake => ({
  id,
  code,
  userId: ME,
  status,
  createdAt: new Date(2026, 10, id),
  items: [item(1)],
  ...over,
});

interface VariantFake {
  stock: number;
  reserved: number;
  isActive: boolean;
  product: { isActive: boolean };
}
const sellable = (
  stock = 50,
  over: Partial<VariantFake> = {},
): VariantFake => ({
  stock,
  reserved: 0,
  isActive: true,
  product: { isActive: true },
  ...over,
});

function setup(
  opts: {
    orders?: OrderFake[];
    variants?: Record<number, VariantFake>;
    cart?: Record<number, number>; // variantId -> quantity
  } = {},
) {
  const orders = opts.orders ?? [];
  const variants = opts.variants ?? {};
  const cartItems = new Map<number, number>(
    Object.entries(opts.cart ?? {}).map(([k, v]) => [Number(k), v]),
  );
  let cartExists = Object.keys(opts.cart ?? {}).length > 0;

  const matches = (o: OrderFake, where: any) => {
    if (where.userId !== undefined && o.userId !== where.userId) return false;
    if (where.code !== undefined) {
      if (typeof where.code === 'string') {
        if (o.code !== where.code) return false;
      } else if (
        where.code.contains !== undefined &&
        !o.code.toLowerCase().includes(where.code.contains.toLowerCase())
      ) {
        return false; // DB dùng collation không phân biệt hoa thường
      }
    }
    if (where.status?.in && !where.status.in.includes(o.status)) return false;
    return true;
  };

  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: 70 }]),
    cart: {
      findUnique: jest.fn(() =>
        Promise.resolve(cartExists ? { id: 70 } : null),
      ),
      createMany: jest.fn(() => {
        cartExists = true;
        return Promise.resolve({ count: 1 });
      }),
    },
    productVariant: {
      findUnique: jest.fn(({ where }: any) =>
        Promise.resolve(variants[where.id] ?? null),
      ),
    },
    cartItem: {
      findUnique: jest.fn(({ where }: any) => {
        const quantity = cartItems.get(where.cartId_variantId.variantId);
        return Promise.resolve(
          quantity === undefined ? null : { id: 1, quantity },
        );
      }),
      create: jest.fn(({ data }: any) => {
        cartItems.set(data.variantId, data.quantity);
        return Promise.resolve({});
      }),
      update: jest.fn(({ data }: any) => {
        // dòng cập nhật luôn là dòng duy nhất khớp trong các ca test; tìm theo số lượng cũ không cần thiết
        updates.push(data.quantity);
        return Promise.resolve({});
      }),
    },
  };
  const updates: number[] = [];

  const prisma = {
    order: {
      findMany: jest.fn(({ where, orderBy, skip = 0, take }: any) => {
        const rows = orders
          .filter((o) => matches(o, where))
          .sort((a, b) => {
            const key = Object.keys(orderBy[0])[0] as 'createdAt';
            const dir = orderBy[0][key] === 'desc' ? -1 : 1;
            return (
              (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : a.id - b.id) * dir
            );
          });
        return Promise.resolve(rows.slice(skip, skip + take));
      }),
      count: jest.fn(({ where }: any) =>
        Promise.resolve(orders.filter((o) => matches(o, where)).length),
      ),
      groupBy: jest.fn(({ where }: any) => {
        const counts = new Map<string, number>();
        for (const o of orders.filter((o) => matches(o, where))) {
          counts.set(o.status, (counts.get(o.status) ?? 0) + 1);
        }
        return Promise.resolve(
          [...counts].map(([status, n]) => ({
            status,
            _count: { _all: n },
          })),
        );
      }),
      findFirst: jest.fn(({ where }: any) =>
        Promise.resolve(orders.find((o) => matches(o, where)) ?? null),
      ),
    },
    $transaction: jest.fn((arg: any) =>
      Array.isArray(arg) ? Promise.all(arg) : arg(tx),
    ),
  };
  const cart = new CartService(prisma as never);
  const service = new OrdersService(
    prisma as never,
    {} as never,
    {} as never,
    cart,
  );
  return { service, prisma, tx, cartItems, updates };
}

const query = (over: Record<string, unknown> = {}) =>
  ({ page: 1, limit: 10, sortBy: 'createdAt', order: 'desc', ...over }) as any;

async function thrown(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (e) {
    return e as HttpException;
  }
  throw new Error('Mong đợi lỗi nhưng không có');
}

describe('QueryMyOrdersDto: status nhiều giá trị và q', () => {
  const parse = async (plain: Record<string, unknown>) => {
    const dto = plainToInstance(QueryMyOrdersDto, plain);
    return { dto, errors: await validate(dto, { whitelist: true }) };
  };

  it('tách theo dấu phẩy, bỏ khoảng trắng/phần tử rỗng/giá trị lặp', async () => {
    const { dto, errors } = await parse({
      status: ' PENDING, CONFIRMED,,PENDING ',
    });
    expect(errors).toHaveLength(0);
    expect(dto.status).toEqual(['PENDING', 'CONFIRMED']);
  });

  it('một giá trị vẫn hợp lệ; không gửi thì để trống', async () => {
    expect((await parse({ status: 'SHIPPING' })).dto.status).toEqual([
      'SHIPPING',
    ]);
    expect((await parse({})).dto.status).toBeUndefined();
  });

  it('giá trị sai (kể cả lẫn trong nhóm) → lỗi tiếng Việt', async () => {
    for (const status of ['XYZ', 'PENDING,NOPE']) {
      const { errors } = await parse({ status });
      expect(errors).toHaveLength(1);
      expect(Object.values(errors[0].constraints!)[0]).toContain(
        'status chỉ nhận các giá trị',
      );
    }
  });

  it('q được trim; quá dài → lỗi', async () => {
    expect((await parse({ q: '  ms-26  ' })).dto.q).toBe('ms-26');
    const { errors } = await parse({ q: 'a'.repeat(51) });
    expect(errors).toHaveLength(1);
  });
});

describe('OrdersService.findMine (đơn hàng của tôi)', () => {
  const data = () => [
    order(1, 'MS-261101-AAAA', 'PENDING'),
    order(2, 'MS-261102-BBBB', 'CONFIRMED'),
    order(3, 'MS-261103-CCCC', 'SHIPPING'),
    order(4, 'MS-261104-DDDD', 'COMPLETED'),
    order(5, 'MS-261105-EEEE', 'PENDING', { userId: OTHER }),
  ];

  it('nhiều status → where status IN; chỉ đơn của mình, mới nhất trước', async () => {
    const { service, prisma } = setup({ orders: data() });
    const result = await service.findMine(
      ME,
      query({ status: ['CONFIRMED', 'SHIPPING'] }),
    );
    expect(prisma.order.findMany.mock.calls[0][0].where).toEqual({
      userId: ME,
      status: { in: ['CONFIRMED', 'SHIPPING'] },
    });
    expect(result.data.map((o: any) => o.code)).toEqual([
      'MS-261103-CCCC',
      'MS-261102-BBBB',
    ]);
    expect(result.meta.total).toBe(2);
  });

  it('status rỗng → không lọc trạng thái', async () => {
    const { service } = setup({ orders: data() });
    expect((await service.findMine(ME, query({ status: [] }))).meta.total).toBe(
      4,
    );
  });

  it('q khớp một phần, không phân biệt hoa thường', async () => {
    const { service } = setup({ orders: data() });
    const result = await service.findMine(ME, query({ q: 'ccc' }));
    expect(result.data.map((o: any) => o.code)).toEqual(['MS-261103-CCCC']);
    const part = await service.findMine(ME, query({ q: 'ms-2611' }));
    expect(part.meta.total).toBe(4);
  });

  it('q không lộ đơn của người khác', async () => {
    const { service } = setup({ orders: data() });
    const result = await service.findMine(ME, query({ q: 'EEEE' }));
    expect(result.data).toEqual([]);
    expect(result.meta.total).toBe(0);
  });

  it('kết hợp status + q', async () => {
    const { service } = setup({ orders: data() });
    const result = await service.findMine(
      ME,
      query({ status: ['PENDING'], q: 'MS-26' }),
    );
    expect(result.data.map((o: any) => o.code)).toEqual(['MS-261101-AAAA']);
  });

  it('mỗi phần tử có itemCount = tổng số lượng và items[] đủ trường, một truy vấn có select', async () => {
    const { service, prisma } = setup({
      orders: [
        order(1, 'MS-261101-AAAA', 'PENDING', {
          items: [item(1, 2, 'Áo A'), item(2, 3, 'Quần B')],
        }),
      ],
    });
    const result = await service.findMine(ME, query());
    expect(result.data[0].itemCount).toBe(5);
    expect(result.data[0].items[0]).toEqual({
      productName: 'Áo A',
      imageUrl: 'https://cdn/1.jpg',
      quantity: 2,
      size: 'M',
      color: 'Đen',
      variantId: 1, // fake trả nguyên dòng; select thật được kiểm ở dưới
    });
    const select = prisma.order.findMany.mock.calls[0][0].select;
    expect(Object.keys(select).sort()).toEqual(
      [
        'code',
        'createdAt',
        'id',
        'items',
        'paymentMethod',
        'paymentStatus',
        'status',
        'totalAmount',
      ].sort(),
    );
    expect(Object.keys(select.items.select).sort()).toEqual(
      ['color', 'imageUrl', 'productName', 'quantity', 'size'].sort(),
    );
    expect(prisma.order.findMany).toHaveBeenCalledTimes(1);
  });

  it('phân trang: skip/take và meta', async () => {
    const { service } = setup({ orders: data() });
    const result = await service.findMine(ME, query({ page: 2, limit: 3 }));
    expect(result.data.map((o: any) => o.id)).toEqual([1]);
    expect(result.meta).toEqual({ page: 2, limit: 3, total: 4, totalPages: 2 });
  });
});

describe('OrdersService.summaryMine', () => {
  it('đếm đúng từng nhóm bằng một groupBy, chỉ đơn của mình', async () => {
    const statuses = [
      ['PENDING', 2],
      ['PENDING_PAYMENT', 1],
      ['CONFIRMED', 1],
      ['PACKING', 2],
      ['SHIPPING', 1],
      ['COMPLETED', 4],
      ['CANCELLED', 3],
    ] as const;
    let id = 0;
    const orders = statuses.flatMap(([status, n]) =>
      Array.from({ length: n }, () => order(++id, `MS-${id}`, status)),
    );
    orders.push(order(++id, 'MS-OTHER', 'PENDING', { userId: OTHER }));
    const { service, prisma } = setup({ orders });

    expect(await service.summaryMine(ME)).toEqual({
      total: 14,
      pending: 3,
      processing: 4,
      completed: 4,
      cancelled: 3,
      active: 7,
    });
    expect(prisma.order.groupBy).toHaveBeenCalledTimes(1);
    expect(prisma.order.groupBy.mock.calls[0][0].where).toEqual({ userId: ME });
  });

  it('chưa có đơn → toàn số 0', async () => {
    const { service } = setup();
    expect(await service.summaryMine(ME)).toEqual({
      total: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      cancelled: 0,
      active: 0,
    });
  });
});

describe('OrdersService.reorderMine', () => {
  const mine = (items: OrderFake['items']) =>
    order(1, 'MS-261101-AAAA', 'COMPLETED', { items });

  it('thêm đủ: giỏ trống → tạo dòng, skipped rỗng', async () => {
    const { service, cartItems } = setup({
      orders: [mine([item(1, 2), item(2, 1)])],
      variants: { 1: sellable(), 2: sellable() },
    });
    expect(await service.reorderMine(ME, 'MS-261101-AAAA')).toEqual({
      added: 2,
      skipped: [],
    });
    expect(cartItems.get(1)).toBe(2);
    expect(cartItems.get(2)).toBe(1);
  });

  it('thêm một phần: dòng hết hàng/ngừng bán nằm trong skipped kèm reason + thông báo tiếng Việt', async () => {
    const { service, cartItems } = setup({
      orders: [
        mine([
          item(1, 1, 'Áo còn'),
          item(2, 1, 'Áo hết'),
          item(3, 1, 'Áo ẩn'),
          item(4, 1, 'Áo đã xóa'),
        ]),
      ],
      variants: {
        1: sellable(),
        2: sellable(5, { reserved: 5 }),
        3: sellable(50, { isActive: false }),
      },
    });
    const result = await service.reorderMine(ME, 'MS-261101-AAAA');
    expect(result.added).toBe(1);
    expect(result.skipped.map((s) => [s.productName, s.reason])).toEqual([
      ['Áo hết', 'OUT_OF_STOCK'],
      ['Áo ẩn', 'UNAVAILABLE'],
      ['Áo đã xóa', 'UNAVAILABLE'],
    ]);
    expect(result.skipped[0]).toEqual(
      expect.objectContaining({
        size: 'M',
        color: 'Đen',
        message: 'Áo hết (M, Đen) đã hết hàng',
      }),
    );
    expect([...cartItems.keys()]).toEqual([1]);
  });

  it('tồn khả dụng = stock - reserved: thiếu hàng → thêm tối đa số còn, QUANTITY_REDUCED', async () => {
    const { service, cartItems } = setup({
      orders: [mine([item(1, 5)])],
      variants: { 1: sellable(10, { reserved: 7 }) }, // còn 3
    });
    const result = await service.reorderMine(ME, 'MS-261101-AAAA');
    expect(cartItems.get(1)).toBe(3);
    expect(result.added).toBe(1);
    expect(result.skipped).toEqual([
      expect.objectContaining({ reason: 'QUANTITY_REDUCED' }),
    ]);
    expect(result.skipped[0].message).toContain('3/5');
  });

  it('vượt 10 tính cả số đang có trong giỏ: cộng dồn rồi giảm về 10', async () => {
    const { service, updates } = setup({
      orders: [mine([item(1, 6)])],
      variants: { 1: sellable(100) },
      cart: { 1: 7 },
    });
    const result = await service.reorderMine(ME, 'MS-261101-AAAA');
    expect(updates).toEqual([10]);
    expect(result.added).toBe(1);
    expect(result.skipped).toEqual([
      expect.objectContaining({ reason: 'QUANTITY_REDUCED' }),
    ]);
  });

  it('giỏ đã đủ 10 và đó là dòng duy nhất → 409 REORDER_NOTHING_ADDED, không ghi gì', async () => {
    const { service, tx } = setup({
      orders: [mine([item(1, 2)])],
      variants: { 1: sellable(100) },
      cart: { 1: 10 },
    });
    const error = await thrown(service.reorderMine(ME, 'MS-261101-AAAA'));
    expect(error.getStatus()).toBe(409);
    expect(error.getResponse()).toEqual(
      expect.objectContaining({
        code: 'REORDER_NOTHING_ADDED',
        errors: [
          expect.objectContaining({
            field: 'items.0',
            message: expect.stringContaining('tối đa'),
          }),
        ],
      }),
    );
    expect(tx.cartItem.update).not.toHaveBeenCalled();
    expect(tx.cartItem.create).not.toHaveBeenCalled();
  });

  it('không dòng nào thêm được (hết hàng hết) → 409 REORDER_NOTHING_ADDED', async () => {
    const { service } = setup({
      orders: [mine([item(1), item(2)])],
      variants: { 1: sellable(0), 2: sellable(50, { isActive: false }) },
    });
    const error = await thrown(service.reorderMine(ME, 'MS-261101-AAAA'));
    expect(error.getStatus()).toBe(409);
    expect((error.getResponse() as any).code).toBe('REORDER_NOTHING_ADDED');
    expect((error.getResponse() as any).errors).toHaveLength(2);
  });

  it('đơn của người khác hoặc không tồn tại → 404 ORDER_NOT_FOUND, giỏ không bị chạm', async () => {
    const { service, tx } = setup({
      orders: [mine([item(1)])],
      variants: { 1: sellable() },
    });
    for (const code of ['MS-261101-AAAA', 'MS-NOPE']) {
      const who = code === 'MS-NOPE' ? ME : OTHER;
      const error = await thrown(service.reorderMine(who, code));
      expect(error.getStatus()).toBe(404);
      expect((error.getResponse() as any).code).toBe('ORDER_NOT_FOUND');
    }
    expect(tx.$queryRaw).not.toHaveBeenCalled();
  });

  it('khóa giỏ trong transaction; gặp P2034 thì chạy lại như giỏ hàng', async () => {
    const { service, prisma, tx, cartItems } = setup({
      orders: [mine([item(1)])],
      variants: { 1: sellable() },
    });
    const real = prisma.$transaction.getMockImplementation()!;
    prisma.$transaction.mockImplementationOnce(() =>
      Promise.reject(
        new Prisma.PrismaClientKnownRequestError('deadlock', {
          code: 'P2034',
          clientVersion: 'x',
        }),
      ),
    );
    prisma.$transaction.mockImplementation(real);
    expect(await service.reorderMine(ME, 'MS-261101-AAAA')).toEqual({
      added: 1,
      skipped: [],
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(tx.$queryRaw.mock.calls[0][0].sql).toContain('FOR UPDATE');
    expect(cartItems.get(1)).toBe(1);
  });
});
