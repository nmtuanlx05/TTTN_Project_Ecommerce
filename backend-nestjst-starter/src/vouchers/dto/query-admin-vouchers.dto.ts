import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Trim } from '../../common/transforms/trim';
import { VOUCHER_STATUSES } from '../../orders/vouchers.rules';
import type { VoucherStatus } from '../../orders/vouchers.rules';
import { VOUCHER_SORT_FIELDS } from '../vouchers.constants';
import type { VoucherSortField } from '../vouchers.constants';

export class QueryAdminVouchersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page phải là số nguyên' })
  @Min(1, { message: 'page phải lớn hơn hoặc bằng 1' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit phải là số nguyên' })
  @Min(1, { message: 'limit phải lớn hơn hoặc bằng 1' })
  @Max(100, { message: 'limit không được vượt quá 100' })
  limit: number = 10;

  // Tìm theo mã (khớp một phần, không phân biệt hoa thường)
  @IsOptional()
  @Trim()
  @IsString({ message: 'Từ khóa tìm kiếm phải là chuỗi' })
  @MaxLength(50, { message: 'Từ khóa tìm kiếm không được vượt quá 50 ký tự' })
  q?: string;

  @IsOptional()
  @IsIn(VOUCHER_STATUSES, {
    message:
      'status phải là ACTIVE, INACTIVE, SCHEDULED, EXPIRED hoặc EXHAUSTED',
  })
  status?: VoucherStatus;

  @IsOptional()
  @IsIn(VOUCHER_SORT_FIELDS, {
    message:
      'sortBy phải là createdAt, code, startsAt, expiresAt hoặc usedCount',
  })
  sortBy: VoucherSortField = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'], { message: 'order phải là asc hoặc desc' })
  order: 'asc' | 'desc' = 'desc';
}
