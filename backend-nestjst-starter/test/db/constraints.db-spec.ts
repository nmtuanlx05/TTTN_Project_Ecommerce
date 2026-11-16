import { inspect } from 'node:util';
import { Prisma } from '../../src/generated/prisma/client';
import type { PrismaClient } from '../../src/generated/prisma/client';
import {
  PaymentMethod,
  PaymentTransactionStatus,
} from '../../src/generated/prisma/enums';
import {
  createBuyer,
  createCart,
  createCategory,
  createProduct,
  createSellableVariant,
  createUser,
  createVariant,
  createVoucher,
  uniq,
} from './helpers/factories';
import {
  assertConnectedToTestDatabase,
  createTestPrisma,
} from './helpers/prisma-client';
import { resetDatabase } from './helpers/reset-db';

// Nhóm (d): ràng buộc CHECK và UNIQUE do chính MySQL ép buộc, thao tác thẳng bằng PrismaClient thật (không qua API).
//
// Cách tránh "đỏ giả / xanh giả": mỗi ca CHECK xuất phát từ một bản ghi HỢP LỆ rồi chỉ đổi đúng một trường,
// và có ca "giá trị biên hợp lệ vẫn được nhận" để chứng minh dữ liệu dựng đúng. Ca nào bị từ chối còn phải đúng
// TÊN ràng buộc (kiểm trong nội dung lỗi), không chỉ "bị lỗi gì đó".

// Nội dung lỗi đầy đủ (message + meta + cause) để tìm tên ràng buộc, bất kể adapter đặt nó ở đâu
async function rejectionText(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    return inspect(error, { depth: 8 });
  }
  throw new Error('Kỳ vọng DB từ chối thao tác nhưng nó lại thành công');
}

async function rejectionCode(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return (error as { code?: unknown }).code;
  }
  throw new Error('Kỳ vọng DB từ chối thao tác nhưng nó lại thành công');
}

