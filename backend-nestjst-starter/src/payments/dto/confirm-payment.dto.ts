import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Trim } from '../../common/transforms/trim';

export class ConfirmPaymentDto {
  // Bắt buộc: lý do/bằng chứng (vd mã giao dịch ngân hàng) để đối soát sau này
  @Trim()
  @IsString({ message: 'Ghi chú phải là chuỗi' })
  @IsNotEmpty({ message: 'Vui lòng nhập ghi chú (vd mã giao dịch ngân hàng)' })
  @MaxLength(300, { message: 'Ghi chú không được vượt quá 300 ký tự' })
  note: string;

  // Tùy chọn: giao dịch đang chờ xử lý (thiếu tiền/không khớp) được gắn vào đơn này
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'transactionId phải là số nguyên' })
  @Min(1, { message: 'transactionId không hợp lệ' })
  transactionId?: number;
}
