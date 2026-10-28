import { IsBoolean, IsInt, IsOptional, Min, ValidateIf } from 'class-validator';
import { VariantColor, VariantSize, VariantSku } from './create-variant.dto';

// Một phần tử trong `variants` của PATCH sản phẩm:
// - có `id`: cập nhật biến thể đó, các trường còn lại tùy chọn;
// - không có `id`: tạo biến thể mới, bắt buộc đủ sku, size, color.
// Biến thể không nằm trong danh sách được giữ nguyên.
export class UpdateVariantDto {
  @IsOptional()
  @IsInt({ message: 'id biến thể phải là số nguyên' })
  @Min(1, { message: 'id biến thể phải lớn hơn hoặc bằng 1' })
  id?: number;

  @ValidateIf(
    (v: UpdateVariantDto) => typeof v.id !== 'number' || v.sku !== undefined,
  )
  @VariantSku()
  sku?: string;

  @ValidateIf(
    (v: UpdateVariantDto) => typeof v.id !== 'number' || v.size !== undefined,
  )
  @VariantSize()
  size?: string;

  @ValidateIf(
    (v: UpdateVariantDto) => typeof v.id !== 'number' || v.color !== undefined,
  )
  @VariantColor()
  color?: string;

  // Ẩn/hiện biến thể: chỉ đổi khi client gửi tường minh
  @IsOptional()
  @IsBoolean({ message: 'isActive phải là true hoặc false' })
  isActive?: boolean;
}
