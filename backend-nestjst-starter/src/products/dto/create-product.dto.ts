import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { SLUG_REGEX } from '../../categories/dto/create-category.dto';
import { Trim } from '../../common/transforms/trim';
import { TrimToNull } from '../../common/transforms/trim-to-null';
import { CreateVariantDto } from './create-variant.dto';
import { MAX_PRODUCT_IMAGES, ProductImageDto } from './product-image.dto';

// Giá là Int (VND), trần của kiểu INT trong MySQL
export const MAX_PRICE = 2147483647;
export const MAX_VARIANTS = 100;

export class CreateProductDto {
  @Trim()
  @IsString({ message: 'Tên sản phẩm phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên sản phẩm không được để trống' })
  @MaxLength(191, { message: 'Tên sản phẩm không được vượt quá 191 ký tự' })
  name: string;

  // Bỏ trống thì tự sinh từ tên (trùng thì thêm hậu tố -2, -3...). Chuỗi rỗng "" bị từ chối như categories.
  @IsOptional()
  @Trim()
  @IsString({ message: 'Slug phải là chuỗi' })
  @MaxLength(191, { message: 'Slug không được vượt quá 191 ký tự' })
  @Matches(SLUG_REGEX, {
    message: 'Slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang',
  })
  slug?: string;

  // Chuỗi rỗng hoặc null = không có mô tả
  @IsOptional()
  @TrimToNull()
  @IsString({ message: 'Mô tả phải là chuỗi' })
  @MaxLength(10000, { message: 'Mô tả không được vượt quá 10000 ký tự' })
  description?: string | null;

  @IsInt({ message: 'Giá phải là số nguyên (VND)' })
  @Min(0, { message: 'Giá không được âm' })
  @Max(MAX_PRICE, { message: `Giá không được vượt quá ${MAX_PRICE}` })
  price: number;

  // DEPRECATED: dùng `images`. Chỉ còn để tương thích tạm: nếu không gửi `images` thì coi như images = [imageUrl]
  // (null hoặc "" = xóa hết ảnh). Cột DB là VARCHAR(191) nên URL dài hơn sẽ không lưu được.
  @IsOptional()
  @TrimToNull()
  @IsString({ message: 'Đường dẫn ảnh phải là chuỗi' })
  @MaxLength(191, {
    message: 'Đường dẫn ảnh không được vượt quá 191 ký tự',
  })
  // require_tld: false để nhận URL không có tên miền chuẩn, vd http://localhost:3000/uploads/... (URL ảnh upload ở dev)
  @IsUrl(
    {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_tld: false,
    },
    {
      message:
        'Đường dẫn ảnh không hợp lệ, phải bắt đầu bằng http:// hoặc https://',
    },
  )
  imageUrl?: string | null;

  // Ảnh sản phẩm theo thứ tự hiển thị (ảnh đầu là ảnh đại diện). Khi sửa: có gửi thì thay cả mảng, không gửi thì giữ nguyên.
  // ValidateIf: chỉ bỏ qua khi không gửi; null vẫn bị từ chối (muốn xóa hết ảnh thì gửi []).
  @ValidateIf((_, value) => value !== undefined)
  @IsArray({ message: 'images phải là một mảng' })
  @ArrayMaxSize(MAX_PRODUCT_IMAGES, {
    message: `Mỗi sản phẩm tối đa ${MAX_PRODUCT_IMAGES} ảnh`,
  })
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  images?: ProductImageDto[];

  @IsInt({ message: 'categoryId phải là số nguyên' })
  @Min(1, { message: 'categoryId phải lớn hơn hoặc bằng 1' })
  categoryId: number;

  @IsArray({ message: 'variants phải là một mảng' })
  @ArrayMinSize(1, { message: 'Sản phẩm phải có ít nhất 1 biến thể' })
  @ArrayMaxSize(MAX_VARIANTS, {
    message: `Sản phẩm không được vượt quá ${MAX_VARIANTS} biến thể`,
  })
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants: CreateVariantDto[];
}
