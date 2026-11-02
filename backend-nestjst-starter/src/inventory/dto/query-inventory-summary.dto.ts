import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

// Query của summary: chỉ lọc theo danh mục (gồm danh mục con) và quy tắc ẩn
export class QueryInventorySummaryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'categoryId phải là số nguyên' })
  @Min(1, { message: 'categoryId phải lớn hơn hoặc bằng 1' })
  categoryId?: number;

  // Mặc định chỉ tính biến thể đang bán của sản phẩm đang hiện.
  // Query string luôn là chuỗi nên phải đổi "true"/"false" sang boolean thủ công.
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean({ message: 'includeHidden phải là true hoặc false' })
  includeHidden: boolean = false;
}
