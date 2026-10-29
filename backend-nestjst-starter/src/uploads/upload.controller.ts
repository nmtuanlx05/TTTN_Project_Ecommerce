import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UploadFileInterceptor } from './upload-file.interceptor';
import { UploadService } from './upload.service';

// JwtAuthGuard đã bật toàn cục nên chỉ cần RolesGuard. Guard chạy trước Multer: chưa qua phân quyền thì không ghi gì ra đĩa.
@Controller('uploads')
@UseGuards(RolesGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  // Ảnh sản phẩm: chỉ ADMIN và STAFF, tối đa 5 MB
  @Post('products')
  @Roles('ADMIN', 'STAFF')
  @UseInterceptors(UploadFileInterceptor('products'))
  uploadProductImage(@UploadedFile() file: Express.Multer.File | undefined) {
    return this.uploadService.saveImage(file, 'products');
  }

  // Ảnh đại diện: mọi người đã đăng nhập (không gắn @Roles), tối đa 2 MB
  @Post('avatars')
  @UseInterceptors(UploadFileInterceptor('avatars'))
  uploadAvatar(@UploadedFile() file: Express.Multer.File | undefined) {
    return this.uploadService.saveImage(file, 'avatars');
  }
}
