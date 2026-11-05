import { Injectable } from '@nestjs/common';
import { DiscountType } from '../generated/prisma/enums';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Số voucher tối đa trả về
export const MAX_AVAILABLE_VOUCHERS = 20;

interface AvailableVoucherRow {
  code: string;
  description: string | null;
  discountType: DiscountType;
  discountValue: number;
  maxDiscount: number | null;
  minOrderValue: number;
  expiresAt: Date;
}

@Injectable()
export class VouchersService {
  constructor(private readonly prisma: PrismaService) {}

  // Cùng quy tắc với assertVoucherUsable (orders): isActive, startsAt <= now <= expiresAt, còn lượt.
  // Prisma không so sánh được hai cột (usedCount < usageLimit) nên dùng SQL thô tham số hóa.
  // Không chọn id, usageLimit, usedCount nên không thể lộ ra API. minOrderValue chỉ để giao diện hiển thị
  // (không lọc theo giá trị giỏ: voucher chưa đủ đơn tối thiểu vẫn được liệt kê).
  async findAvailable(now: Date = new Date()) {
    const rows = await this.prisma.$queryRaw<AvailableVoucherRow[]>(
      Prisma.sql`SELECT code, description, discountType, discountValue, maxDiscount, minOrderValue, expiresAt
        FROM vouchers
        WHERE isActive = 1 AND startsAt <= ${now} AND expiresAt >= ${now}
          AND (usageLimit IS NULL OR usedCount < usageLimit)
        ORDER BY expiresAt ASC, code ASC
        LIMIT ${MAX_AVAILABLE_VOUCHERS}`,
    );
    // Chọn lại từng trường để chắc chắn không lọt cột nội bộ
    return rows.map((row) => ({
      code: row.code,
      description: row.description,
      discountType: row.discountType,
      discountValue: Number(row.discountValue),
      maxDiscount: row.maxDiscount === null ? null : Number(row.maxDiscount),
      minOrderValue: Number(row.minOrderValue),
      expiresAt: row.expiresAt,
    }));
  }
}
