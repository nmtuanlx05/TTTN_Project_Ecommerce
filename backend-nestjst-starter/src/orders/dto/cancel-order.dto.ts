import { IsOptional, IsString, MaxLength } from 'class-validator';
import { TrimToNull } from '../../common/transforms/trim-to-null';
import { MAX_REASON_LENGTH } from '../orders.constants';

export class CancelOrderDto {
  // Tùy chọn; để trống thì ghi "Khách tự hủy"
  @IsOptional()
  @TrimToNull()
  @IsString({ message: 'Lý do phải là chuỗi' })
  @MaxLength(MAX_REASON_LENGTH, {
    message: `Lý do không được vượt quá ${MAX_REASON_LENGTH} ký tự`,
  })
  reason?: string | null;
}
