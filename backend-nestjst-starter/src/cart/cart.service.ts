import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { getAvailable } from '../inventory/inventory.mapper';
import { PrismaService } from '../prisma/prisma.service';
import { MAX_QUANTITY_PER_ITEM, MAX_TX_RETRIES } from './cart.constants';
import { cartItemSelect, isPurchasable, toCart } from './cart.mapper';

const itemNotFound = () =>
  new NotFoundException('Không tìm thấy sản phẩm trong giỏ hàng');

const isPrismaCode = (error: unknown, code: string) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;

// Kết quả từng dòng của addManyBestEffort: added = số lượng thực sự thêm vào giỏ; reason null = thêm đủ
export type AddManyReason =
  | 'UNAVAILABLE'
  | 'OUT_OF_STOCK'
  | 'MAX_QUANTITY_REACHED'
  | 'QUANTITY_REDUCED';
export interface AddManyResult {
  variantId: number;
  quantity: number;
  added: number;
  reason: AddManyReason | null;
}

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  // Chỉ đọc: chưa có giỏ thì trả giỏ rỗng, không tạo bản ghi
  async getCart(userId: number) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      select: {
        items: { select: cartItemSelect, orderBy: { id: 'asc' } },
      },
    });
    return toCart(cart?.items ?? []);
  }

  // Thêm món; biến thể đã có trong giỏ thì cộng dồn
  async addItem(userId: number, variantId: number, quantity: number) {
    await this.writeInTransaction(async (tx) => {
      const cartId = await this.lockCart(tx, userId, true);
      const available = await this.getSellableStock(tx, variantId);

      const existing = await tx.cartItem.findUnique({
        where: { cartId_variantId: { cartId, variantId } },
        select: { id: true, quantity: true },
      });
      const current = existing?.quantity ?? 0;
      this.assertQuantity(current + quantity, current, available);

      if (existing) {
        await tx.cartItem.update({
          where: { id: existing.id },
          data: { quantity: current + quantity },
        });
      } else {
        await tx.cartItem.create({ data: { cartId, variantId, quantity } });
      }
    });
    return this.getCart(userId);
  }

  // Đặt số lượng tuyệt đối cho dòng thuộc giỏ của chính user
  async updateItem(userId: number, itemId: number, quantity: number) {
    await this.writeInTransaction(async (tx) => {
      const cartId = await this.lockCart(tx, userId, false);
      const item = await tx.cartItem.findFirst({
        where: { id: itemId, cartId },
        select: { id: true, variantId: true, quantity: true },
      });
      if (!item) throw itemNotFound();

      const available = await this.getSellableStock(tx, item.variantId);
      this.assertQuantity(quantity, item.quantity, available);
      await tx.cartItem.update({ where: { id: item.id }, data: { quantity } });
    });
    return this.getCart(userId);
  }

  // Lọc theo cart.userId nên dòng của người khác không xóa được và trả 404 như dòng không tồn tại
  async removeItem(userId: number, itemId: number) {
    const { count } = await this.prisma.cartItem.deleteMany({
      where: { id: itemId, cart: { userId } },
    });
    if (count === 0) throw itemNotFound();
    return this.getCart(userId);
  }

  // Xóa các dòng, giữ lại bản ghi Cart
  async clear(userId: number) {
    await this.prisma.cartItem.deleteMany({ where: { cart: { userId } } });
    return this.getCart(userId);
  }

  // Thêm nhiều món một lượt (mua lại đơn cũ), cùng khóa giỏ và cùng quy tắc với addItem nhưng KHÔNG ném lỗi theo từng dòng:
  // mỗi dòng trả kết quả riêng. Số lượng thêm được = min(muốn thêm, 10 - đang có, tồn khả dụng - đang có).
  async addManyBestEffort(
    userId: number,
    lines: { variantId: number; quantity: number }[],
  ): Promise<AddManyResult[]> {
    return this.writeInTransaction(async (tx) => {
      const cartId = await this.lockCart(tx, userId, true);
      const results: AddManyResult[] = [];
      for (const line of lines) {
        const variant = await tx.productVariant.findUnique({
          where: { id: line.variantId },
          select: {
            stock: true,
            reserved: true,
            isActive: true,
            product: { select: { isActive: true } },
          },
        });
        if (!variant || !isPurchasable(variant)) {
          results.push({ ...line, added: 0, reason: 'UNAVAILABLE' });
          continue;
        }
        const available = getAvailable(variant);
        if (available <= 0) {
          results.push({ ...line, added: 0, reason: 'OUT_OF_STOCK' });
          continue;
        }

        const existing = await tx.cartItem.findUnique({
          where: { cartId_variantId: { cartId, variantId: line.variantId } },
          select: { id: true, quantity: true },
        });
        const current = existing?.quantity ?? 0;
        const wanted = current + line.quantity;
        const target = Math.min(wanted, MAX_QUANTITY_PER_ITEM, available);
        const added = target - current;
        if (added <= 0) {
          // Giỏ đã chạm trần 10 hoặc đã có đủ số còn bán được
          results.push({
            ...line,
            added: 0,
            reason:
              current >= MAX_QUANTITY_PER_ITEM
                ? 'MAX_QUANTITY_REACHED'
                : 'OUT_OF_STOCK',
          });
          continue;
        }
        if (existing) {
          await tx.cartItem.update({
            where: { id: existing.id },
            data: { quantity: target },
          });
        } else {
          await tx.cartItem.create({
            data: { cartId, variantId: line.variantId, quantity: target },
          });
        }
        results.push({
          ...line,
          added,
          reason: target < wanted ? 'QUANTITY_REDUCED' : null,
        });
      }
      return results;
    });
  }

  // Chạy lại khi MySQL báo deadlock/write conflict (P2034); P2002 lọt qua khóa thì trả 409 rõ ràng
  private async writeInTransaction<T>(
    work: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.prisma.$transaction(work);
      } catch (error) {
        if (isPrismaCode(error, 'P2034') && attempt < MAX_TX_RETRIES) continue;
        if (isPrismaCode(error, 'P2034') || isPrismaCode(error, 'P2002')) {
          throw new ConflictException(
            'Giỏ hàng đang được cập nhật, vui lòng thử lại',
          );
        }
        throw error;
      }
    }
  }

  // Khóa dòng giỏ tới hết transaction: các thao tác ghi của cùng một user chạy lần lượt,
  // nên cộng dồn đồng thời không vượt giới hạn. create = true thì tạo giỏ nếu chưa có.
  private async lockCart(
    tx: Prisma.TransactionClient,
    userId: number,
    create: boolean,
  ) {
    // Đọc không khóa trước, chỉ tạo khi chưa có: tránh nhiều request cùng giữ khóa chia sẻ khi INSERT trùng
    if (create) {
      const exists = await tx.cart.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!exists) {
        await tx.cart.createMany({ data: [{ userId }], skipDuplicates: true });
      }
    }
    const [locked] = await tx.$queryRaw<{ id: number }[]>(
      Prisma.sql`SELECT id FROM carts WHERE userId = ${userId} FOR UPDATE`,
    );
    if (!locked) throw itemNotFound();
    return Number(locked.id);
  }

  // Trả số còn có thể bán (stock - reserved) của biến thể đang bán; nếu không được phép thêm thì ném lỗi
  private async getSellableStock(
    tx: Prisma.TransactionClient,
    variantId: number,
  ) {
    const variant = await tx.productVariant.findUnique({
      where: { id: variantId },
      select: {
        stock: true,
        reserved: true,
        isActive: true,
        product: { select: { isActive: true } },
      },
    });
    if (!variant) throw new NotFoundException('Không tìm thấy sản phẩm');
    if (!isPurchasable(variant)) {
      throw new ConflictException('Sản phẩm này hiện không còn được bán');
    }
    const available = getAvailable(variant);
    if (available <= 0) throw new ConflictException('Sản phẩm đã hết hàng');
    return available;
  }

  // `total` là số lượng dòng sau khi ghi; `current` là số lượng đang có trong giỏ
  private assertQuantity(total: number, current: number, available: number) {
    if (total > MAX_QUANTITY_PER_ITEM) {
      throw new ConflictException(
        `Mỗi sản phẩm chỉ mua tối đa ${MAX_QUANTITY_PER_ITEM} trong một giỏ hàng (trong giỏ đã có ${current})`,
      );
    }
    if (total > available) {
      throw new ConflictException(`Chỉ còn ${available} sản phẩm có thể mua`);
    }
  }
}