describe('Ràng buộc CHECK và UNIQUE trên MySQL thật', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = createTestPrisma({ quiet: true });
    await assertConnectedToTestDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  // Dữ liệu đơn hàng tối thiểu hợp lệ (không cần user: userId có thể null ở schema)
  const orderData = (
    overrides: Partial<Prisma.OrderUncheckedCreateInput> = {},
  ): Prisma.OrderUncheckedCreateInput => ({
    code: `T-${uniq()}`,
    customerName: 'Khách thử',
    customerPhone: '0912345678',
    shippingAddress: '12 Lê Lợi',
    subtotal: 100_000,
    shippingFee: 0,
    discountAmount: 0,
    totalAmount: 100_000,
    paymentMethod: PaymentMethod.COD,
    ...overrides,
  });

  describe('CHECK: giá trị biên HỢP LỆ vẫn được nhận (chứng minh dữ liệu dựng đúng)', () => {
    it('tồn 0/reserved 0, reserved = stock, usedCount = usageLimit, phần trăm 100, màu #AABBCC, sortOrder 0', async () => {
      const product = await createProduct(prisma, { price: 0 });
      await createVariant(prisma, product.id, { stock: 0, reserved: 0 });
      await createVariant(prisma, product.id, {
        stock: 5,
        reserved: 5,
        colorHex: '#AABBCC',
      });
      await createVoucher(prisma, {
        usageLimit: 3,
        usedCount: 3,
        discountType: 'PERCENT',
        discountValue: 100,
        maxDiscount: 1,
      });
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: 'https://example.com/a.jpg',
          sortOrder: 0,
        },
      });
      await prisma.order.create({
        data: orderData({
          subtotal: 100_000,
          discountAmount: 100_000,
          totalAmount: 0,
        }),
      });
      expect(await prisma.productVariant.count()).toBe(2);
    });
  });

  describe('CHECK: giá trị sai bị MySQL từ chối đúng ràng buộc', () => {
    it('reserved > stock → chk_product_variants_reserved', async () => {
      const product = await createProduct(prisma);
      const text = await rejectionText(
        createVariant(prisma, product.id, { stock: 5, reserved: 6 }),
      );
      expect(text).toContain('chk_product_variants_reserved');
    });

    // Ghi chú: stock < 0 cũng làm reserved <= stock sai (vì reserved >= 0), nên MySQL có thể báo một trong hai tên.
    // chk_product_variants_stock về logic là dư thừa so với chk_product_variants_reserved.
    it('stock âm → chk_product_variants_stock (hoặc reserved, vì cùng bị vi phạm)', async () => {
      const product = await createProduct(prisma);
      const text = await rejectionText(
        createVariant(prisma, product.id, { stock: -1, reserved: 0 }),
      );
      expect(text).toMatch(/chk_product_variants_(stock|reserved)/);
    });

    it('reserved âm → chk_product_variants_reserved', async () => {
      const product = await createProduct(prisma);
      const text = await rejectionText(
        createVariant(prisma, product.id, { stock: 5, reserved: -1 }),
      );
      expect(text).toContain('chk_product_variants_reserved');
    });

    it('giá sản phẩm âm → chk_products_price', async () => {
      const category = await createCategory(prisma);
      const text = await rejectionText(
        createProduct(prisma, { price: -1, categoryId: category.id }),
      );
      expect(text).toContain('chk_products_price');
    });

    it('số lượng dòng giỏ bằng 0 → chk_cart_items_quantity', async () => {
      const { variant } = await createSellableVariant(prisma);
      const user = await createUser(prisma);
      const text = await rejectionText(
        createCart(prisma, user.id, [{ variantId: variant.id, quantity: 0 }]),
      );
      expect(text).toContain('chk_cart_items_quantity');
    });

    it('tổng tiền đơn âm → chk_orders_total_amount', async () => {
      const text = await rejectionText(
        prisma.order.create({
          data: orderData({ subtotal: 0, totalAmount: -1 }),
        }),
      );
      expect(text).toContain('chk_orders_total_amount');
    });

    it('giảm giá lớn hơn tạm tính → chk_orders_discount_amount', async () => {
      const text = await rejectionText(
        prisma.order.create({
          data: orderData({
            subtotal: 100_000,
            discountAmount: 100_001,
            totalAmount: 0,
          }),
        }),
      );
      expect(text).toContain('chk_orders_discount_amount');
    });

    it('dòng đơn: số lượng 0 → chk_order_items_quantity, giá âm → chk_order_items_price', async () => {
      const { variant } = await createSellableVariant(prisma);
      const order = await prisma.order.create({ data: orderData() });
      const item = (overrides: { quantity: number; price: number }) => ({
        orderId: order.id,
        variantId: variant.id,
        productName: 'Áo',
        sku: 'SKU-X',
        size: 'M',
        color: 'Đen',
        ...overrides,
      });

      expect(
        await rejectionText(
          prisma.orderItem.create({ data: item({ quantity: 0, price: 1000 }) }),
        ),
      ).toContain('chk_order_items_quantity');
      expect(
        await rejectionText(
          prisma.orderItem.create({ data: item({ quantity: 1, price: -1 }) }),
        ),
      ).toContain('chk_order_items_price');
    });

    it.each([
      [
        'usedCount > usageLimit',
        { usageLimit: 3, usedCount: 4 },
        'chk_vouchers_usage_limit',
      ],
      ['usedCount âm', { usedCount: -1 }, 'chk_vouchers_used_count'],
      [
        'usageLimit bằng 0',
        { usageLimit: 0 },
        'chk_vouchers_usage_limit_positive',
      ],
      [
        'giá trị giảm bằng 0',
        { discountValue: 0 },
        'chk_vouchers_discount_value',
      ],
      [
        'phần trăm lớn hơn 100',
        { discountType: 'PERCENT' as const, discountValue: 101 },
        'chk_vouchers_percent_max',
      ],
      [
        'maxDiscount bằng 0',
        { maxDiscount: 0 },
        'chk_vouchers_max_discount_positive',
      ],
      [
        'minOrderValue âm',
        { minOrderValue: -1 },
        'chk_vouchers_min_order_value',
      ],
    ])('voucher: %s → %s', async (_label, overrides, constraint) => {
      const text = await rejectionText(createVoucher(prisma, overrides));
      expect(text).toContain(constraint);
    });

    it('voucher hết hạn không sau ngày bắt đầu → chk_vouchers_dates', async () => {
      const at = new Date('2030-01-01T00:00:00Z');
      const text = await rejectionText(
        createVoucher(prisma, { startsAt: at, expiresAt: at }),
      );
      expect(text).toContain('chk_vouchers_dates');
    });

    it.each(['#aabbcc', 'AABBCC', '#AABBC', '#GGGGGG'])(
      'mã màu sai định dạng %s → chk_product_variants_color_hex',
      async (colorHex) => {
        const product = await createProduct(prisma);
        const text = await rejectionText(
          createVariant(prisma, product.id, { colorHex }),
        );
        expect(text).toContain('chk_product_variants_color_hex');
      },
    );

    // Cột colorHex là VARCHAR(7): giá trị dài hơn bị chặn ở tầng kiểu cột (P2000) TRƯỚC khi tới CHECK
    it('mã màu quá dài (9 ký tự) bị cột VARCHAR(7) chặn (P2000)', async () => {
      const product = await createProduct(prisma);
      expect(
        await rejectionCode(
          createVariant(prisma, product.id, { colorHex: '#AABBCCDD' }),
        ),
      ).toBe('P2000');
    });

    it('thứ tự ảnh âm → chk_product_images_sort_order', async () => {
      const product = await createProduct(prisma);
      const text = await rejectionText(
        prisma.productImage.create({
          data: {
            productId: product.id,
            url: 'https://example.com/a.jpg',
            sortOrder: -1,
          },
        }),
      );
      expect(text).toContain('chk_product_images_sort_order');
    });

    it('giao dịch thanh toán số tiền âm → chk_payment_transactions_amount', async () => {
      const text = await rejectionText(
        prisma.paymentTransaction.create({
          data: { provider: 'SEPAY', providerTxnId: `T-${uniq()}`, amount: -1 },
        }),
      );
      expect(text).toContain('chk_payment_transactions_amount');
    });

    it('giao dịch SUCCESS không gắn đơn → chk_payment_transactions_success_order; có đơn thì được nhận', async () => {
      const text = await rejectionText(
        prisma.paymentTransaction.create({
          data: {
            provider: 'SEPAY',
            providerTxnId: `T-${uniq()}`,
            amount: 1000,
            status: PaymentTransactionStatus.SUCCESS,
          },
        }),
      );
      expect(text).toContain('chk_payment_transactions_success_order');

      const order = await prisma.order.create({ data: orderData() });
      await prisma.paymentTransaction.create({
        data: {
          provider: 'SEPAY',
          providerTxnId: `T-${uniq()}`,
          amount: 1000,
          status: PaymentTransactionStatus.SUCCESS,
          orderId: order.id,
        },
      });
    });
  });

  describe('UNIQUE: trùng bị từ chối (P2002), không trùng thì được nhận', () => {
    it('email người dùng trùng, kể cả chỉ khác hoa/thường (collation utf8mb4_unicode_ci)', async () => {
      const user = await createUser(prisma);
      const duplicate = prisma.user.create({
        data: { email: user.email.toUpperCase(), password: 'x' },
      });
      expect(await rejectionCode(duplicate)).toBe('P2002');
    });

    it('SKU biến thể trùng', async () => {
      const product = await createProduct(prisma);
      await createVariant(prisma, product.id, { sku: 'SKU-DUP' });
      expect(
        await rejectionCode(
          createVariant(prisma, product.id, { sku: 'SKU-DUP', size: 'L' }),
        ),
      ).toBe('P2002');
    });

    it('cùng sản phẩm + size + màu chỉ khác hoa/thường (M / m, "Xanh lá" / "XANH LÁ")', async () => {
      const product = await createProduct(prisma);
      await createVariant(prisma, product.id, { size: 'M', color: 'Xanh lá' });
      expect(
        await rejectionCode(
          createVariant(prisma, product.id, { size: 'm', color: 'XANH LÁ' }),
        ),
      ).toBe('P2002');
    });

    it('cùng sản phẩm + size + màu chỉ khác dấu thông thường ("Xám" / "xam")', async () => {
      const product = await createProduct(prisma);
      await createVariant(prisma, product.id, { size: 'M', color: 'Xám' });
      expect(
        await rejectionCode(
          createVariant(prisma, product.id, { size: 'M', color: 'xam' }),
        ),
      ).toBe('P2002');
    });

    // GHI NHẬN HÀNH VI ĐÃ ĐO trên MySQL thật (không phải mong muốn): với utf8mb4_unicode_ci, "đ" KHÔNG bằng "d"
    // (SELECT 'đ'='d' cho 0) nên "Đen" và "den" là hai màu khác nhau ở tầng DB. Việc coi chúng là một màu chỉ do
    // fold() ở tầng service (src/common/utils/fold.ts). Nếu một ngày collation đổi hoặc hành vi này thay đổi, test này đỏ.
    it('GHI NHẬN: "Đen" và "den" KHÔNG bị DB coi là trùng (đ ≠ d); chặn trùng loại này chỉ có ở service', async () => {
      const product = await createProduct(prisma);
      await createVariant(prisma, product.id, { size: 'M', color: 'Đen' });
      await createVariant(prisma, product.id, { size: 'M', color: 'den' });
      expect(
        await prisma.productVariant.count({ where: { productId: product.id } }),
      ).toBe(2);
    });

    it('mã voucher trùng, kể cả khác hoa/thường', async () => {
      await createVoucher(prisma, { code: 'SALE10' });
      expect(
        await rejectionCode(createVoucher(prisma, { code: 'sale10' })),
      ).toBe('P2002');
    });

    it('mã đơn hàng trùng', async () => {
      await prisma.order.create({ data: orderData({ code: 'MS-DUP-0001' }) });
      expect(
        await rejectionCode(
          prisma.order.create({ data: orderData({ code: 'MS-DUP-0001' }) }),
        ),
      ).toBe('P2002');
    });

    it('(userId, idempotencyKey) trùng bị từ chối; khác user hoặc khóa rỗng (NULL) thì được', async () => {
      const userA = await createUser(prisma);
      const userB = await createUser(prisma);
      await prisma.order.create({
        data: orderData({ userId: userA.id, idempotencyKey: 'idem-key-0001' }),
      });

      expect(
        await rejectionCode(
          prisma.order.create({
            data: orderData({
              userId: userA.id,
              idempotencyKey: 'idem-key-0001',
            }),
          }),
        ),
      ).toBe('P2002');

      // Cùng key nhưng khác user: hợp lệ
      await prisma.order.create({
        data: orderData({ userId: userB.id, idempotencyKey: 'idem-key-0001' }),
      });
      // MySQL cho phép nhiều NULL trong ràng buộc UNIQUE: cùng user có nhiều đơn không gửi key
      await prisma.order.create({ data: orderData({ userId: userA.id }) });
      await prisma.order.create({ data: orderData({ userId: userA.id }) });
      expect(await prisma.order.count({ where: { userId: userA.id } })).toBe(3);
    });

    it('(provider, providerTxnId) trùng bị từ chối; nhiều giao dịch MANUAL không có providerTxnId (NULL) thì được', async () => {
      await prisma.paymentTransaction.create({
        data: { provider: 'SEPAY', providerTxnId: 'TXN-1', amount: 1000 },
      });
      expect(
        await rejectionCode(
          prisma.paymentTransaction.create({
            data: { provider: 'SEPAY', providerTxnId: 'TXN-1', amount: 1000 },
          }),
        ),
      ).toBe('P2002');

      // Cùng mã giao dịch nhưng khác nhà cung cấp: hợp lệ
      await prisma.paymentTransaction.create({
        data: { provider: 'MANUAL', providerTxnId: 'TXN-1', amount: 1000 },
      });
      await prisma.paymentTransaction.create({
        data: { provider: 'MANUAL', amount: 1000 },
      });
      await prisma.paymentTransaction.create({
        data: { provider: 'MANUAL', amount: 2000 },
      });
      expect(
        await prisma.paymentTransaction.count({
          where: { provider: 'MANUAL' },
        }),
      ).toBe(3);
    });

    it('wishlist (userId, productId) trùng; mỗi user chỉ một giỏ hàng', async () => {
      const user = await createUser(prisma);
      const product = await createProduct(prisma);
      await prisma.wishlistItem.create({
        data: { userId: user.id, productId: product.id },
      });
      expect(
        await rejectionCode(
          prisma.wishlistItem.create({
            data: { userId: user.id, productId: product.id },
          }),
        ),
      ).toBe('P2002');

      const buyer = await createBuyer(prisma, []);
      expect(
        await rejectionCode(prisma.cart.create({ data: { userId: buyer.id } })),
      ).toBe('P2002');
    });
  });
});
