import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaymentMethod } from '../../generated/prisma/enums';
import { Trim } from '../../common/transforms/trim';
import { TrimToNull } from '../../common/transforms/trim-to-null';
import { PreviewOrderDto } from './preview-order.dto';
import { IsLocationCode, IsVnMobilePhone } from './validators';

// Không có trường giá/tổng/phí: client không được gửi, backend tự tính từ giỏ
export class CreateOrderDto extends PreviewOrderDto {
  @Trim()
  @IsString({ message: 'Tên người nhận phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên người nhận không được để trống' })
  @MaxLength(100, { message: 'Tên người nhận không được vượt quá 100 ký tự' })
  receiverName: string;

  @Trim()
  @IsVnMobilePhone()
  phone: string;

  @Trim()
  @IsLocationCode('tỉnh/thành phố')
  provinceCode: string;

  @Trim()
  @IsLocationCode('quận/huyện')
  districtCode: string;

  // Bắt buộc khi quận/huyện có phường/xã, phải bỏ trống khi không có (kiểm ở service theo dữ liệu hành chính)
  @IsOptional()
  @TrimToNull()
  @IsString({ message: 'Mã phường/xã phải là chuỗi' })
  @MaxLength(10, { message: 'Mã phường/xã không hợp lệ' })
  wardCode?: string | null;

  @Trim()
  @IsString({ message: 'Địa chỉ (số nhà, đường) phải là chuỗi' })
  @IsNotEmpty({ message: 'Vui lòng nhập địa chỉ (số nhà, đường)' })
  @MaxLength(255, { message: 'Địa chỉ không được vượt quá 255 ký tự' })
  addressLine: string;

  @IsOptional()
  @TrimToNull()
  @IsString({ message: 'Ghi chú phải là chuỗi' })
  @MaxLength(500, { message: 'Ghi chú không được vượt quá 500 ký tự' })
  note?: string | null;

  @IsEnum(PaymentMethod, {
    message: 'Phương thức thanh toán phải là COD hoặc ONLINE',
  })
  paymentMethod: PaymentMethod;
}
