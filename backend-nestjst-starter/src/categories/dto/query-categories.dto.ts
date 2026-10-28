import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Trim } from '../../common/transforms/trim';

// Category chưa có createdAt nên "mới nhất trước" dùng id giảm dần
export const CATEGORY_SORT_FIELDS = ['id', 'name'] as const;
export type CategorySortField = (typeof CATEGORY_SORT_FIELDS)[number];

export class QueryCategoriesDto {
  // Từ khóa tìm theo name, slug
  @IsOptional()
  @Trim()
  @IsString({ message: 'Từ khóa tìm kiếm phải là chuỗi' })
  q?: string;

  // Chỉ lấy danh mục con trực tiếp của danh mục này
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'parentId phải là số nguyên' })
  @Min(1, { message: 'parentId phải lớn hơn hoặc bằng 1' })
  parentId?: number;

  @IsOptional()
  @IsIn(CATEGORY_SORT_FIELDS, { message: 'sortBy phải là id hoặc name' })
  sortBy: CategorySortField = 'id';

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
