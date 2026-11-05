// Mock của Jest có kiểu any nên test đọc calls/giá trị trả về cần tắt các rule unsafe-* cho file này.
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
import { HttpException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { DiscountType, OrderStatus } from '../generated/prisma/enums';
import { LOCATION_INDEX } from '../locations/locations.data';
import { LocationsService } from '../locations/locations.service';
import type { AuthUser } from '../auth/auth.types';
import { OrderWorkflowService } from './order-workflow.service';
import { OrdersService } from './orders.service';
import type { CreateOrderDto } from './dto/create-order.dto';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../inventory/inventory.service', () => ({
  InventoryService: class {},
}));

// Prisma giả có trạng thái trong bộ nhớ, MÔ PHỎNG: transaction chạy lần lượt (như khóa giỏ) và rollback khi có lỗi.
// Khóa FOR UPDATE, UPDATE có điều kiện và đua thật trên MySQL chưa được test tự động; test này kiểm logic và thứ tự câu lệnh.

const USER: AuthUser = {
  id: 7,
  email: 'khach@example.com',
  name: 'Khách',
  phone: null,
  avatarUrl: null,
  role: 'CUSTOMER',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};
const NOW_OK = new Date('2026-12-06T03:00:00.000Z');

const province = LOCATION_INDEX.provinces[0];
const district = province.districts.find((d) => d.wards.length > 0)!;
const ward = district.wards[0];
const islandDistrict = LOCATION_INDEX.districtByCode.get('536')!; // Lý Sơn: không có phường/xã

const dto = (over: Partial<CreateOrderDto> = {}): CreateOrderDto => ({
  receiverName: 'Nguyễn Văn A',
  phone: '0912345678',
  provinceCode: province.code,
  districtCode: district.code,
  wardCode: ward.code,
  addressLine: '12 Lê Lợi',
  note: null,
  paymentMethod: 'COD',
  voucherCode: null,
  ...over,
});

interface VariantFake {
  stock: number;
  reserved: number;
  isActive: boolean;
  sku: string;
  size: string;
  color: string;
  colorHex: string | null;
  product: {
    name: string;
    price: number;
    isActive: boolean;
    imageUrl: string | null;
    images: { url: string }[];
  };
}

const variant = (
  over: Partial<VariantFake> = {},
  price = 200_000,
): VariantFake => ({
  stock: 10,
  reserved: 0,
  isActive: true,
  sku: 'SKU',
  size: 'M',
  color: 'Đen',
  colorHex: '#000000',
  product: {
    name: 'Áo thun',
    price,
    isActive: true,
    imageUrl: 'https://old/deprecated.jpg',
    images: [{ url: 'https://cdn/real-first.jpg' }],
  },
  ...over,
});

const voucherRow = (over: Record<string, unknown> = {}) => ({
  id: 9,
  code: 'SALE10',
  description: 'Giảm 10%',
  discountType: DiscountType.PERCENT,
  discountValue: 10,
  maxDiscount: null,
  minOrderValue: 0,
  usageLimit: 100,
  usedCount: 0,
  startsAt: new Date('2026-11-01T00:00:00.000Z'),
  expiresAt: new Date('2027-01-31T00:00:00.000Z'),
  isActive: true,
  ...over,
});

interface Setup {
  cartItems?: { id: number; variantId: number; quantity: number }[];
  variants?: Record<number, VariantFake>;
  voucher?: ReturnType<typeof voucherRow> | null;
  hasCart?: boolean;
}

