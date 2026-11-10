import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

// Cột users.avatarUrl là VARCHAR(500)
export const AVATAR_URL_MAX_LENGTH = 500;

// Gửi ĐÚNG MỘT trong hai trường (kiểm ở UsersService.updateAvatar vì cần biết trường nào có mặt).
export class UpdateAvatarDto {
  // id ảnh do POST /uploads/avatars trả về (trường `assetId`)
  @IsOptional()
  @IsInt({ message: 'assetId phải là số nguyên' })
  @Min(1, { message: 'assetId phải lớn hơn hoặc bằng 1' })
  assetId?: number;

  // URL ảnh đã tải lên (trường `url` của POST /uploads/avatars); gửi null để xóa ảnh đại diện.
  @IsOptional()
  @IsString({ message: 'avatarUrl phải là chuỗi URL ảnh hoặc null' })
  @IsNotEmpty({ message: 'avatarUrl không được để trống, gửi null để xóa ảnh' })
  @MaxLength(AVATAR_URL_MAX_LENGTH, {
    message: `Đường dẫn ảnh đại diện không được vượt quá ${AVATAR_URL_MAX_LENGTH} ký tự`,
  })
  avatarUrl?: string | null;
}
