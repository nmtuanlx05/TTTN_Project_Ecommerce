import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MediaModule } from '../media/media.module';
import { UploadController } from './upload.controller';

@Module({
  imports: [MediaModule],
  controllers: [UploadController],
  providers: [RolesGuard],
})
export class UploadModule {}
