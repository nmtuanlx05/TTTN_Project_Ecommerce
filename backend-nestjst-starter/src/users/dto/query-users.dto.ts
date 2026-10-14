import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Role } from '../../generated/prisma/enums';

export const USER_SORT_FIELDS = ['createdAt', 'name', 'email'] as const;
export type UserSortField = (typeof USER_SORT_FIELDS)[number];

export class QueryUsersDto {
  // Từ khóa tìm theo name, email, phone
  @IsOptional()
  @IsString({ message: 'Từ khóa tìm kiếm phải là chuỗi' })
  q?: string;

  @IsOptional()
  @IsEnum(Role, { message: 'Vai trò phải là ADMIN, STAFF hoặc CUSTOMER' })
  role?: Role;

  // Query string luôn là chuỗi nên phải đổi "true"/"false" sang boolean thủ công
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean({ message: 'isActive phải là true hoặc false' })
  isActive?: boolean;

  @IsOptional()
  @IsIn(USER_SORT_FIELDS, {
    message: 'sortBy phải là createdAt, name hoặc email',
  })
  sortBy: UserSortField = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'], { message: 'order phải là asc hoặc desc' })
  order: 'asc' | 'desc' = 'desc';

  // Trang hiện tại, bắt đầu từ 1
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page phải là số nguyên' })
  @Min(1, { message: 'page phải lớn hơn hoặc bằng 1' })
  page: number = 1;

  // Số bản ghi mỗi trang, tối đa 100
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit phải là số nguyên' })
  @Min(1, { message: 'limit phải lớn hơn hoặc bằng 1' })
  @Max(100, { message: 'limit không được vượt quá 100' })
  limit: number = 10;
}
