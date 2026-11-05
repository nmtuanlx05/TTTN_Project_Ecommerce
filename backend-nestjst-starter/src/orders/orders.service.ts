import { Injectable } from '@nestjs/common';
import { badRequest, conflict, notFound } from '../common/errors/coded-errors';
import { Paginated } from '../common/paginated';
import { Prisma } from '../generated/prisma/client';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../generated/prisma/enums';
import { cartItemSelect, isPurchasable, toCartItem } from '../cart/cart.mapper';
import { getAvailable } from '../inventory/inventory.mapper';
import { imageOrder } from '../products/products.mapper';
import {
  LocationsService,
  formatShippingAddress,
} from '../locations/locations.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/auth.types';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { PreviewOrderDto } from './dto/preview-order.dto';
import { QueryMyOrdersDto } from './dto/query-orders.dto';
import { CartService } from '../cart/cart.service';
import type { AddManyReason } from '../cart/cart.service';
import { generateOrderCode } from './order-code';
import { OrderWorkflowService } from './order-workflow.service';
import {
  DEFAULT_CUSTOMER_CANCEL_REASON,
  IDEMPOTENCY_KEY_REGEX,
  MAX_ORDER_CODE_ATTEMPTS,
  ORDER_ERROR,
} from './orders.constants';
import {
  customerOrderSelect,
  myOrderListSelect,
  toCustomerOrder,
  toMyOrderListItem,
} from './orders.mapper';
import { calculatePricing } from './orders.pricing';
import { isPrismaCode, runWithRetry } from './orders.tx';
import {
  assertVoucherUsable,
  normalizeVoucherCode,
  voucherNotFound,
} from './vouchers.rules';
import type { VoucherRow } from './vouchers.rules';

const voucherSelect = {
  id: true,
  code: true,
  description: true,
  discountType: true,
  discountValue: true,
  maxDiscount: true,
  minOrderValue: true,
  usageLimit: true,
  usedCount: true,
  startsAt: true,
  expiresAt: true,
  isActive: true,
} as const;

const orderNotFound = () =>
  notFound(ORDER_ERROR.ORDER_NOT_FOUND, 'Không tìm thấy đơn hàng');

const cartEmpty = () =>
  conflict(
    ORDER_ERROR.CART_EMPTY,
    'Giỏ hàng trống, hãy thêm sản phẩm trước khi đặt hàng',
  );

interface LineInfo {
  name: string;
  size: string;
  color: string;
  quantity: number;
  purchasable: boolean;
  available: number;
}

// Thông báo nói rõ dòng nào phải xóa hoặc chỉnh; null = dòng đặt được
function describeLineProblem(line: LineInfo): string | null {
  const label = `${line.name} (${line.size}, ${line.color})`;
  if (!line.purchasable) {
    return `${label} hiện không còn được bán, vui lòng xóa khỏi giỏ hàng`;
  }
  if (line.available <= 0) {
    return `${label} đã hết hàng, vui lòng xóa khỏi giỏ hàng`;
  }
  if (line.quantity > line.available) {
    return `${label} chỉ còn ${line.available} sản phẩm, vui lòng giảm số lượng trong giỏ hàng`;
  }
  return null;
}

const REORDER_MESSAGES: Record<
  AddManyReason,
  (label: string, got: number, wanted: number) => string
> = {
  UNAVAILABLE: (label) => `${label} hiện không còn được bán`,
  OUT_OF_STOCK: (label) => `${label} đã hết hàng`,
  MAX_QUANTITY_REACHED: (label) =>
    `${label} đã đạt số lượng tối đa trong giỏ hàng`,
  QUANTITY_REDUCED: (label, got, wanted) =>
    `${label} chỉ thêm được ${got}/${wanted} sản phẩm do giới hạn tồn kho hoặc số lượng tối đa mỗi sản phẩm trong giỏ`,
};

function reorderMessage(
  item: { productName: string; size: string; color: string },
  result: { added: number; quantity: number; reason: AddManyReason | null },
) {
  const label = `${item.productName} (${item.size}, ${item.color})`;
  return REORDER_MESSAGES[result.reason!](label, result.added, result.quantity);
}

const toVoucherInfo = (voucher: VoucherRow) => ({
  code: voucher.code,
  description: voucher.description,
  discountType: voucher.discountType,
  discountValue: voucher.discountValue,
  maxDiscount: voucher.maxDiscount,
  minOrderValue: voucher.minOrderValue,
});

