import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { QueryPublicProductsDto } from './query-public-products.dto';

// Query của admin = query public + lọc theo trạng thái ẩn/hiện
export class QueryProductsDto extends QueryPublicProductsDto {
  // Query string luôn là chuỗi nên phải đổi "true"/"false" sang boolean thủ công
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean({ message: 'isActive phải là true hoặc false' })
  isActive?: boolean;
}
