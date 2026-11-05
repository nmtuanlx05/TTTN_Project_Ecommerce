import { IsOptional, IsString, MaxLength } from 'class-validator';
import { TrimToNull } from '../../common/transforms/trim-to-null';

// Chỉ nhận mã voucher: giá, tổng, phí ship luôn do backend tính (forbidNonWhitelisted chặn mọi trường khác)
export class PreviewOrderDto {
  @IsOptional()
  @TrimToNull()
  @IsString({ message: 'Mã giảm giá phải là chuỗi' })
  @MaxLength(50, { message: 'Mã giảm giá không được vượt quá 50 ký tự' })
  voucherCode?: string | null;
}
