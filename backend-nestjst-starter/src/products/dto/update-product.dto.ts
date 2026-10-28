import { PartialType, PickType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { CreateProductDto, MAX_VARIANTS } from './create-product.dto';
import { UpdateVariantDto } from './update-variant.dto';

// Mọi trường tùy chọn. Biến thể: có id → cập nhật; không có id → tạo mới; không gửi lên → giữ nguyên.
// Không có cờ ẩn/hiện sản phẩm ở đây, dùng PATCH /admin/products/:id/status.
export class UpdateProductDto extends PartialType(
  PickType(CreateProductDto, [
    'name',
    'slug',
    'description',
    'price',
    'imageUrl',
    'categoryId',
  ] as const),
) {
  @IsOptional()
  @IsArray({ message: 'variants phải là một mảng' })
  @ArrayMaxSize(MAX_VARIANTS, {
    message: `Mỗi lần chỉ gửi tối đa ${MAX_VARIANTS} biến thể`,
  })
  @ValidateNested({ each: true })
  @Type(() => UpdateVariantDto)
  variants?: UpdateVariantDto[];
}
