import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
} from 'class-validator';
import { Trim } from '../../common/transforms/trim';
import { TrimToNull } from '../../common/transforms/trim-to-null';
import { DiscountType } from '../../generated/prisma/enums';
import {
  MAX_INT,
  VOUCHER_CODE_MAX_LENGTH,
  VOUCHER_DESCRIPTION_MAX_LENGTH,
} from '../vouchers.constants';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Không đặt giá trị mặc định ở đây: UpdateVoucherDto kế thừa qua PartialType, mặc định sẽ ghi đè nhầm khi PATCH.
// Quy tắc nghiệp vụ (khoảng giá trị, quan hệ giữa các trường) kiểm ở vouchers.config.ts với mã lỗi riêng.
export class CreateVoucherDto {
  // Chuẩn hóa chữ hoa và kiểm định dạng ở service
  @Trim()
  @IsString({ message: 'Mã voucher phải là chuỗi' })
  @IsNotEmpty({ message: 'Mã voucher không được để trống' })
  @MaxLength(VOUCHER_CODE_MAX_LENGTH, {
    message: `Mã voucher không được vượt quá ${VOUCHER_CODE_MAX_LENGTH} ký tự`,
  })
  code: string;

  // Chuỗi rỗng hoặc null nghĩa là xóa mô tả
  @IsOptional()
  @TrimToNull()
  @IsString({ message: 'Mô tả phải là chuỗi' })
  @MaxLength(VOUCHER_DESCRIPTION_MAX_LENGTH, {
    message: `Mô tả không được vượt quá ${VOUCHER_DESCRIPTION_MAX_LENGTH} ký tự`,
  })
  description?: string | null;

  @IsEnum(DiscountType, { message: 'Loại giảm giá phải là PERCENT hoặc FIXED' })
  discountType: DiscountType;

  // PERCENT: số phần trăm (1-100); FIXED: số tiền VND
  @Type(() => Number)
  @IsInt({ message: 'Giá trị giảm phải là số nguyên' })
  @Max(MAX_INT, { message: 'Giá trị giảm quá lớn' })
  discountValue: number;

  // Chỉ cho PERCENT; null = không giới hạn
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Mức giảm tối đa phải là số nguyên' })
  @Max(MAX_INT, { message: 'Mức giảm tối đa quá lớn' })
  maxDiscount?: number | null;

  // Mặc định 0 (đặt ở service)
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Đơn tối thiểu phải là số nguyên' })
  @Max(MAX_INT, { message: 'Đơn tối thiểu quá lớn' })
  minOrderValue?: number;

  // null hoặc bỏ trống = không giới hạn
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Giới hạn lượt dùng phải là số nguyên' })
  @Max(MAX_INT, { message: 'Giới hạn lượt dùng quá lớn' })
  usageLimit?: number | null;

  // YYYY-MM-DD theo giờ Việt Nam; tính từ 00:00 của ngày này
  @Matches(DATE_REGEX, { message: 'Ngày bắt đầu phải có dạng YYYY-MM-DD' })
  startsAtDate: string;

  // YYYY-MM-DD theo giờ Việt Nam; tính đến hết ngày này
  @Matches(DATE_REGEX, { message: 'Ngày kết thúc phải có dạng YYYY-MM-DD' })
  expiresAtDate: string;
}