export function parseIdempotencyKey(raw: unknown): string | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (typeof raw !== 'string' || !IDEMPOTENCY_KEY_REGEX.test(raw)) {
    throw badRequest(
      ORDER_ERROR.IDEMPOTENCY_KEY_INVALID,
      'Idempotency-Key phải gồm 8-64 ký tự chữ, số hoặc . _ : -',
    );
  }
  return raw;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly locations: LocationsService,
    private readonly workflow: OrderWorkflowService,
    private readonly cart: CartService,
  ) {}

  // ===== Xem trước =====

  // Chỉ đọc: không khóa, không ghi. Dòng không mua được trả trong `warnings`, voucher sai thì ném lỗi có code.
  async preview(userId: number, dto: PreviewOrderDto) {
    const now = new Date();
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      select: { items: { select: cartItemSelect, orderBy: { id: 'asc' } } },
    });
    const rows = cart?.items ?? [];
    if (rows.length === 0) throw cartEmpty();

    const warnings: {
      cartItemId: number;
      variantId: number;
      message: string;
    }[] = [];
    let subtotal = 0;
    for (const row of rows) {
      const message = describeLineProblem({
        name: row.variant.product.name,
        size: row.variant.size,
        color: row.variant.color,
        quantity: row.quantity,
        purchasable: isPurchasable(row.variant),
        available: getAvailable(row.variant),
      });
      if (message) {
        warnings.push({
          cartItemId: row.id,
          variantId: row.variantId,
          message,
        });
      } else {
        subtotal += row.variant.product.price * row.quantity;
      }
    }

    let voucher: VoucherRow | null = null;
    if (dto.voucherCode) {
      voucher = await this.prisma.voucher.findUnique({
        where: { code: normalizeVoucherCode(dto.voucherCode) },
        select: voucherSelect,
      });
      if (!voucher) throw voucherNotFound();
      assertVoucherUsable(voucher, subtotal, now);
    }

    return {
      items: rows.map(toCartItem),
      warnings,
      canCheckout: warnings.length === 0,
      ...calculatePricing(subtotal, voucher),
      voucher: voucher ? toVoucherInfo(voucher) : null,
    };
  }

  // ===== Đặt đơn =====

  async create(
    user: AuthUser,
    dto: CreateOrderDto,
    rawIdempotencyKey?: unknown,
  ) {
    const idempotencyKey = parseIdempotencyKey(rawIdempotencyKey);
    if (dto.paymentMethod !== PaymentMethod.COD) {
      throw badRequest(
        ORDER_ERROR.PAYMENT_METHOD_NOT_SUPPORTED,
        'Chưa hỗ trợ thanh toán online',
      );
    }
    // Kiểm địa chỉ trước khi mở transaction (dữ liệu trong bộ nhớ, không cần DB)
    const address = this.locations.resolveAddress(
      dto.provinceCode,
      dto.districtCode,
      dto.wardCode,
    );
    const now = new Date();

    try {
      // Đề nghị READ COMMITTED để các lần đọc thường thấy giá mới nhất. Thiết kế KHÔNG phụ thuộc vào đây: tồn lấy từ
      // câu khóa, lượt voucher do UPDATE có điều kiện quyết định (chưa xác minh adapter áp dụng đúng mức này).
      const order = await runWithRetry(
        this.prisma,
        (tx) =>
          this.createInTransaction(tx, user, dto, address, now, idempotencyKey),
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
      );
      return toCustomerOrder(order);
    } catch (error) {
      // Lưới an toàn: khóa giỏ đã tuần tự hóa nên thường không tới đây
      if (idempotencyKey && isPrismaCode(error, 'P2002')) {
        const existing = await this.prisma.order.findFirst({
          where: { userId: user.id, idempotencyKey },
          select: customerOrderSelect,
        });
        if (existing) return toCustomerOrder(existing);
      }
      throw error;
    }
  }

  private async createInTransaction(
    tx: Prisma.TransactionClient,
    user: AuthUser,
    dto: CreateOrderDto,
    address: ReturnType<LocationsService['resolveAddress']>,
    now: Date,
    idempotencyKey: string | undefined,
  ) {
    const userId = user.id;

    // (0) Khóa giỏ: hai request đặt đơn của cùng một user chạy lần lượt
    const [cartRow] = await tx.$queryRaw<{ id: number }[]>(
      Prisma.sql`SELECT id FROM carts WHERE userId = ${userId} FOR UPDATE`,
    );
    if (!cartRow) throw cartEmpty();
    const cartId = Number(cartRow.id);

    // Idempotency-Key: đã có đơn với (userId, key) thì trả lại đúng đơn đó, không báo giỏ trống
    if (idempotencyKey) {
      const existing = await tx.order.findFirst({
        where: { userId, idempotencyKey },
        select: customerOrderSelect,
      });
      if (existing) return existing;
    }

    const cartItems = await tx.cartItem.findMany({
      where: { cartId },
      select: { id: true, variantId: true, quantity: true },
      orderBy: { variantId: 'asc' },
    });
    if (cartItems.length === 0) throw cartEmpty();
    const variantIds = cartItems.map((item) => item.variantId);

    // (a) Khóa các biến thể theo variantId tăng dần, chỉ trên product_variants (quét theo khóa chính).
    // Tồn (stock, reserved) lấy từ chính câu khóa này, không đọc thường.
    const locked = await tx.$queryRaw<
      {
        id: number;
        stock: number;
        reserved: number;
        isActive: number | boolean;
      }[]
    >(
      Prisma.sql`SELECT id, stock, reserved, isActive FROM product_variants WHERE id IN (${Prisma.join(variantIds)}) ORDER BY id FOR UPDATE`,
    );
    const lockedById = new Map(locked.map((row) => [Number(row.id), row]));

    // Tên, giá, ảnh đọc bằng truy vấn thường
    const details = await tx.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: {
        id: true,
        sku: true,
        size: true,
        color: true,
        colorHex: true,
        product: {
          select: {
            name: true,
            price: true,
            isActive: true,
            imageUrl: true,
            images: { select: { url: true }, orderBy: imageOrder, take: 1 },
          },
        },
      },
    });
    const detailById = new Map(details.map((row) => [row.id, row]));

    const problems: { field: string; message: string }[] = [];
    const lines: {
      variantId: number;
      quantity: number;
      detail: (typeof details)[number];
    }[] = [];
    for (const item of cartItems) {
      const detail = detailById.get(item.variantId);
      const stockRow = lockedById.get(item.variantId);
      if (!detail || !stockRow) {
        problems.push({
          field: `items.${item.id}`,
          message:
            'Sản phẩm trong giỏ không còn tồn tại, vui lòng xóa khỏi giỏ hàng',
        });
        continue;
      }
      const message = describeLineProblem({
        name: detail.product.name,
        size: detail.size,
        color: detail.color,
        quantity: item.quantity,
        purchasable: Boolean(stockRow.isActive) && detail.product.isActive,
        available: getAvailable({
          stock: Number(stockRow.stock),
          reserved: Number(stockRow.reserved),
        }),
      });
      if (message) {
        problems.push({ field: `items.${item.id}`, message });
      } else {
        lines.push({
          variantId: item.variantId,
          quantity: item.quantity,
          detail,
        });
      }
    }
    if (problems.length > 0) {
      throw conflict(
        ORDER_ERROR.CART_ITEMS_UNAVAILABLE,
        `Giỏ hàng có ${problems.length} sản phẩm không thể đặt: ${problems.map((p) => p.message).join('; ')}`,
        { errors: problems },
      );
    }

    const subtotal = lines.reduce(
      (sum, line) => sum + line.detail.product.price * line.quantity,
      0,
    );

    // (b) Voucher: khóa dòng (chỉ lấy id), rồi đọc bằng Prisma để có Date đúng kiểu
    let voucher: VoucherRow | null = null;
    if (dto.voucherCode) {
      const code = normalizeVoucherCode(dto.voucherCode);
      const [voucherLock] = await tx.$queryRaw<{ id: number }[]>(
        Prisma.sql`SELECT id FROM vouchers WHERE code = ${code} FOR UPDATE`,
      );
      if (!voucherLock) throw voucherNotFound();
      voucher = await tx.voucher.findUnique({
        where: { id: Number(voucherLock.id) },
        select: voucherSelect,
      });
      if (!voucher) throw voucherNotFound();
      assertVoucherUsable(voucher, subtotal, now);
    }
    const pricing = calculatePricing(subtotal, voucher);

    if (voucher) {
      // Tăng lượt nguyên tử: UPDATE có điều kiện, kiểm số dòng bị ảnh hưởng. 0 dòng thì rollback cả đơn.
      const affected = await tx.$executeRaw(
        Prisma.sql`UPDATE vouchers SET usedCount = usedCount + 1 WHERE id = ${voucher.id} AND isActive = 1 AND startsAt <= ${now} AND expiresAt >= ${now} AND minOrderValue <= ${subtotal} AND (usageLimit IS NULL OR usedCount < usageLimit)`,
      );
      if (affected !== 1) {
        const fresh = await tx.voucher.findUnique({
          where: { id: voucher.id },
          select: voucherSelect,
        });
        if (fresh) assertVoucherUsable(fresh, subtotal, now);
        throw badRequest(
          ORDER_ERROR.VOUCHER_USAGE_LIMIT,
          'Mã giảm giá đã hết lượt sử dụng',
        );
      }
    }

    // Giữ chỗ theo variantId tăng dần; điều kiện stock - reserved >= n chặn bán vượt tồn
    for (const line of lines) {
      const affected = await tx.$executeRaw(
        Prisma.sql`UPDATE product_variants SET reserved = reserved + ${line.quantity} WHERE id = ${line.variantId} AND stock - reserved >= ${line.quantity}`,
      );
      if (affected !== 1) {
        throw conflict(
          ORDER_ERROR.CART_ITEMS_UNAVAILABLE,
          'Một số sản phẩm vừa hết hàng, vui lòng kiểm tra lại giỏ hàng',
        );
      }
    }

    const orderData = {
      userId,
      customerName: dto.receiverName,
      customerPhone: dto.phone,
      customerEmail: user.email,
      shippingAddress: formatShippingAddress(dto.addressLine, address),
      provinceCode: address.province.code,
      provinceName: address.province.name,
      districtCode: address.district.code,
      districtName: address.district.name,
      wardCode: address.ward?.code ?? null,
      wardName: address.ward?.name ?? null,
      addressLine: dto.addressLine,
      note: dto.note ?? null,
      subtotal: pricing.subtotal,
      shippingFee: pricing.shippingFee,
      voucherId: voucher?.id ?? null,
      voucherCode: voucher?.code ?? null,
      discountAmount: pricing.discountAmount,
      totalAmount: pricing.totalAmount,
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.UNPAID,
      status: OrderStatus.PENDING,
      idempotencyKey: idempotencyKey ?? null,
      items: {
        create: lines.map(({ variantId, quantity, detail }) => ({
          variantId,
          productName: detail.product.name,
          sku: detail.sku,
          size: detail.size,
          color: detail.color,
          colorHex: detail.colorHex,
          // Chụp đúng product_images.url của ảnh đầu; dự phòng cột imageUrl cũ khi chưa có ảnh
          imageUrl:
            detail.product.images[0]?.url ?? detail.product.imageUrl ?? null,
          quantity,
          price: detail.product.price,
        })),
      },
      statusHistories: {
        create: {
          fromStatus: null,
          toStatus: OrderStatus.PENDING,
          actorId: userId,
          reason: null,
        },
      },
    } satisfies Omit<Prisma.OrderUncheckedCreateInput, 'code'>;

    const order = await this.insertOrder(tx, orderData, now);

    // Dọn đúng các dòng đã đặt (mọi dòng đều đặt được nếu tới được đây)
    await tx.cartItem.deleteMany({ where: { cartId } });
    return order;
  }

  // Mã đơn ngẫu nhiên: trùng (P2002 trên cột code) thì sinh lại, tối đa MAX_ORDER_CODE_ATTEMPTS lần
  private async insertOrder(
    tx: Prisma.TransactionClient,
    data: Omit<Prisma.OrderUncheckedCreateInput, 'code'>,
    now: Date,
  ) {
    for (let attempt = 1; ; attempt++) {
      try {
        return await tx.order.create({
          data: { ...data, code: generateOrderCode(now) },
          select: customerOrderSelect,
        });
      } catch (error) {
        const codeClash =
          isPrismaCode(error, 'P2002') &&
          JSON.stringify(
            (error as Prisma.PrismaClientKnownRequestError).meta ?? {},
          )
            .toLowerCase()
            .includes('code');
        if (!codeClash || attempt >= MAX_ORDER_CODE_ATTEMPTS) throw error;
      }
    }
  }

  // ===== Xem và hủy đơn của tôi =====

  // Một truy vấn có include (đơn + dòng hàng) nên không N+1. q khớp một phần mã đơn; collation utf8mb4_unicode_ci của DB
  // không phân biệt hoa thường, và luôn chỉ trong đơn của chính khách (where.userId).
  async findMine(userId: number, query: QueryMyOrdersDto) {
    const { page, limit, status, q, sortBy, order } = query;
    const where: Prisma.OrderWhereInput = {
      userId,
      ...(status && status.length > 0 && { status: { in: status } }),
      ...(q && { code: { contains: q } }),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        select: myOrderListSelect,
        orderBy: [{ [sortBy]: order }, { id: order }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);
    return new Paginated(rows.map(toMyOrderListItem), { page, limit, total });
  }

  // Số đơn theo nhóm, một truy vấn groupBy; `active` (pending + processing) dùng cho huy hiệu
  async summaryMine(userId: number) {
    const groups = await this.prisma.order.groupBy({
      by: ['status'],
      where: { userId },
      _count: { _all: true },
    });
    const byStatus = new Map<OrderStatus, number>(
      groups.map((g) => [g.status, g._count._all]),
    );
    const sum = (statuses: OrderStatus[]) =>
      statuses.reduce((total, s) => total + (byStatus.get(s) ?? 0), 0);
    const pending = sum([OrderStatus.PENDING, OrderStatus.PENDING_PAYMENT]);
    const processing = sum([OrderStatus.CONFIRMED, OrderStatus.SHIPPING]);
    return {
      total: sum(Object.values(OrderStatus)),
      pending,
      processing,
      completed: sum([OrderStatus.COMPLETED]),
      cancelled: sum([OrderStatus.CANCELLED]),
      active: pending + processing,
    };
  }

  // Mua lại: đưa dòng của đơn (của chính khách) vào giỏ bằng CartService (cùng khóa giỏ, retry P2034, quy tắc tồn và tối đa 10)
  async reorderMine(userId: number, code: string) {
    const order = await this.prisma.order.findFirst({
      where: { code, userId },
      select: {
        items: {
          select: {
            variantId: true,
            productName: true,
            size: true,
            color: true,
            quantity: true,
          },
          orderBy: { id: 'asc' },
        },
      },
    });
    if (!order) throw orderNotFound();

    const results = await this.cart.addManyBestEffort(
      userId,
      order.items.map((i) => ({
        variantId: i.variantId,
        quantity: i.quantity,
      })),
    );

    let added = 0;
    const skipped: {
      productName: string;
      size: string;
      color: string;
      reason: AddManyReason;
      message: string;
    }[] = [];
    results.forEach((result, index) => {
      const item = order.items[index];
      if (result.added > 0) added += 1;
      if (result.reason) {
        skipped.push({
          productName: item.productName,
          size: item.size,
          color: item.color,
          reason: result.reason,
          message: reorderMessage(item, result),
        });
      }
    });

    if (added === 0) {
      throw conflict(
        ORDER_ERROR.REORDER_NOTHING_ADDED,
        'Không có sản phẩm nào trong đơn này có thể thêm vào giỏ hàng',
        {
          errors: skipped.map((s, i) => ({
            field: `items.${i}`,
            message: s.message,
          })),
        },
      );
    }
    return { added, skipped };
  }

  // Lọc theo userId nên đơn của người khác trả 404 như đơn không tồn tại
  async findMineByCode(userId: number, code: string) {
    const row = await this.prisma.order.findFirst({
      where: { code, userId },
      select: customerOrderSelect,
    });
    if (!row) throw orderNotFound();
    return toCustomerOrder(row);
  }

  async cancelMine(userId: number, code: string, dto: CancelOrderDto) {
    const now = new Date();
    await runWithRetry(this.prisma, async (tx) => {
      const own = await tx.order.findFirst({
        where: { code, userId },
        select: { id: true },
      });
      if (!own) throw orderNotFound();
      await this.workflow.transition(tx, {
        orderId: own.id,
        to: OrderStatus.CANCELLED,
        actor: { id: userId, role: 'CUSTOMER' },
        reason: dto.reason ?? DEFAULT_CUSTOMER_CANCEL_REASON,
        now,
      });
    });
    return this.findMineByCode(userId, code);
  }
}