function setup(opts: Setup = {}) {
  const db = {
    cartItems: opts.cartItems ?? [
      { id: 1, variantId: 5, quantity: 1 },
      { id: 2, variantId: 3, quantity: 2 },
    ],
    variants: opts.variants ?? {
      3: variant({ sku: 'A-3' }, 200_000),
      5: variant({ sku: 'A-5', size: 'L' }, 300_000),
    },
    voucher: opts.voucher === undefined ? null : opts.voucher,
    orders: [] as any[],
    hasCart: opts.hasCart ?? true,
  };
  const log: string[] = [];
  let voucherAffectedOverride: number | null = null;
  const reserveFailsFor = new Set<number>();
  let nextOrderId = 1;
  let createFailures: unknown[] = [];

  const tx = {
    $queryRaw: jest.fn((sql: any) => {
      const text: string = sql.sql;
      if (text.includes('FROM carts')) {
        log.push('lock:cart');
        return Promise.resolve(db.hasCart ? [{ id: 10 }] : []);
      }
      if (text.includes('FROM product_variants')) {
        log.push('lock:variants');
        const ids = [...sql.values].sort((a: number, b: number) => a - b);
        return Promise.resolve(
          ids
            .filter((id: number) => db.variants[id])
            .map((id: number) => ({
              id,
              stock: db.variants[id].stock,
              reserved: db.variants[id].reserved,
              isActive: db.variants[id].isActive ? 1 : 0,
            })),
        );
      }
      if (text.includes('FROM vouchers')) {
        log.push('lock:voucher');
        return Promise.resolve(db.voucher ? [{ id: db.voucher.id }] : []);
      }
      throw new Error(`SQL đọc không mong đợi: ${text}`);
    }),
    $executeRaw: jest.fn((sql: any) => {
      const text: string = sql.sql;
      if (text.includes('UPDATE vouchers')) {
        log.push('update:voucher');
        const affected =
          voucherAffectedOverride ??
          (db.voucher &&
          (db.voucher.usageLimit === null ||
            db.voucher.usedCount < db.voucher.usageLimit)
            ? 1
            : 0);
        if (affected === 1 && db.voucher) db.voucher.usedCount += 1;
        return Promise.resolve(affected);
      }
      if (text.includes('reserved = reserved + ?')) {
        const [qty, id] = sql.values as number[];
        log.push(`reserve:${id}`);
        const v = db.variants[id];
        if (!reserveFailsFor.has(id) && v.stock - v.reserved >= qty) {
          v.reserved += qty;
          return Promise.resolve(1);
        }
        return Promise.resolve(0);
      }
      throw new Error(`SQL ghi không mong đợi: ${text}`);
    }),
    cartItem: {
      findMany: jest.fn(() =>
        Promise.resolve(
          [...db.cartItems].sort((a, b) => a.variantId - b.variantId),
        ),
      ),
      deleteMany: jest.fn(() => {
        log.push('cart:clear');
        db.cartItems = [];
        return Promise.resolve({ count: 1 });
      }),
    },
    productVariant: {
      findMany: jest.fn((args: any) =>
        Promise.resolve(
          (args.where.id.in as number[])
            .filter((id) => db.variants[id])
            .map((id) => ({ id, ...db.variants[id] })),
        ),
      ),
    },
    voucher: { findUnique: jest.fn(() => Promise.resolve(db.voucher)) },
    order: {
      findFirst: jest.fn((args: any) =>
        Promise.resolve(
          db.orders.find(
            (o) =>
              o.userId === args.where.userId &&
              o.idempotencyKey === args.where.idempotencyKey,
          ) ?? null,
        ),
      ),
      create: jest.fn((args: any) => {
        log.push('order:create');
        if (createFailures.length)
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          return Promise.reject(createFailures.shift());
        const d = args.data;
        const row = {
          ...d,
          id: nextOrderId++,
          paidAt: null,
          cancelReason: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          items: d.items.create.map((i: any) => ({ ...i })),
          statusHistories: [
            {
              ...d.statusHistories.create,
              createdAt: new Date(),
              actor: { id: USER.id, name: 'Khách', role: 'CUSTOMER' },
            },
          ],
        };
        db.orders.push(row);
        return Promise.resolve(row);
      }),
    },
  };

  const snapshot = () => structuredClone(db);
  let queue: Promise<unknown> = Promise.resolve();
  let txFailuresBeforeSuccess = 0;
  const prisma = {
    $transaction: jest.fn((fn: any, options?: any) => {
      const run = async () => {
        if (txFailuresBeforeSuccess > 0) {
          txFailuresBeforeSuccess--;
          throw new Prisma.PrismaClientKnownRequestError('conflict', {
            code: 'P2034',
            clientVersion: 'test',
          });
        }
        const before = snapshot();
        try {
          return await fn(tx, options);
        } catch (error) {
          Object.assign(db, before); // rollback
          throw error;
        }
      };
      const result = queue.then(run);
      queue = result.catch(() => undefined);
      return result;
    }),
    cart: { findUnique: jest.fn() },
    voucher: { findUnique: jest.fn() },
    order: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const locations = new LocationsService();
  const workflow = { transition: jest.fn() } as unknown as OrderWorkflowService;
  const service = new OrdersService(prisma as never, locations, workflow);
  return {
    service,
    prisma,
    tx,
    db,
    log,
    workflow: workflow as unknown as { transition: jest.Mock },
    failTx: (n: number) => (txFailuresBeforeSuccess = n),
    failOrderCreate: (...errors: unknown[]) => (createFailures = errors),
    forceVoucherAffected: (n: number) => (voucherAffectedOverride = n),
    failReserveFor: (id: number) => reserveFailsFor.add(id),
  };
}

async function errorOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    const ex = error as HttpException;
    const body = ex.getResponse() as any;
    return { status: ex.getStatus(), ...body };
  }
  throw new Error('Kỳ vọng ném lỗi');
}

