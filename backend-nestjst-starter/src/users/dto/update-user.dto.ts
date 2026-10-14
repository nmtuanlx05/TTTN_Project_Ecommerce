import { PartialType, PickType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

// Chỉ cho sửa name, phone, role; email và password không được đổi qua endpoint này.
export class UpdateUserDto extends PartialType(
  PickType(CreateUserDto, ['name', 'phone', 'role'] as const),
) {}
