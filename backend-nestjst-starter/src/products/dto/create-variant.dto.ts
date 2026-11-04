import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Trim } from '../../common/transforms/trim';
import { COLOR_HEX_REGEX } from '../color-hex';

// SKU gồm chữ in hoa không dấu, số và các ký tự . _ -
export const SKU_REGEX = /^[A-Z0-9._-]+$/;

// Bộ decorator dùng chung cho Create và Update để quy tắc và message không lệch nhau.
export const VariantSku = () =>
  applyDecorators(
    // SKU luôn được chuẩn hóa thành chữ in hoa
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? value.trim().toUpperCase() : value,
    ),
    IsString({ message: 'SKU phải là chuỗi' }),
    IsNotEmpty({ message: 'SKU không được để trống' }),
    MaxLength(64, { message: 'SKU không được vượt quá 64 ký tự' }),
    Matches(SKU_REGEX, {
      message: 'SKU chỉ gồm chữ cái không dấu, số và các ký tự . _ -',
    }),
  );

export const VariantSize = () =>
  applyDecorators(
    Trim(),
    IsString({ message: 'Size phải là chuỗi' }),
    IsNotEmpty({ message: 'Size không được để trống' }),
    MaxLength(50, { message: 'Size không được vượt quá 50 ký tự' }),
  );

export const VariantColor = () =>
  applyDecorators(
    Trim(),
    IsString({ message: 'Màu sắc phải là chuỗi' }),
    IsNotEmpty({ message: 'Màu sắc không được để trống' }),
    MaxLength(50, { message: 'Màu sắc không được vượt quá 50 ký tự' }),
  );

// Mã màu "#RRGGBB": trim, chuỗi rỗng = null (xóa mã), chuẩn hóa in hoa trước khi kiểm.
export const VariantColorHex = () =>
  applyDecorators(
    IsOptional(),
    Transform(({ value }: { value: unknown }) => {
      if (typeof value !== 'string') return value;
      const trimmed = value.trim();
      return trimmed === '' ? null : trimmed.toUpperCase();
    }),
    IsString({ message: 'Mã màu phải là chuỗi' }),
    Matches(COLOR_HEX_REGEX, {
      message: 'Mã màu phải có dạng #RRGGBB (ví dụ #FFFFFF)',
    }),
  );

// Biến thể khi tạo sản phẩm. Không nhận stock/reserved/minStock (thuộc module Kho, mặc định 0).
export class CreateVariantDto {
  @VariantSku()
  sku: string;

  @VariantSize()
  size: string;

  @VariantColor()
  color: string;

  // Bỏ trống hoặc null = chưa có mã màu. Cùng màu trong một sản phẩm phải cùng mã (service kiểm).
  @VariantColorHex()
  colorHex?: string | null;

  // Bỏ trống = đang bán
  @IsOptional()
  @IsBoolean({ message: 'isActive phải là true hoặc false' })
  isActive?: boolean;
}