describe('OrdersService.create', () => {
  beforeEach(() => {
    jest.useFakeTimers({
      now: NOW_OK,
      doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'],
    });
  });
  afterEach(() => jest.useRealTimers());

  it('đặt đơn thành công: tính tiền ở backend, chụp snapshot, giữ chỗ, xóa giỏ, ghi lịch sử', async () => {
    const { service, db, tx } = setup();
    const order = await service.create(USER, dto());

    // 300.000 × 1 + 200.000 × 2 = 700.000, miễn phí vận chuyển
    expect(order).toMatchObject({
      status: 'PENDING',
      paymentMethod: 'COD',
      paymentStatus: 'UNPAID',
      subtotal: 700_000,
      discountAmount: 0,
      voucherCode: null,
      shippingFee: 0,
      totalAmount: 700_000,
    });
    expect(order.code).toMatch(/^MS-261206-[A-HJ-NP-Z2-9]{4}$/);

    // Giữ chỗ
    expect(db.variants[3].reserved).toBe(2);
    expect(db.variants[5].reserved).toBe(1);
    // Giỏ đã xóa
    expect(db.cartItems).toEqual([]);
    expect(tx.cartItem.deleteMany).toHaveBeenCalledWith({
      where: { cartId: 10 },
    });

    // Snapshot dòng: ảnh chụp ĐÚNG product_images.url (không phải cột imageUrl cũ)
    const items = order.items;
    expect(items.map((i: any) => i.sku)).toEqual(['A-3', 'A-5']);
    expect(items[0]).toMatchObject({
      productName: 'Áo thun',
      size: 'M',
      color: 'Đen',
      colorHex: '#000000',
      imageUrl: 'https://cdn/real-first.jpg',
      quantity: 2,
      price: 200_000,
      lineTotal: 400_000,
    });
    // Lịch sử đầu tiên
    expect(order.history).toEqual([
      expect.objectContaining({
        fromStatus: null,
        toStatus: 'PENDING',
        byRole: 'CUSTOMER',
      }),
    ]);
    // Không lộ stock/reserved/password
    const json = JSON.stringify(order);
    expect(json).not.toMatch(/"stock"|"reserved"|password/);
  });

  it('lưu đủ mã và tên từng cấp, người nhận, số điện thoại, địa chỉ ghép', async () => {
    const { service, db } = setup();
    await service.create(USER, dto({ note: 'Giao giờ hành chính' }));

    expect(db.orders[0]).toMatchObject({
      userId: 7,
      customerName: 'Nguyễn Văn A',
      customerPhone: '0912345678',
      customerEmail: 'khach@example.com',
      provinceCode: province.code,
      provinceName: province.name,
      districtCode: district.code,
      districtName: district.name,
      wardCode: ward.code,
      wardName: ward.name,
      addressLine: '12 Lê Lợi',
      note: 'Giao giờ hành chính',
      shippingAddress: `12 Lê Lợi, ${ward.name}, ${district.name}, ${province.name}`,
    });
  });

  it('chụp ảnh dự phòng từ cột cũ khi sản phẩm chưa có dòng ProductImage', async () => {
    const { service, db } = setup({
      cartItems: [{ id: 1, variantId: 3, quantity: 1 }],
      variants: {
        3: variant({
          product: {
            name: 'A',
            price: 100_000,
            isActive: true,
            imageUrl: 'https://old/x.jpg',
            images: [],
          },
        }),
      },
    });
    await service.create(USER, dto());
    expect(db.orders[0].items[0].imageUrl).toBe('https://old/x.jpg');
  });

  describe('địa chỉ', () => {
    it('huyện không có phường/xã: bỏ trống wardCode → lưu ward NULL, chuỗi ghép bỏ phường/xã', async () => {
      const { service, db } = setup();
      await service.create(
        USER,
        dto({
          provinceCode: islandDistrict.provinceCode,
          districtCode: islandDistrict.code,
          wardCode: null,
        }),
      );
      expect(db.orders[0]).toMatchObject({ wardCode: null, wardName: null });
      expect(db.orders[0].shippingAddress).toBe(
        `12 Lê Lợi, ${islandDistrict.name}, ${LOCATION_INDEX.provinceByCode.get(islandDistrict.provinceCode)!.name}`,
      );
    });

    it('huyện không có phường/xã mà gửi wardCode → 400 WARD_NOT_ALLOWED', async () => {
      const { service, prisma } = setup();
      const e = await errorOf(
        service.create(
          USER,
          dto({
            provinceCode: islandDistrict.provinceCode,
            districtCode: islandDistrict.code,
            wardCode: ward.code,
          }),
        ),
      );
      expect(e).toMatchObject({ status: 400, code: 'WARD_NOT_ALLOWED' });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it.each([
      [
        'phường không thuộc quận',
        {
          wardCode: LOCATION_INDEX.provinces[1].districts.find(
            (d) => d.wards.length,
          )!.wards[0].code,
        },
        'WARD_NOT_IN_DISTRICT',
      ],
      [
        'quận không thuộc tỉnh',
        { provinceCode: LOCATION_INDEX.provinces[1].code },
        'DISTRICT_NOT_IN_PROVINCE',
      ],
      [
        'mã tỉnh không tồn tại',
        { provinceCode: '99999' },
        'PROVINCE_NOT_FOUND',
      ],
      [
        'mã quận không tồn tại',
        { districtCode: '99999' },
        'DISTRICT_NOT_FOUND',
      ],
      ['mã phường không tồn tại', { wardCode: '99999' }, 'WARD_NOT_FOUND'],
      [
        'thiếu phường/xã khi huyện có phường/xã',
        { wardCode: null },
        'WARD_REQUIRED',
      ],
    ])(
      '%s → 400, không mở transaction, không đổi tồn',
      async (_label, over, code) => {
        const { service, prisma, db } = setup();
        const e = await errorOf(service.create(USER, dto(over)));
        expect(e.status).toBe(400);
        expect(e.code).toBe(code);
        expect(typeof e.message).toBe('string');
        expect(prisma.$transaction).not.toHaveBeenCalled();
        expect(db.variants[3].reserved).toBe(0);
        expect(db.orders).toHaveLength(0);
      },
    );
  });

  describe('thanh toán', () => {
    it('ONLINE → 400 "Chưa hỗ trợ thanh toán online", không mở transaction', async () => {
      const { service, prisma } = setup();
      const e = await errorOf(
        service.create(USER, dto({ paymentMethod: 'ONLINE' })),
      );
      expect(e).toMatchObject({
        status: 400,
        code: 'PAYMENT_METHOD_NOT_SUPPORTED',
        message: 'Chưa hỗ trợ thanh toán online',
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('giỏ hàng', () => {
    it('chưa có giỏ → 409 CART_EMPTY', async () => {
      const { service } = setup({ hasCart: false });
      expect(await errorOf(service.create(USER, dto()))).toMatchObject({
        status: 409,
        code: 'CART_EMPTY',
      });
    });

    it('giỏ rỗng → 409 CART_EMPTY, không tạo đơn', async () => {
      const { service, db } = setup({ cartItems: [] });
      expect((await errorOf(service.create(USER, dto()))).code).toBe(
        'CART_EMPTY',
      );
      expect(db.orders).toHaveLength(0);
    });

    it('dòng không mua được: nói rõ từng dòng, không đổi giỏ, không giữ chỗ, không tạo đơn', async () => {
      const { service, db } = setup({
        cartItems: [
          { id: 1, variantId: 3, quantity: 1 }, // biến thể ẩn
          { id: 2, variantId: 5, quantity: 1 }, // hết hàng
          { id: 3, variantId: 8, quantity: 4 }, // vượt hàng còn
          { id: 4, variantId: 9, quantity: 1 }, // sản phẩm ẩn
          { id: 5, variantId: 11, quantity: 1 }, // đặt được
        ],
        variants: {
          3: variant({ isActive: false }),
          5: variant({ stock: 4, reserved: 4 }),
          8: variant({ stock: 5, reserved: 2 }),
          9: variant({
            product: {
              name: 'Quần',
              price: 1,
              isActive: false,
              imageUrl: null,
              images: [],
            },
          }),
          11: variant(),
        },
      });
      const e = await errorOf(service.create(USER, dto()));

      expect(e.status).toBe(409);
      expect(e.code).toBe('CART_ITEMS_UNAVAILABLE');
      expect(e.errors.map((x: any) => x.field)).toEqual([
        'items.1',
        'items.2',
        'items.3',
        'items.4',
      ]);
      expect(e.errors[0].message).toContain('không còn được bán');
      expect(e.errors[0].message).toContain('xóa khỏi giỏ');
      expect(e.errors[1].message).toContain('đã hết hàng');
      expect(e.errors[2].message).toContain('chỉ còn 3');
      expect(e.errors[2].message).toContain('giảm số lượng');
      // Không tự đổi giỏ, không giữ chỗ, không tạo đơn
      expect(db.cartItems).toHaveLength(5);
      expect(db.variants[11].reserved).toBe(0);
      expect(db.orders).toHaveLength(0);
    });

    it('hết hàng giữa chừng (tồn bị lấy trước khi khóa): 409, không giữ chỗ dòng nào', async () => {
      const { service, db } = setup({
        cartItems: [
          { id: 1, variantId: 3, quantity: 2 },
          { id: 2, variantId: 5, quantity: 1 },
        ],
        // Biến thể 5 chỉ còn khả dụng 0 sau khi người khác đặt trước
        variants: { 3: variant(), 5: variant({ stock: 3, reserved: 3 }) },
      });
      const e = await errorOf(service.create(USER, dto()));
      expect(e.code).toBe('CART_ITEMS_UNAVAILABLE');
      expect(db.variants[3].reserved).toBe(0);
      expect(db.orders).toHaveLength(0);
      expect(db.cartItems).toHaveLength(2);
    });

    it('UPDATE giữ chỗ ảnh hưởng 0 dòng (đua sát giờ) → 409 và rollback toàn bộ, kể cả lượt voucher và giữ chỗ dòng trước', async () => {
      const { service, db, log, failReserveFor } = setup({
        cartItems: [
          { id: 1, variantId: 3, quantity: 1 },
          { id: 2, variantId: 5, quantity: 1 },
        ],
        voucher: voucherRow(),
      });
      failReserveFor(5);
      const e = await errorOf(
        service.create(USER, dto({ voucherCode: 'sale10' })),
      );

      expect(e.status).toBe(409);
      expect(e.code).toBe('CART_ITEMS_UNAVAILABLE');
      // Đã tăng lượt và giữ chỗ biến thể 3 trước khi thất bại ở biến thể 5, nhưng rollback trả lại hết
      expect(log).toEqual(
        expect.arrayContaining(['update:voucher', 'reserve:3', 'reserve:5']),
      );
      expect(db.voucher!.usedCount).toBe(0);
      expect(db.variants[3].reserved).toBe(0);
      expect(db.orders).toHaveLength(0);
      expect(db.cartItems).toHaveLength(2);
    });
  });

  describe('phí vận chuyển và tiền', () => {
    const one = (price: number, voucher?: ReturnType<typeof voucherRow>) =>
      setup({
        cartItems: [{ id: 1, variantId: 3, quantity: 1 }],
        variants: { 3: variant({}, price) },
        voucher: voucher ?? null,
      });

    it('499.999 → phí 30.000, tổng 529.999', async () => {
      const { service } = one(499_999);
      expect(await service.create(USER, dto())).toMatchObject({
        subtotal: 499_999,
        shippingFee: 30_000,
        totalAmount: 529_999,
      });
    });

    it('500.000 → miễn phí, tổng 500.000', async () => {
      const { service } = one(500_000);
      expect(await service.create(USER, dto())).toMatchObject({
        shippingFee: 0,
        totalAmount: 500_000,
      });
    });

    it('voucher làm tạmTính tụt dưới 500.000 vẫn miễn phí vận chuyển', async () => {
      const { service } = one(
        520_000,
        voucherRow({
          discountType: DiscountType.FIXED,
          discountValue: 100_000,
        }),
      );
      expect(
        await service.create(USER, dto({ voucherCode: 'SALE10' })),
      ).toMatchObject({
        subtotal: 520_000,
        discountAmount: 100_000,
        shippingFee: 0,
        totalAmount: 420_000,
        voucherCode: 'SALE10',
      });
    });

    it('tổng = 0: voucher FIXED >= tạmTính và tạmTính >= 500.000 là đơn hợp lệ', async () => {
      const { service, db } = one(
        500_000,
        voucherRow({
          discountType: DiscountType.FIXED,
          discountValue: 800_000,
        }),
      );
      expect(
        await service.create(USER, dto({ voucherCode: 'SALE10' })),
      ).toMatchObject({
        discountAmount: 500_000,
        shippingFee: 0,
        totalAmount: 0,
      });
      expect(db.orders).toHaveLength(1);
    });

    it('client không ảnh hưởng được giá: tiền luôn lấy từ giá hiện tại của sản phẩm', async () => {
      const { service } = one(250_000);
      const order = await service.create(USER, {
        ...dto(),
        totalAmount: 1,
        subtotal: 1,
        shippingFee: 0,
      } as never);
      expect(order.subtotal).toBe(250_000);
      expect(order.totalAmount).toBe(280_000);
    });
  });

  describe('voucher khi đặt đơn', () => {
    const cases: [string, ReturnType<typeof voucherRow> | null, string][] = [
      ['không tồn tại', null, 'VOUCHER_NOT_FOUND'],
      ['đã tắt', voucherRow({ isActive: false }), 'VOUCHER_INACTIVE'],
      [
        'chưa đến hạn',
        voucherRow({ startsAt: new Date('2027-01-01T00:00:00Z') }),
        'VOUCHER_NOT_STARTED',
      ],
      [
        'hết hạn',
        voucherRow({ expiresAt: new Date('2026-12-01T00:00:00Z') }),
        'VOUCHER_EXPIRED',
      ],
      [
        'chưa đủ đơn tối thiểu',
        voucherRow({ minOrderValue: 700_001 }),
        'VOUCHER_MIN_ORDER',
      ],
      [
        'hết lượt',
        voucherRow({ usageLimit: 3, usedCount: 3 }),
        'VOUCHER_USAGE_LIMIT',
      ],
    ];

    it.each(cases)(
      '%s → 400 %s, không tạo đơn, không trừ tồn, không giữ chỗ',
      async (_l, voucher, code) => {
        const { service, db } = setup({ voucher });
        const e = await errorOf(
          service.create(USER, dto({ voucherCode: 'SALE10' })),
        );
        expect(e.status).toBe(400);
        expect(e.code).toBe(code);
        expect(db.orders).toHaveLength(0);
        expect(db.variants[3].reserved).toBe(0);
        expect(db.variants[5].reserved).toBe(0);
        expect(db.cartItems).toHaveLength(2);
      },
    );

    it('minOrderValue ở ranh giới: đúng bằng tạmTính thì hợp lệ', async () => {
      const { service } = setup({
        voucher: voucherRow({ minOrderValue: 700_000 }),
      });
      await expect(
        service.create(USER, dto({ voucherCode: 'SALE10' })),
      ).resolves.toBeDefined();
    });

    it('PERCENT 10% đúng, tăng usedCount đúng một lượt và lưu voucherId + voucherCode', async () => {
      const { service, db } = setup({ voucher: voucherRow() });
      const order = await service.create(
        USER,
        dto({ voucherCode: '  sale10 ' }),
      );
      expect(order.discountAmount).toBe(70_000);
      expect(order.voucherCode).toBe('SALE10');
      expect(db.voucher!.usedCount).toBe(1);
      expect(db.orders[0].voucherId).toBe(9);
    });

    it('lượt cuối bị người khác lấy trước (UPDATE ảnh hưởng 0 dòng): 400 hết lượt, rollback sạch', async () => {
      const { service, db, forceVoucherAffected } = setup({
        voucher: voucherRow({ usageLimit: 1, usedCount: 0 }),
      });
      forceVoucherAffected(0);
      const e = await errorOf(
        service.create(USER, dto({ voucherCode: 'SALE10' })),
      );
      expect(e.code).toBe('VOUCHER_USAGE_LIMIT');
      expect(db.orders).toHaveLength(0);
      expect(db.variants[3].reserved).toBe(0);
      expect(db.variants[5].reserved).toBe(0);
      expect(db.cartItems).toHaveLength(2);
      expect(db.voucher!.usedCount).toBe(0);
    });

    it('UPDATE tăng lượt là truy vấn tham số hóa có điều kiện hiệu lực/lượt/đơn tối thiểu', async () => {
      const { service, tx } = setup({ voucher: voucherRow() });
      await service.create(USER, dto({ voucherCode: 'SALE10' }));
      const call = tx.$executeRaw.mock.calls.find((c) =>
        c[0].sql.includes('UPDATE vouchers'),
      )!;
      const sql = call[0];
      expect(sql.sql).toContain('usedCount = usedCount + 1');
      expect(sql.sql).toContain('isActive = 1');
      expect(sql.sql).toContain('startsAt <= ?');
      expect(sql.sql).toContain('expiresAt >= ?');
      expect(sql.sql).toContain('minOrderValue <= ?');
      expect(sql.sql).toContain('usageLimit IS NULL OR usedCount < usageLimit');
      expect(sql.values[0]).toBe(9);
      expect(sql.values[1]).toEqual(NOW_OK);
      // Mã voucher đi vào truy vấn thô dưới dạng tham số, không ghép chuỗi
      const lockCall = tx.$queryRaw.mock.calls.find((c) =>
        c[0].sql.includes('FROM vouchers'),
      )!;
      expect(lockCall[0].sql).not.toContain('SALE10');
      expect(lockCall[0].values).toEqual(['SALE10']);
    });
  });

  it('thứ tự khóa cố định: giỏ → biến thể (id tăng dần) → voucher → giữ chỗ theo id tăng dần', async () => {
    const { service, log } = setup({ voucher: voucherRow() });
    await service.create(USER, dto({ voucherCode: 'SALE10' }));
    expect(log).toEqual([
      'lock:cart',
      'lock:variants',
      'lock:voucher',
      'update:voucher',
      'reserve:3',
      'reserve:5',
      'order:create',
      'cart:clear',
    ]);
  });

  it('câu khóa biến thể chỉ trên product_variants (không JOIN), ORDER BY id FOR UPDATE, tồn lấy từ câu này', async () => {
    const { service, tx } = setup();
    await service.create(USER, dto());
    const sql = tx.$queryRaw.mock.calls.find((c) =>
      c[0].sql.includes('FROM product_variants'),
    )![0].sql;
    expect(sql).not.toMatch(/JOIN/i);
    expect(sql).toContain('ORDER BY id FOR UPDATE');
    expect(sql).toContain('stock');
    expect(sql).toContain('reserved');
    // Truy vấn thường chỉ lấy giá/tên/ảnh, không lấy stock/reserved
    const select = tx.productVariant.findMany.mock.calls[0][0].select;
    expect(select.stock).toBeUndefined();
    expect(select.reserved).toBeUndefined();
  });

  describe('Idempotency-Key', () => {
    const KEY = 'checkout-key-0001';

    it('cùng key hai lần: trả lại ĐÚNG đơn cũ, không giữ chỗ thêm, không báo giỏ trống', async () => {
      const { service, db } = setup();
      const first = await service.create(USER, dto(), KEY);
      const second = await service.create(USER, dto(), KEY);

      expect(second.code).toBe(first.code);
      expect(db.orders).toHaveLength(1);
      expect(db.variants[3].reserved).toBe(2); // không nhân đôi
      expect(db.variants[5].reserved).toBe(1);
    });

    it('cùng key chạy song song: chỉ một đơn được tạo, hai request cùng nhận một mã đơn', async () => {
      const { service, db } = setup({ voucher: voucherRow() });
      const [a, b] = await Promise.all([
        service.create(USER, dto({ voucherCode: 'SALE10' }), KEY),
        service.create(USER, dto({ voucherCode: 'SALE10' }), KEY),
      ]);
      expect(a.code).toBe(b.code);
      expect(db.orders).toHaveLength(1);
      expect(db.voucher!.usedCount).toBe(1);
    });

    it('key khác nhau: đơn thứ hai gặp giỏ rỗng → 409 CART_EMPTY (giỏ đã được đặt)', async () => {
      const { service, db } = setup();
      await service.create(USER, dto(), KEY);
      const e = await errorOf(service.create(USER, dto(), 'checkout-key-0002'));
      expect(e).toMatchObject({ status: 409, code: 'CART_EMPTY' });
      expect(db.orders).toHaveLength(1);
    });

    it('không gửi key: chạy như cũ, bấm hai lần → lần hai báo giỏ trống', async () => {
      const { service, db } = setup();
      await service.create(USER, dto());
      expect((await errorOf(service.create(USER, dto()))).code).toBe(
        'CART_EMPTY',
      );
      expect(db.orders).toHaveLength(1);
    });

    it('bấm hai lần song song không có key: một đơn, một request báo giỏ trống', async () => {
      const { service, db } = setup();
      const results = await Promise.allSettled([
        service.create(USER, dto()),
        service.create(USER, dto()),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([
        'fulfilled',
        'rejected',
      ]);
      expect(db.orders).toHaveLength(1);
    });

    it('key sai định dạng → 400 IDEMPOTENCY_KEY_INVALID', async () => {
      const { service, prisma } = setup();
      for (const bad of ['short', 'có dấu cách vì sai', 'x'.repeat(65)]) {
        expect(await errorOf(service.create(USER, dto(), bad))).toMatchObject({
          status: 400,
          code: 'IDEMPOTENCY_KEY_INVALID',
        });
      }
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('key chỉ áp trong phạm vi một user (kiểm theo userId)', async () => {
      const { service, tx } = setup();
      await service.create(USER, dto(), KEY);
      expect(tx.order.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 7, idempotencyKey: KEY } }),
      );
    });
  });

  describe('lỗi hạ tầng', () => {
    it('trùng mã đơn (P2002 trên cột code): sinh mã khác rồi tạo lại', async () => {
      const { service, db, failOrderCreate } = setup();
      failOrderCreate(
        new Prisma.PrismaClientKnownRequestError('dup', {
          code: 'P2002',
          clientVersion: 'test',
          meta: { target: 'orders_code_key' },
        }),
      );
      await service.create(USER, dto());
      expect(db.orders).toHaveLength(1);
    });

    it('P2034 hai lần rồi thành công: được chạy lại', async () => {
      const { service, prisma, failTx, db } = setup();
      failTx(2);
      await service.create(USER, dto());
      expect(prisma.$transaction).toHaveBeenCalledTimes(3);
      expect(db.orders).toHaveLength(1);
    });

    it('P2034 liên tục: thử đúng 3 lần rồi 409 SYSTEM_BUSY', async () => {
      const { service, prisma, failTx } = setup();
      failTx(99);
      const e = await errorOf(service.create(USER, dto()));
      expect(e).toMatchObject({ status: 409, code: 'SYSTEM_BUSY' });
      expect(prisma.$transaction).toHaveBeenCalledTimes(3);
    });
  });
});

describe('OrdersService.preview', () => {
  const cartRows = (price = 300_000, over: Partial<VariantFake> = {}) => ({
    items: [
      {
        id: 1,
        variantId: 3,
        quantity: 2,
        variant: {
          size: 'M',
          color: 'Đen',
          colorHex: '#000000',
          stock: 10,
          reserved: 0,
          isActive: true,
          ...over,
          product: {
            id: 1,
            name: 'Áo thun',
            slug: 'ao-thun',
            price,
            imageUrl: null,
            isActive: true,
            images: [{ url: 'https://cdn/a.jpg' }],
          },
        },
      },
    ],
  });

  beforeEach(() => {
    jest.useFakeTimers({
      now: NOW_OK,
      doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'],
    });
  });
  afterEach(() => jest.useRealTimers());

  it('không voucher: tính tiền, không ghi gì, không mở transaction', async () => {
    const { service, prisma } = setup();
    prisma.cart.findUnique.mockResolvedValue(cartRows(200_000));
    const result = await service.preview(7, {});
    expect(result).toMatchObject({
      subtotal: 400_000,
      discountAmount: 0,
      shippingFee: 30_000,
      totalAmount: 430_000,
      voucher: null,
      warnings: [],
      canCheckout: true,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toMatch(/"stock"|"reserved"/);
  });

  it('có voucher: trả giảm giá và thông tin mã (mã, mô tả)', async () => {
    const { service, prisma } = setup();
    prisma.cart.findUnique.mockResolvedValue(cartRows(300_000));
    prisma.voucher.findUnique.mockResolvedValue(voucherRow());
    const result = await service.preview(7, { voucherCode: ' sale10' });
    expect(prisma.voucher.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { code: 'SALE10' } }),
    );
    expect(result).toMatchObject({
      subtotal: 600_000,
      discountAmount: 60_000,
      shippingFee: 0,
      totalAmount: 540_000,
      voucher: { code: 'SALE10', description: 'Giảm 10%' },
    });
  });

  it('dòng không mua được → warnings, không tính vào tạmTính, canCheckout = false', async () => {
    const { service, prisma } = setup();
    prisma.cart.findUnique.mockResolvedValue(
      cartRows(300_000, { stock: 1, reserved: 0 }),
    );
    const result = await service.preview(7, {});
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatchObject({ cartItemId: 1, variantId: 3 });
    expect(result.warnings[0].message).toContain('chỉ còn 1');
    expect(result.subtotal).toBe(0);
    expect(result.canCheckout).toBe(false);
  });

  it('giỏ rỗng → 409 CART_EMPTY', async () => {
    const { service, prisma } = setup();
    prisma.cart.findUnique.mockResolvedValue(null);
    expect((await errorOf(service.preview(7, {}))).code).toBe('CART_EMPTY');
    prisma.cart.findUnique.mockResolvedValue({ items: [] });
    expect((await errorOf(service.preview(7, {}))).code).toBe('CART_EMPTY');
  });

  it('voucher sai → lỗi 400 có code', async () => {
    const { service, prisma } = setup();
    prisma.cart.findUnique.mockResolvedValue(cartRows());
    prisma.voucher.findUnique.mockResolvedValue(null);
    expect(
      await errorOf(service.preview(7, { voucherCode: 'NOPE' })),
    ).toMatchObject({
      status: 400,
      code: 'VOUCHER_NOT_FOUND',
    });
    prisma.voucher.findUnique.mockResolvedValue(
      voucherRow({ expiresAt: new Date('2026-01-01T00:00:00Z') }),
    );
    expect(
      (await errorOf(service.preview(7, { voucherCode: 'OLD' }))).code,
    ).toBe('VOUCHER_EXPIRED');
  });
});

describe('OrdersService: xem và hủy đơn của tôi', () => {
  it('danh sách chỉ lọc theo user hiện tại + status, phân trang và meta đúng', async () => {
    const { service, prisma } = setup();
    prisma.$transaction.mockImplementation((ops: unknown[]) =>
      Promise.all(ops),
    );
    prisma.order.findMany.mockResolvedValue([]);
    prisma.order.count.mockResolvedValue(25);

    const result = await service.findMine(7, {
      page: 3,
      limit: 10,
      status: OrderStatus.PENDING,
      sortBy: 'createdAt',
      order: 'desc',
    });

    const args = prisma.order.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ userId: 7, status: 'PENDING' });
    expect(args.skip).toBe(20);
    expect(args.take).toBe(10);
    expect(args.orderBy).toEqual([{ createdAt: 'desc' }, { id: 'desc' }]);
    expect(prisma.order.count).toHaveBeenCalledWith({
      where: { userId: 7, status: 'PENDING' },
    });
    expect(result.meta).toEqual({
      page: 3,
      limit: 10,
      total: 25,
      totalPages: 3,
    });
  });

  it('xem đơn của người khác → 404 ORDER_NOT_FOUND (lọc theo userId)', async () => {
    const { service, prisma } = setup();
    prisma.order.findFirst.mockResolvedValue(null);
    expect(
      await errorOf(service.findMineByCode(7, 'MS-261105-AAAA')),
    ).toMatchObject({
      status: 404,
      code: 'ORDER_NOT_FOUND',
    });
    expect(prisma.order.findFirst.mock.calls[0][0].where).toEqual({
      code: 'MS-261105-AAAA',
      userId: 7,
    });
  });

  it('hủy đơn của người khác → 404 và không gọi workflow', async () => {
    const { service, tx, workflow } = setup();
    tx.order.findFirst.mockResolvedValueOnce(null);
    expect(
      await errorOf(service.cancelMine(7, 'MS-261105-AAAA', {})),
    ).toMatchObject({
      status: 404,
      code: 'ORDER_NOT_FOUND',
    });
    expect(workflow.transition).not.toHaveBeenCalled();
  });

  it('hủy đơn của mình: lý do mặc định "Khách tự hủy", actor là CUSTOMER', async () => {
    const { service, tx, workflow, prisma } = setup();
    tx.order.findFirst.mockResolvedValueOnce({ id: 11 });
    prisma.order.findFirst.mockResolvedValue({
      items: [],
      statusHistories: [],
      code: 'MS-261105-AAAA',
    });
    await service.cancelMine(7, 'MS-261105-AAAA', {});
    expect(workflow.transition).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        orderId: 11,
        to: 'CANCELLED',
        actor: { id: 7, role: 'CUSTOMER' },
        reason: 'Khách tự hủy',
      }),
    );
  });

  it('hủy kèm lý do của khách thì dùng lý do đó', async () => {
    const { service, tx, workflow, prisma } = setup();
    tx.order.findFirst.mockResolvedValueOnce({ id: 11 });
    prisma.order.findFirst.mockResolvedValue({
      items: [],
      statusHistories: [],
    });
    await service.cancelMine(7, 'MS-261105-AAAA', { reason: 'Đặt nhầm size' });
    expect(workflow.transition.mock.calls[0][1].reason).toBe('Đặt nhầm size');
  });
});
