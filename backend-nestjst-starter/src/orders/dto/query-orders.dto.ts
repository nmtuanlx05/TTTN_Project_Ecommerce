import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { OrderStatus } from '../../generated/prisma/enums';

export const ORDER_SORT_FIELDS = ['createdAt', 'totalAmount'] as const;
export type OrderSortField = (typeof ORDER_SORT_FIELDS)[number];

// Phân trang + lọc trạng thái + sắp xếp, dùng chung cho khách và quản trị
export class QueryOrdersDto {
  @IsOptional()
  @IsEnum(OrderStatus, { message: 'status không hợp lệ' })
  status?: OrderStatus;

  @IsOptional()
  @IsIn(ORDER_SORT_FIELDS, {
    message: 'sortBy phải là createdAt hoặc totalAmount',
  })
  sortBy: OrderSortField = 'createdAt';

  // Mặc định mới nhất trước
  @IsOptional()
  @IsIn(['asc', 'desc'], { message: 'order phải là asc hoặc desc' })
  order: 'asc' | 'desc' = 'desc';

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
}
