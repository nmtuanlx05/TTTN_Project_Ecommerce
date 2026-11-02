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
import { INVENTORY_SORT_FIELDS, STOCK_STATUSES } from '../inventory.constants';
import type { InventorySortField, StockStatus } from '../inventory.constants';
import { QueryInventorySummaryDto } from './query-inventory-summary.dto';

// Kế thừa categoryId và includeHidden của summary để hai endpoint luôn cùng quy tắc lọc
export class QueryInventoryDto extends QueryInventorySummaryDto {
  // Từ khóa tìm theo tên sản phẩm hoặc SKU
  @IsOptional()
  @Trim()
  @IsString({ message: 'Từ khóa tìm kiếm phải là chuỗi' })
  @MaxLength(100, { message: 'Từ khóa tìm kiếm không được vượt quá 100 ký tự' })
  q?: string;

  @IsOptional()
  @IsIn(STOCK_STATUSES, {
    message: 'stockStatus phải là in_stock, low hoặc out',
  })
  stockStatus?: StockStatus;

  @IsOptional()
  @IsIn(INVENTORY_SORT_FIELDS, {
    message: 'sortBy phải là name, stock hoặc available',
  })
  sortBy: InventorySortField = 'name';

  @IsOptional()
  @IsIn(['asc', 'desc'], { message: 'order phải là asc hoặc desc' })
  order: 'asc' | 'desc' = 'asc';

  // Trang hiện tại, bắt đầu từ 1
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page phải là số nguyên' })
  @Min(1, { message: 'page phải lớn hơn hoặc bằng 1' })
  page: number = 1;

  // Số bản ghi mỗi trang, tối đa 100
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit phải là số nguyên' })
  @Min(1, { message: 'limit phải lớn hơn hoặc bằng 1' })
  @Max(100, { message: 'limit không được vượt quá 100' })
  limit: number = 10;
}
