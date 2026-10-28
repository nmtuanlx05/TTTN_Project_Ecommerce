import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Trim } from '../../common/transforms/trim';

export const PRODUCT_SORT_FIELDS = ['createdAt', 'price', 'name'] as const;
export type ProductSortField = (typeof PRODUCT_SORT_FIELDS)[number];

export class QueryPublicProductsDto {
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
