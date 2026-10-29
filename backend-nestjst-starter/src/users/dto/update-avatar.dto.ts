import { IsNotEmpty, IsString, MaxLength, ValidateIf } from 'class-validator';
import { AVATAR_URL_MAX_LENGTH } from '../avatar-url';

export class UpdateAvatarDto {
  // URL do POST /uploads/avatars trả về; gửi null để xóa ảnh đại diện. Thiếu trường này là lỗi (không coi là xóa).
  // Đúng định dạng URL của hệ thống được AvatarUrlPipe kiểm tra tiếp (cần APP_PUBLIC_URL).
  @ValidateIf((_obj, value: unknown) => value !== null)
  @IsString({
    message: 'avatarUrl là bắt buộc, gửi chuỗi URL ảnh hoặc null để xóa ảnh',
  })
  @IsNotEmpty({ message: 'avatarUrl không được để trống, gửi null để xóa ảnh' })
  @MaxLength(AVATAR_URL_MAX_LENGTH, {
    message: `Đường dẫn ảnh đại diện không được vượt quá ${AVATAR_URL_MAX_LENGTH} ký tự`,
  })
  avatarUrl: string | null;
}
