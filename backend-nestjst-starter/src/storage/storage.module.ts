import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage, type CloudinarySdk } from './cloudinary.storage';
import { DisabledStorage } from './disabled.storage';
import { readStorageConfig } from './storage.config';
import { StorageService } from './storage.types';

export function createStorage(
  config: ConfigService,
  sdk: CloudinarySdk = cloudinary,
): StorageService {
  const logger = new Logger('Storage');
  const resolved = readStorageConfig((key) => config.get<string>(key));
  switch (resolved.driver) {
    case 'cloudinary':
      logger.log(`Lưu trữ ảnh: Cloudinary (thư mục ${resolved.folderPrefix})`);
      return new CloudinaryStorage(resolved, sdk);
    default:
      logger.warn(
        `Lưu trữ ảnh TẮT: ${resolved.reason}. Các API tải ảnh lên sẽ trả 503 STORAGE_NOT_CONFIGURED.`,
      );
      return new DisabledStorage(resolved.reason);
  }
}

@Module({
  providers: [
    {
      provide: StorageService,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createStorage(config),
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
