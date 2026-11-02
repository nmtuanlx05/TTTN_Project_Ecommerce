import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Trim } from '../../common/transforms/trim';

export const PRODUCT_SORT_FIELDS = ['createdAt', 'price', 'name'] as const;
export type ProductSortField = (typeof PRODUCT_SORT_FIELDS)[number];

// Phần query dùng chung của admin và public. Phân trang (page, limit) để từng bên tự khai báo
// vì giới hạn khác nhau: admin tối đa 100, public tối đa 48.
export class QueryProductsBaseDto {
  // Từ khóa tìm theo name, slug
  @IsOptional()
  @Trim()
  @IsString({ message: 'Từ khóa tìm kiếm phải là chuỗi' })
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'categoryId phải là số nguyên' })
  @Min(1, { message: 'categoryId phải lớn hơn hoặc bằng 1' })
  categoryId?: number;

  @IsOptional()
  @IsIn(PRODUCT_SORT_FIELDS, {
    message: 'sortBy phải là createdAt, price hoặc name',
  })
  sortBy: ProductSortField = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'], { message: 'order phải là asc hoặc desc' })
  order: 'asc' | 'desc' = 'desc';
}
