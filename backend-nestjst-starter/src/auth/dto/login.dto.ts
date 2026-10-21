import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { NormalizeEmail } from '../../common/transforms/normalize-email';

export class LoginDto {
  @NormalizeEmail()
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email: string;

  // Không đặt MinLength ở login: không tiết lộ quy tắc mật khẩu và vẫn đăng nhập được với mật khẩu cũ
  @IsString({ message: 'Mật khẩu phải là chuỗi' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  password: string;
}
