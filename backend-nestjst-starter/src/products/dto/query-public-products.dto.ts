import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  Max,
  Min,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { QueryProductsBaseDto } from './query-products-base.dto';

// Giá lưu kiểu Int của MySQL
const MAX_PRICE = 2147483647;

// maxPrice phải >= minPrice; chỉ kiểm khi client gửi cả hai (gửi một trong hai thì hợp lệ)
@ValidatorConstraint({ name: 'maxPriceNotLessThanMin', async: false })
class MaxPriceNotLessThanMin implements ValidatorConstraintInterface {
  validate(maxPrice: unknown, args: ValidationArguments) {
    const { minPrice } = args.object as { minPrice?: unknown };
    if (typeof maxPrice !== 'number' || typeof minPrice !== 'number') {
      return true;
    }
    return minPrice <= maxPrice;
  }

  defaultMessage() {
    return 'maxPrice phải lớn hơn hoặc bằng minPrice';
  }
}

// Query của storefront: không có isActive nên không có đường nào truy vấn sản phẩm đang ẩn
// (ValidationPipe forbidNonWhitelisted trả 400 cho mọi trường không khai báo ở đây).
export class QueryPublicProductsDto extends QueryProductsBaseDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'minPrice phải là số nguyên' })
  @Min(0, { message: 'minPrice phải lớn hơn hoặc bằng 0' })
  @Max(MAX_PRICE, { message: `minPrice không được vượt quá ${MAX_PRICE}` })
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'maxPrice phải là số nguyên' })
  @Min(0, { message: 'maxPrice phải lớn hơn hoặc bằng 0' })
  @Max(MAX_PRICE, { message: `maxPrice không được vượt quá ${MAX_PRICE}` })
  @Validate(MaxPriceNotLessThanMin)
  maxPrice?: number;

  // Loại một sản phẩm khỏi kết quả, dùng cho mục "sản phẩm liên quan" (loại sản phẩm đang xem)
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'excludeId phải là số nguyên' })
  @Min(1, { message: 'excludeId phải lớn hơn hoặc bằng 1' })
  excludeId?: number;

  // Trang hiện tại, bắt đầu từ 1
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page phải là số nguyên' })
  @Min(1, { message: 'page phải lớn hơn hoặc bằng 1' })
  page: number = 1;

  // Số bản ghi mỗi trang, tối đa 48
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit phải là số nguyên' })
  @Min(1, { message: 'limit phải lớn hơn hoặc bằng 1' })
  @Max(48, { message: 'limit không được vượt quá 48' })
  limit: number = 12;
}
