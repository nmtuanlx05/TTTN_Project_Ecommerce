import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';
import { QueryProductsBaseDto } from './query-products-base.dto';

// Query của admin = phần chung + phân trang (tối đa 100) + lọc theo trạng thái ẩn/hiện
export class QueryProductsDto extends QueryProductsBaseDto {
  // Query string luôn là chuỗi nên phải đổi "true"/"false" sang boolean thủ công
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean({ message: 'isActive phải là true hoặc false' })
  isActive?: boolean;

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
