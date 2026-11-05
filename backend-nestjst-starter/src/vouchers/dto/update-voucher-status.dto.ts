import { IsBoolean } from 'class-validator';

export class UpdateVoucherStatusDto {
  // true: bật, false: tắt voucher
  @IsBoolean({ message: 'isActive phải là true hoặc false' })
  isActive: boolean;
}
