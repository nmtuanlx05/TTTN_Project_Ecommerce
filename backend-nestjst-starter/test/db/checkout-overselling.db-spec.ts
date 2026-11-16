import type { PrismaClient } from '../../src/generated/prisma/client';
import { OrderStatus } from '../../src/generated/prisma/enums';
import { startTestApp, TestApp } from './helpers/app';
import { HttpResult, postOrder, tally } from './helpers/checkout';
import {
  createBuyer,
  createProduct,
  createSellableVariant,
  createVariant,
} from './helpers/factories';
import {
  assertConnectedToTestDatabase,
  createTestPrisma,
} from './helpers/prisma-client';
import { resetDatabase } from './helpers/reset-db';

// Nhóm (a): chống bán vượt tồn. Nhiều khách đặt đơn CÙNG LÚC qua HTTP vào AppModule thật + MySQL thật.
// Điểm cần chứng minh: số đơn thành công đúng bằng tồn cho phép, `reserved` khớp đúng số hàng đã giữ,
// không bao giờ vượt `stock` (CHECK chk_product_variants_reserved), và KHÔNG có phản hồi lạ (500, SYSTEM_BUSY).
//
// Lưu ý: test đồng thời chỉ làm tăng xác suất lộ race, không chứng minh "không có race". Vì vậy ca chính lặp 3 vòng.
// Số khách (25) cố ý lớn hơn pool kết nối của PrismaService (10) để có cả tranh chấp kết nối.

const CONFLICT = '409:CART_ITEMS_UNAVAILABLE';

