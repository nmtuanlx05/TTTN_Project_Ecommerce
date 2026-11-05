import { Injectable } from '@nestjs/common';
import { conflict, notFound } from '../common/errors/coded-errors';
import { Paginated } from '../common/paginated';
import { parseVnDate, toVnDateString } from '../common/utils/vn-date';
import { OrderStatus } from '../generated/prisma/enums';
import { Prisma } from '../generated/prisma/client';
import { runWithRetry, isPrismaCode } from '../orders/orders.tx';
import {
  getVoucherStatus,
  normalizeVoucherCode,
} from '../orders/vouchers.rules';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateVoucherDto } from './dto/create-voucher.dto';
import type { QueryAdminVouchersDto } from './dto/query-admin-vouchers.dto';
import type { UpdateVoucherDto } from './dto/update-voucher.dto';
import type { UpdateVoucherStatusDto } from './dto/update-voucher-status.dto';
import { assertNoLockedChange, validateVoucherConfig } from './vouchers.config';
import type { VoucherConfig, VoucherField } from './vouchers.config';
import {
  MAX_STATUS_FILTER_SCAN,
  VOUCHER_ADMIN_ERROR,
} from './vouchers.constants';
import { toAdminVoucher, voucherAdminSelect } from './vouchers.mapper';
import type { VoucherAdminRow } from './vouchers.mapper';

const codeExists = () =>
  conflict(VOUCHER_ADMIN_ERROR.VOUCHER_CODE_EXISTS, 'Mã voucher đã tồn tại');
const voucherMissing = () =>
  notFound(VOUCHER_ADMIN_ERROR.VOUCHER_NOT_FOUND, 'Không tìm thấy voucher');

// Ngày gửi lên trùng ngày VN của giá trị đang lưu thì coi là không đổi và giữ nguyên mốc giờ đã lưu
// (voucher seed có giờ lẻ không bị ghi đè thành 00:00:00.000 / 23:59:59.999).
function resolveVnDate(
  input: string | undefined,
  stored: Date,
  endOfDay: boolean,
  field: string,
): Date {
  if (input === undefined || input === toVnDateString(stored)) return stored;
  return parseVnDate(input, endOfDay, field);
}

@Injectable()
export class AdminVouchersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryAdminVouchersDto, now: Date = new Date()) {
    const { page, limit, q, status, sortBy, order } = query;
    const where: Prisma.VoucherWhereInput = q ? { code: { contains: q } } : {};
    const orderBy = [{ [sortBy]: order }, { id: order }] as const;

    if (!status) {
      const [rows, total] = await this.prisma.$transaction([
        this.prisma.voucher.findMany({
          where,
          orderBy: [...orderBy],
          skip: (page - 1) * limit,
          take: limit,
          select: voucherAdminSelect,
        }),
        this.prisma.voucher.count({ where }),
      ]);
      return new Paginated(
        rows.map((r) => toAdminVoucher(r, now)),
        { page, limit, total },
      );
    }

