import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Trim } from '../../common/transforms/trim';
import { OrderStatus } from '../../generated/prisma/enums';

export const ORDER_SORT_FIELDS = ['createdAt', 'totalAmount'] as const;
export type OrderSortField = (typeof ORDER_SORT_FIELDS)[number];

// Phân trang + sắp xếp, dùng chung cho khách và quản trị
export class QueryOrdersBaseDto {
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

// Quản trị: lọc một trạng thái
export class QueryOrdersDto extends QueryOrdersBaseDto {
  @IsOptional()
  @IsEnum(OrderStatus, { message: 'status không hợp lệ' })
  status?: OrderStatus;
}

// "PENDING,CONFIRMED" -> ['PENDING','CONFIRMED']; bỏ khoảng trắng và phần tử rỗng, giá trị lặp chỉ giữ một.
// Mảng (?status=a&status=b) cũng được nhận; giá trị lạ để validator báo lỗi từng phần tử.
const splitStatuses = ({ value }: { value: unknown }): unknown => {
  const parts = (Array.isArray(value) ? value : [value]).flatMap(
    (v: unknown) => (typeof v === 'string' ? v.split(',') : [v]),
  );
  const cleaned = parts
    .map((v) => (typeof v === 'string' ? v.trim() : v))
    .filter((v) => v !== '');
  return [...new Set(cleaned)];
};

export const MAX_MY_ORDERS_QUERY_LENGTH = 50;

// Khách: status nhận nhiều giá trị phân tách bằng dấu phẩy, q khớp một phần mã đơn
export class QueryMyOrdersDto extends QueryOrdersBaseDto {
  @IsOptional()
  @Transform(splitStatuses)
  @IsArray({ message: 'status không hợp lệ' })
  @IsEnum(OrderStatus, {
    each: true,
    message: `status chỉ nhận các giá trị: ${Object.values(OrderStatus).join(', ')}`,
  })
  status?: OrderStatus[];

  @IsOptional()
  @Trim()
  @IsString({ message: 'Từ khóa tìm kiếm phải là chuỗi' })
  @MaxLength(MAX_MY_ORDERS_QUERY_LENGTH, {
    message: `Từ khóa tìm kiếm không được vượt quá ${MAX_MY_ORDERS_QUERY_LENGTH} ký tự`,
  })
  q?: string;
}
