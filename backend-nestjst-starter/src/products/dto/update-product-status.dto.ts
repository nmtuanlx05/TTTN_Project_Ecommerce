import { IsBoolean } from 'class-validator';

export class UpdateProductStatusDto {
  // false = ẩn sản phẩm (xóa mềm), true = hiện lại
  @IsBoolean({ message: 'isActive phải là true hoặc false' })
  isActive: boolean;
}