    // Lọc status trong bộ nhớ để dùng đúng getVoucherStatus (một nguồn sự thật); chỉ xét MAX_STATUS_FILTER_SCAN bản ghi đầu
    const rows = await this.prisma.voucher.findMany({
      where,
      orderBy: [...orderBy],
      take: MAX_STATUS_FILTER_SCAN,
      select: voucherAdminSelect,
    });
    const matched = rows.filter((r) => getVoucherStatus(r, now) === status);
    const start = (page - 1) * limit;
    return new Paginated(
      matched.slice(start, start + limit).map((r) => toAdminVoucher(r, now)),
      { page, limit, total: matched.length },
    );
  }

  async findOne(id: number, now: Date = new Date()) {
    const [row, agg] = await this.prisma.$transaction([
      this.prisma.voucher.findUnique({
        where: { id },
        select: voucherAdminSelect,
      }),
      this.prisma.order.aggregate({
        where: { voucherId: id, status: { not: OrderStatus.CANCELLED } },
        _count: { _all: true },
        _sum: { discountAmount: true },
      }),
    ]);
    if (!row) throw voucherMissing();
    return {
      ...toAdminVoucher(row, now),
      // Đơn đã dùng mã, không tính đơn hủy (RETURNED vẫn tính vì không hoàn lượt)
      stats: {
        usedCount: row.usedCount,
        ordersCount: agg._count._all,
        totalDiscount: agg._sum.discountAmount ?? 0,
      },
    };
  }

  async create(dto: CreateVoucherDto, now: Date = new Date()) {
    const config: VoucherConfig = {
      code: normalizeVoucherCode(dto.code),
      description: dto.description ?? null,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      maxDiscount: dto.maxDiscount ?? null,
      minOrderValue: dto.minOrderValue ?? 0,
      usageLimit: dto.usageLimit ?? null,
      usedCount: 0,
      startsAt: parseVnDate(dto.startsAtDate, false, 'startsAtDate'),
      expiresAt: parseVnDate(dto.expiresAtDate, true, 'expiresAtDate'),
    };
    validateVoucherConfig(config, {
      changed: new Set(Object.keys(config) as VoucherField[]),
      rejectPastExpiry: now,
    });
    try {
      const row = await this.prisma.voucher.create({
        data: {
          code: config.code,
          description: config.description,
          discountType: config.discountType,
          discountValue: config.discountValue,
          maxDiscount: config.maxDiscount,
          minOrderValue: config.minOrderValue,
          usageLimit: config.usageLimit,
          startsAt: config.startsAt,
          expiresAt: config.expiresAt,
        },
        select: voucherAdminSelect,
      });
      return toAdminVoucher(row, now);
    } catch (error) {
      if (isPrismaCode(error, 'P2002')) throw codeExists();
      throw error;
    }
  }

  async update(id: number, dto: UpdateVoucherDto, now: Date = new Date()) {
    try {
      const row = await runWithRetry(this.prisma, (tx) =>
        this.updateInTx(tx, id, dto),
      );
      return toAdminVoucher(row, now);
    } catch (error) {
      if (isPrismaCode(error, 'P2002')) throw codeExists();
      throw error;
    }
  }

  private async updateInTx(
    tx: Prisma.TransactionClient,
    id: number,
    dto: UpdateVoucherDto,
  ): Promise<VoucherAdminRow> {
    // Khóa dòng voucher (cùng khóa với lúc đặt đơn) để usedCount không đổi giữa lúc kiểm và lúc ghi
    const locked = await tx.$queryRaw<{ id: number }[]>(
      Prisma.sql`SELECT id FROM vouchers WHERE id = ${id} FOR UPDATE`,
    );
    if (locked.length === 0) throw voucherMissing();
    const stored = await tx.voucher.findUnique({
      where: { id },
      select: voucherAdminSelect,
    });
    if (!stored) throw voucherMissing();

    const next: VoucherConfig = { ...stored };
    const changed = new Set<VoucherField>();
    const assign = <K extends VoucherField>(
      key: K,
      value: VoucherConfig[K] | undefined,
    ) => {
      if (value === undefined || value === stored[key]) return;
      next[key] = value;
      changed.add(key);
    };
    assign(
      'code',
      dto.code === undefined ? undefined : normalizeVoucherCode(dto.code),
    );
    assign('description', dto.description);
    assign('discountType', dto.discountType);
    assign('discountValue', dto.discountValue);
    assign('maxDiscount', dto.maxDiscount);
    assign('minOrderValue', dto.minOrderValue);
    assign('usageLimit', dto.usageLimit);
    const startsAt = resolveVnDate(
      dto.startsAtDate,
      stored.startsAt,
      false,
      'startsAtDate',
    );
    const expiresAt = resolveVnDate(
      dto.expiresAtDate,
      stored.expiresAt,
      true,
      'expiresAtDate',
    );
    if (startsAt !== stored.startsAt) {
      next.startsAt = startsAt;
      changed.add('startsAt');
    }
    if (expiresAt !== stored.expiresAt) {
      next.expiresAt = expiresAt;
      changed.add('expiresAt');
    }

    assertNoLockedChange(stored.usedCount, changed);
    validateVoucherConfig(next, { changed });
    if (changed.size === 0) return stored;

    const data: Record<string, unknown> = {};
    for (const key of changed) data[key] = next[key];
    return tx.voucher.update({
      where: { id },
      data,
      select: voucherAdminSelect,
    });
  }

  async updateStatus(
    id: number,
    dto: UpdateVoucherStatusDto,
    now: Date = new Date(),
  ) {
    try {
      const row = await this.prisma.voucher.update({
        where: { id },
        data: { isActive: dto.isActive },
        select: voucherAdminSelect,
      });
      return toAdminVoucher(row, now);
    } catch (error) {
      if (isPrismaCode(error, 'P2025')) throw voucherMissing();
      throw error;
    }
  }
}
