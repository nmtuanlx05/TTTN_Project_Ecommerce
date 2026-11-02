import { Injectable, NotFoundException } from '@nestjs/common';
import { Paginated } from '../common/paginated';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { ExportStockDto } from './dto/export-stock.dto';
import { ImportStockDto } from './dto/import-stock.dto';
import { QueryInventorySummaryDto } from './dto/query-inventory-summary.dto';
import { QueryInventoryDto } from './dto/query-inventory.dto';
import { QueryMovementsDto } from './dto/query-movements.dto';
import {
  buildCountQuery,
  buildListIdsQuery,
  buildSummaryQuery,
} from './inventory.queries';
import type { InventoryFilter } from './inventory.queries';
import {
  escapeLike,
  inventoryVariantSelect,
  stockMovementSelect,
  toInventoryItem,
} from './inventory.mapper';
import { planStockChange } from './inventory.rules';
import type { StockChange } from './inventory.rules';

interface LockedVariant {
  id: number;
  stock: number;
  reserved: number;
}

const variantNotFound = (id: number) =>
  new NotFoundException(`Không tìm thấy biến thể với ID #${id}`);

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  // ===== Xem tồn kho =====

  async findAll(query: QueryInventoryDto) {
    const { q, categoryId, stockStatus, sortBy, order, includeHidden } = query;
    const { page, limit } = query;

    const categoryIds = await this.resolveCategoryIds(categoryId);
    // Danh mục không tồn tại: không có gì để lọc ra, trả rỗng thay vì dựng SQL với danh sách trống
    if (categoryIds?.length === 0) {
      return new Paginated([], { page, limit, total: 0 });
    }

    const filter: InventoryFilter = {
      categoryIds,
      includeHidden,
      likeText: q ? escapeLike(q) : undefined,
      stockStatus,
    };

    // Bước 1 (SQL thô): id biến thể của trang hiện tại và tổng số, trong cùng một transaction
    const [idRows, countRows] = await this.prisma.$transaction([
      this.prisma.$queryRaw<{ id: number }[]>(
        buildListIdsQuery(filter, sortBy, order, limit, (page - 1) * limit),
      ),
      this.prisma.$queryRaw<{ total: bigint | number }[]>(
        buildCountQuery(filter),
      ),
    ]);
    const total = Number(countRows[0]?.total ?? 0);
    if (idRows.length === 0) {
      return new Paginated([], { page, limit, total });
    }

    // Bước 2 (Prisma): lấy chi tiết một lượt theo các id, rồi xếp lại đúng thứ tự của bước 1
    const ids = idRows.map((row) => Number(row.id));
    const rows = await this.prisma.productVariant.findMany({
      where: { id: { in: ids } },
      select: inventoryVariantSelect,
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    const items = ids.flatMap((id) => {
      const row = byId.get(id);
      return row ? [toInventoryItem(row)] : [];
    });

    return new Paginated(items, { page, limit, total });
  }

  async getSummary(query: QueryInventorySummaryDto) {
    const { categoryId, includeHidden } = query;

    const categoryIds = await this.resolveCategoryIds(categoryId);
    if (categoryIds?.length === 0) {
      return { total: 0, inStock: 0, low: 0, out: 0 };
    }

    const [row] = await this.prisma.$queryRaw<
      Record<'total' | 'inStock' | 'low' | 'out', bigint | number | string>[]
    >(buildSummaryQuery({ categoryIds, includeHidden }));

    // COUNT/SUM trả BigInt hoặc Decimal nên phải ép về number
    return {
      total: Number(row?.total ?? 0),
      inStock: Number(row?.inStock ?? 0),
      low: Number(row?.low ?? 0),
      out: Number(row?.out ?? 0),
    };
  }

  // ===== Đổi tồn =====
  // Các thao tác nhận `tx` tùy chọn: module đơn hàng sau này truyền transaction của mình vào để
  // đổi tồn cùng một transaction với việc đổi trạng thái đơn.
  // Không lọc theo isActive: biến thể/sản phẩm đã ẩn vẫn tồn tại thật trong kho nên vẫn thao tác được.

  importStock(
    variantId: number,
    dto: ImportStockDto,
    userId: number,
    tx?: Prisma.TransactionClient,
  ) {
    return this.changeStock(
      variantId,
      { type: 'IMPORT', quantity: dto.quantity, note: dto.note ?? null },
      userId,
      tx,
    );
  }

  exportStock(
    variantId: number,
    dto: ExportStockDto,
    userId: number,
    tx?: Prisma.TransactionClient,
  ) {
    return this.changeStock(
      variantId,
      {
        type: 'EXPORT',
        quantity: dto.quantity,
        reason: dto.reason,
        note: dto.note ?? null,
      },
      userId,
      tx,
    );
  }

  adjustStock(
    variantId: number,
    dto: AdjustStockDto,
    userId: number,
    tx?: Prisma.TransactionClient,
  ) {
    return this.changeStock(
      variantId,
      {
        type: 'ADJUST',
        newStock: dto.newStock,
        reason: dto.reason,
        note: dto.note ?? null,
      },
      userId,
      tx,
    );
  }

  async changeStock(
    variantId: number,
    change: StockChange,
    userId: number,
    tx?: Prisma.TransactionClient,
  ) {
    if (tx) {
      return this.applyStockChange(tx, variantId, change, userId);
    }
    return this.prisma.$transaction((innerTx) =>
      this.applyStockChange(innerTx, variantId, change, userId),
    );
  }

  private async applyStockChange(
    tx: Prisma.TransactionClient,
    variantId: number,
    change: StockChange,
    userId: number,
  ) {
    // Khóa dòng biến thể tới hết transaction: request đồng thời cùng biến thể phải chờ,
    // sau đó đọc được tồn mới nhất nên không mất cập nhật và không âm tồn.
    const [locked] = await tx.$queryRaw<LockedVariant[]>(
      Prisma.sql`SELECT id, stock, reserved FROM product_variants WHERE id = ${variantId} FOR UPDATE`,
    );
    if (!locked) {
      throw variantNotFound(variantId);
    }

    // stockBefore/stockAfter lấy từ giá trị đã khóa, không từ lần đọc nào trước đó
    const stockBefore = Number(locked.stock);
    const plan = planStockChange(change, {
      stock: stockBefore,
      reserved: Number(locked.reserved),
    });

    const variant = await tx.productVariant.update({
      where: { id: variantId },
      data: { stock: plan.stockAfter },
      select: inventoryVariantSelect,
    });
    const movement = await tx.stockMovement.create({
      data: {
        variantId,
        type: plan.type,
        quantity: plan.delta,
        stockBefore,
        stockAfter: plan.stockAfter,
        reason: plan.reason,
        note: plan.note,
        createdById: userId,
      },
      select: stockMovementSelect,
    });

    return { variant: toInventoryItem(variant), movement };
  }

  // Đổi ngưỡng không đổi tồn nên không ghi movement
  async updateMinStock(variantId: number, minStock: number) {
    try {
      const variant = await this.prisma.productVariant.update({
        where: { id: variantId },
        data: { minStock },
        select: inventoryVariantSelect,
      });
      return toInventoryItem(variant);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw variantNotFound(variantId);
      }
      throw error;
    }
  }

  // ===== Lịch sử =====

  async findMovements(variantId: number, query: QueryMovementsDto) {
    const { page, limit } = query;

    // Kiểm tra biến thể cùng lượt với danh sách để id không tồn tại trả 404 thay vì danh sách rỗng
    const [variant, rows, total] = await this.prisma.$transaction([
      this.prisma.productVariant.findUnique({
        where: { id: variantId },
        select: { id: true },
      }),
      this.prisma.stockMovement.findMany({
        where: { variantId },
        select: stockMovementSelect,
        // id làm khóa phụ để thứ tự ổn định khi nhiều lần đổi cùng một mili giây
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.stockMovement.count({ where: { variantId } }),
    ]);
    if (!variant) {
      throw variantNotFound(variantId);
    }

    return new Paginated(rows, { page, limit, total });
  }

  // ===== Danh mục =====

  // undefined = không lọc theo danh mục; mảng rỗng = danh mục không tồn tại
  private async resolveCategoryIds(categoryId?: number) {
    if (categoryId === undefined) return undefined;
    const root = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });
    return root ? this.collectCategoryIds(categoryId) : [];
  }

  // Sao chép từ ProductsService.collectCategoryIds (src/products/products.service.ts), cố ý không
  // dùng chung để không sửa module products. Nếu bản gốc đổi thì sửa theo ở đây.
  // Danh mục + toàn bộ danh mục con/cháu; mỗi cấp cây một truy vấn.
  private async collectCategoryIds(rootId: number) {
    const ids = new Set<number>([rootId]);
    let frontier = [rootId];
    while (frontier.length > 0) {
      const children = await this.prisma.category.findMany({
        where: { parentId: { in: frontier } },
        select: { id: true },
      });
      frontier = children.map((c) => c.id).filter((id) => !ids.has(id));
      frontier.forEach((id) => ids.add(id));
    }
    return [...ids];
  }
}