describe('Checkout đồng thời: chống bán vượt tồn (MySQL thật)', () => {
  let prisma: PrismaClient;
  let testApp: TestApp;

  beforeAll(async () => {
    prisma = createTestPrisma();
    await assertConnectedToTestDatabase(prisma);
    testApp = await startTestApp();
  });

  afterAll(async () => {
    await testApp.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  // Tồn kho phải nhất quán: stock không đổi (chỉ đổi khi giao hàng), reserved = tổng số lượng của các đơn chưa hủy,
  // và reserved <= stock.
  async function expectInventoryConsistent(
    variantId: number,
    expectedStock: number,
    expectedReserved: number,
  ) {
    const variant = await prisma.productVariant.findUniqueOrThrow({
      where: { id: variantId },
    });
    const held = await prisma.orderItem.aggregate({
      _sum: { quantity: true },
      where: {
        variantId,
        order: { status: { not: OrderStatus.CANCELLED } },
      },
    });
    expect(variant.stock).toBe(expectedStock);
    expect(variant.reserved).toBe(expectedReserved);
    expect(variant.reserved).toBe(held._sum.quantity ?? 0);
    expect(variant.reserved).toBeLessThanOrEqual(variant.stock);
  }

  // Bắn đồng thời: mỗi khách một request. Trả kết quả theo đúng thứ tự khách.
  async function fireAll(userIds: number[]): Promise<HttpResult[]> {
    return Promise.all(userIds.map((id) => postOrder(testApp, id)));
  }

  // Khách có đơn thành công thì giỏ đã được dọn; khách bị từ chối thì giỏ KHÔNG bị đổi (còn nguyên số dòng ban đầu).
  async function expectCartsUntouchedOnFailure(
    userIds: number[],
    results: HttpResult[],
    itemsPerCart: number,
  ) {
    const failed = userIds.filter((_, i) => results[i].status !== 201);
    const succeeded = userIds.filter((_, i) => results[i].status === 201);
    expect(
      await prisma.cartItem.count({
        where: { cart: { userId: { in: failed } } },
      }),
    ).toBe(failed.length * itemsPerCart);
    expect(
      await prisma.cartItem.count({
        where: { cart: { userId: { in: succeeded } } },
      }),
    ).toBe(0);
  }

  it('kiểm chứng bộ dụng cụ: một khách đặt tuần tự → 201, giữ chỗ đúng, giỏ được dọn', async () => {
    const { variant } = await createSellableVariant(prisma, { stock: 5 });
    const buyer = await createBuyer(prisma, [
      { variantId: variant.id, quantity: 2 },
    ]);

    const result = await postOrder(testApp, buyer.id);

    expect(result.status).toBe(201);
    expect(result.body.data?.code).toMatch(/^MS-\d{6}-[A-Z0-9]{4}$/);
    await expectInventoryConsistent(variant.id, 5, 2);
    expect(await prisma.order.count()).toBe(1);
    expect(await prisma.cartItem.count()).toBe(0);
  });

  it.each([1, 2, 3])(
    'vòng %i: tồn 5, 25 khách (mỗi người 1 cái) đặt cùng lúc → đúng 5 thành công, 20 bị từ chối',
    async () => {
      const { variant } = await createSellableVariant(prisma, { stock: 5 });
      const buyers = await Promise.all(
        Array.from({ length: 25 }, () =>
          createBuyer(prisma, [{ variantId: variant.id, quantity: 1 }]),
        ),
      );
      const userIds = buyers.map((b) => b.id);

      const results = await fireAll(userIds);

      expect(tally(results)).toEqual({ '201': 5, [CONFLICT]: 20 });
      await expectInventoryConsistent(variant.id, 5, 5);
      expect(await prisma.order.count()).toBe(5);
      expect(await prisma.orderItem.count()).toBe(5);
      expect(await prisma.orderStatusHistory.count()).toBe(5);
      // Giữ/nhả reserved không ghi StockMovement (chỉ đổi stock mới ghi)
      expect(await prisma.stockMovement.count()).toBe(0);
      await expectCartsUntouchedOnFailure(userIds, results, 1);
    },
  );

  it('mỗi khách mua 2 cái: tồn 10, 12 khách → đúng 5 thành công (reserved = 10)', async () => {
    const { variant } = await createSellableVariant(prisma, { stock: 10 });
    const buyers = await Promise.all(
      Array.from({ length: 12 }, () =>
        createBuyer(prisma, [{ variantId: variant.id, quantity: 2 }]),
      ),
    );
    const userIds = buyers.map((b) => b.id);

    const results = await fireAll(userIds);

    expect(tally(results)).toEqual({ '201': 5, [CONFLICT]: 7 });
    await expectInventoryConsistent(variant.id, 10, 10);
    expect(await prisma.order.count()).toBe(5);
    await expectCartsUntouchedOnFailure(userIds, results, 1);
  });

  it('không giữ chỗ một phần: tồn 3, 6 khách mỗi người mua 2 → đúng 1 thành công, còn lại 1 cái không bị giữ', async () => {
    const { variant } = await createSellableVariant(prisma, { stock: 3 });
    const buyers = await Promise.all(
      Array.from({ length: 6 }, () =>
        createBuyer(prisma, [{ variantId: variant.id, quantity: 2 }]),
      ),
    );
    const userIds = buyers.map((b) => b.id);

    const results = await fireAll(userIds);

    expect(tally(results)).toEqual({ '201': 1, [CONFLICT]: 5 });
    await expectInventoryConsistent(variant.id, 3, 2);
    await expectCartsUntouchedOnFailure(userIds, results, 1);
  });

  // Thử deadlock: hai nhóm khách có giỏ chứa CÙNG hai biến thể A và B nhưng thứ tự dòng giỏ NGƯỢC nhau.
  // Nếu code khóa theo thứ tự dòng giỏ thì A-B và B-A sẽ chờ nhau (deadlock). Thiết kế khóa theo variantId tăng dần
  // nên không được xảy ra: không P2034 lọt ra ngoài, không SYSTEM_BUSY, không 500.
  it.each([1, 2, 3])(
    'vòng %i: hai giỏ thứ tự dòng ngược nhau (A,B) và (B,A), 20 khách → không deadlock, đúng 5 thành công',
    async () => {
      const product = await createProduct(prisma);
      const variantA = await createVariant(prisma, product.id, { stock: 5 });
      const variantB = await createVariant(prisma, product.id, { stock: 5 });
      expect(variantA.id).toBeLessThan(variantB.id);

      const buyers = await Promise.all(
        Array.from({ length: 20 }, (_, i) =>
          createBuyer(
            prisma,
            i % 2 === 0
              ? [
                  { variantId: variantA.id, quantity: 1 },
                  { variantId: variantB.id, quantity: 1 },
                ]
              : [
                  { variantId: variantB.id, quantity: 1 },
                  { variantId: variantA.id, quantity: 1 },
                ],
          ),
        ),
      );
      const userIds = buyers.map((b) => b.id);

      const results = await fireAll(userIds);

      expect(tally(results)).toEqual({ '201': 5, [CONFLICT]: 15 });
      await expectInventoryConsistent(variantA.id, 5, 5);
      await expectInventoryConsistent(variantB.id, 5, 5);
      expect(await prisma.order.count()).toBe(5);
      expect(await prisma.orderItem.count()).toBe(10);
      await expectCartsUntouchedOnFailure(userIds, results, 2);
    },
  );
});
