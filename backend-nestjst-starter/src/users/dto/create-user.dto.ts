import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { Role } from '../../generated/prisma/enums';
import { NormalizeEmail } from '../../common/transforms/normalize-email';

// Số điện thoại di động Việt Nam: 0xxxxxxxxx hoặc +84xxxxxxxxx (đầu số 3, 5, 7, 8, 9)
export const VN_PHONE_REGEX = /^(0|\+84)(3|5|7|8|9)\d{8}$/;

export class CreateUserDto {
  @NormalizeEmail()
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email: string;

  @IsString({ message: 'Mật khẩu phải là chuỗi' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password: string;

  @IsString({ message: 'Họ tên phải là chuỗi' })
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  name: string;

  @IsOptional()
  @Matches(VN_PHONE_REGEX, {
    message: 'Số điện thoại không đúng định dạng Việt Nam',
  })
  phone?: string;

  @IsOptional()
  @IsEnum(Role, { message: 'Vai trò phải là ADMIN, STAFF hoặc CUSTOMER' })
  role?: Role;
}
