import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { NormalizeEmail } from '../../common/transforms/normalize-email';
import { VN_PHONE_REGEX } from '../../users/dto/create-user.dto';

// Cố ý không có `role`: forbidNonWhitelisted sẽ từ chối, tài khoản đăng ký luôn là CUSTOMER.
export class RegisterDto {
  @NormalizeEmail()
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email: string;

  @IsString({ message: 'Mật khẩu phải là chuỗi' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password: string;

  @IsOptional()
  @IsString({ message: 'Họ tên phải là chuỗi' })
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  name?: string;

  @IsOptional()
  @Matches(VN_PHONE_REGEX, {
    message: 'Số điện thoại không đúng định dạng Việt Nam',
  })
  phone?: string;
}
