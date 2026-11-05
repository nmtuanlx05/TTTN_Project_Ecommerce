import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { OrderStatus } from '../../generated/prisma/enums';
import { TrimToNull } from '../../common/transforms/trim-to-null';
import { MAX_REASON_LENGTH } from '../orders.constants';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus, { message: 'Trạng thái đơn hàng không hợp lệ' })
  status: OrderStatus;

  // Bắt buộc khi status = CANCELLED (kiểm ở service để trả mã lỗi riêng)
  @IsOptional()
  @TrimToNull()
  @IsString({ message: 'Lý do phải là chuỗi' })
  @MaxLength(MAX_REASON_LENGTH, {
    message: `Lý do không được vượt quá ${MAX_REASON_LENGTH} ký tự`,
  })
  reason?: string | null;
}
