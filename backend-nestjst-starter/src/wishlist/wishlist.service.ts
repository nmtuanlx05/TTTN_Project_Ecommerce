import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Paginated } from '../common/paginated';
import { conflict } from '../common/errors/coded-errors';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  publicProductListSelect,
  toPublicListItem,
} from '../products/products.mapper';
import { QueryWishlistDto } from './dto/query-wishlist.dto';
import {
  WISHLIST_MAX_ITEMS,
  WISHLIST_MAX_TX_RETRIES,
} from './wishlist.constants';

const isPrismaCode = (error: unknown, code: string) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;

// Wishlist theo SẢN PHẨM. Thẻ sản phẩm tái dùng đúng mapper của storefront (không viết lại).
@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  // Mới thêm trước. Sản phẩm đã tắt vẫn hiện (isAvailable = false) để khách tự bỏ khỏi danh sách.
  async list(userId: number, { page, limit }: QueryWishlistDto) {
    const where = { userId };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.wishlistItem.findMany({
        where,
        select: {
          createdAt: true,
          product: {
            select: { isActive: true, ...publicProductListSelect },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.wishlistItem.count({ where }),
    ]);

    const data = rows.map(({ createdAt, product }) => {
      const card = toPublicListItem(product);
      return {
        ...card,
        addedAt: createdAt,
        // Còn được kinh doanh: sản phẩm bật và có ít nhất một biến thể đang bán (select chỉ lấy biến thể isActive).
        // Đúng điều kiện để trang chi tiết công khai xem được và để POST thêm được; false = trang chi tiết 404.
        isListed: product.isActive && product.variants.length > 0,
        // Còn bán: sản phẩm đang bật và còn hàng (inStock đã kéo theo có biến thể đang bán)
        isAvailable: product.isActive && card.inStock,
      };
    });
    return new Paginated(data, { page, limit, total });
  }

  // Mảng id mới thêm trước, tối đa WISHLIST_MAX_ITEMS; gồm cả sản phẩm đã tắt để khớp số đếm của danh sách
  async listIds(userId: number) {
    const rows = await this.prisma.wishlistItem.findMany({
      where: { userId },
      select: { productId: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: WISHLIST_MAX_ITEMS,
    });
    return rows.map((r) => r.productId);
  }

  // Idempotent: đã có thì added=false, không lỗi. Chỉ thêm được sản phẩm đang bật và có biến thể đang bán.
  async add(userId: number, productId: number) {
    for (let attempt = 1; ; attempt++) {
      try {
        const added = await this.prisma.$transaction((tx) =>
          this.addInTransaction(tx, userId, productId),
        );
        return { productId, added };
      } catch (error) {
        // Hai request đồng thời cùng thêm một sản phẩm: bản kia đã ghi xong → coi như đã có
        if (isPrismaCode(error, 'P2002')) return { productId, added: false };
        if (isPrismaCode(error, 'P2034') && attempt < WISHLIST_MAX_TX_RETRIES) {
          continue;
        }
        if (isPrismaCode(error, 'P2034')) {
          throw new ConflictException(
            'Danh sách yêu thích đang được cập nhật, vui lòng thử lại',
          );
        }
        throw error;
      }
    }
  }

  // Idempotent: không có để bỏ vẫn thành công (removed=false)
  async remove(userId: number, productId: number) {
    const { count } = await this.prisma.wishlistItem.deleteMany({
      where: { userId, productId },
    });
    return { productId, removed: count > 0 };
  }

  private async addInTransaction(
    tx: Prisma.TransactionClient,
    userId: number,
    productId: number,
  ) {
    // Cùng điều kiện với trang chi tiết công khai: "thêm được" = "xem được"
    const product = await tx.product.findFirst({
      where: {
        id: productId,
        isActive: true,
        variants: { some: { isActive: true } },
      },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');

    // Khóa dòng user tới hết transaction: các lần thêm của cùng một khách chạy lần lượt,
    // nên không vượt trần dù nhiều request đồng thời (cùng mẫu khóa dòng carts ở giỏ hàng)
    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`,
    );

    // Đã có thì thành công ngay, kể cả khi đang đủ trần
    const existing = await tx.wishlistItem.findUnique({
      where: { userId_productId: { userId, productId } },
      select: { id: true },
    });
    if (existing) return false;

    const count = await tx.wishlistItem.count({ where: { userId } });
    if (count >= WISHLIST_MAX_ITEMS) {
      throw conflict(
        'WISHLIST_FULL',
        `Danh sách yêu thích đã đầy (tối đa ${WISHLIST_MAX_ITEMS} sản phẩm), hãy bỏ bớt trước khi thêm`,
      );
    }
    await tx.wishlistItem.create({ data: { userId, productId } });
    return true;
  }
}
