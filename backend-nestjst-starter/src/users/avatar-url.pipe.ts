import {
  BadRequestException,
  Inject,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { UPLOAD_CONFIG, type UploadConfig } from '../uploads/upload.config';
import { validateAvatarUrl } from './avatar-url';
import { UpdateAvatarDto } from './dto/update-avatar.dto';

// Chạy sau ValidationPipe toàn cục (đã đảm bảo avatarUrl là chuỗi hoặc null); kiểm tiếp URL có phải do chính hệ thống cấp.
// Lỗi trả cùng dạng với lỗi validate: { message: 'Dữ liệu không hợp lệ', errors: [{ field, message }] }.
@Injectable()
export class AvatarUrlPipe implements PipeTransform<
  UpdateAvatarDto,
  UpdateAvatarDto
> {
  constructor(@Inject(UPLOAD_CONFIG) private readonly config: UploadConfig) {}

  transform(dto: UpdateAvatarDto): UpdateAvatarDto {
    const message = validateAvatarUrl(dto.avatarUrl, this.config.publicUrl);
    if (message) {
      throw new BadRequestException({
        message: 'Dữ liệu không hợp lệ',
        errors: [{ field: 'avatarUrl', message }],
      });
    }
    return dto;
  }
}
