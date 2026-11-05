import { PartialType } from '@nestjs/mapped-types';
import { CreateVoucherDto } from './create-voucher.dto';

// Mọi trường tùy chọn; không có isActive (bật/tắt qua PATCH /admin/vouchers/:id/status).
// Gửi lại giá trị đang lưu được coi là không đổi, nên frontend gửi nguyên form không bị 409 oan.
export class UpdateVoucherDto extends PartialType(CreateVoucherDto) {}
