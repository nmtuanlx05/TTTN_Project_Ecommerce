import { IsBoolean } from 'class-validator';

export class UpdateUserStatusDto {
  // true: mở khóa, false: khóa tài khoản
  @IsBoolean({ message: 'isActive phải là true hoặc false' })
  isActive: boolean;
}
