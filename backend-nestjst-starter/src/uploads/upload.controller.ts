import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MediaService } from '../media/media.service';
import { UploadFileInterceptor } from './upload-file.interceptor';

// JwtAuthGuard đã bật toàn cục nên chỉ cần RolesGuard. Guard chạy trước Multer: chưa qua phân quyền thì không nhận file nào.
@Controller('uploads')
@UseGuards(RolesGuard)
export class UploadController {
  constructor(private readonly media: MediaService) {}

  // Ảnh sản phẩm: chỉ ADMIN và STAFF, tối đa 5 MB
  @Post('products')
  @Roles('ADMIN', 'STAFF')
  @UseInterceptors(UploadFileInterceptor('products'))
  uploadProductImage(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.media.uploadImage(file, 'products', user.id);
  }

  // Ảnh đại diện: mọi người đã đăng nhập (không gắn @Roles), tối đa 2 MB
  @Post('avatars')
  @UseInterceptors(UploadFileInterceptor('avatars'))
  uploadAvatar(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.media.uploadImage(file, 'avatars', user.id);
  }
}
