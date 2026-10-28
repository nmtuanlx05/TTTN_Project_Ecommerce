import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { Trim } from '../../common/transforms/trim';

// Slug gồm chữ thường, số, ngăn cách bằng dấu gạch ngang đơn
export const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export class CreateCategoryDto {
  @Trim()
  @IsString({ message: 'Tên danh mục phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên danh mục không được để trống' })
  @MaxLength(191, { message: 'Tên danh mục không được vượt quá 191 ký tự' })
  name: string;

  // Bỏ trống hoặc null = danh mục gốc
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'parentId phải là số nguyên' })
  @Min(1, { message: 'parentId phải lớn hơn hoặc bằng 1' })
  parentId?: number | null;

  // Bỏ trống thì tự sinh từ tên (trùng thì thêm hậu tố -2, -3...)
  @IsOptional()
  @Trim()
  @IsString({ message: 'Slug phải là chuỗi' })
  @MaxLength(191, { message: 'Slug không được vượt quá 191 ký tự' })
  @Matches(SLUG_REGEX, {
    message: 'Slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang',
  })
  slug?: string;
}
