import { mkdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { readImageSize } from '../uploads/image-info';
import type { ImageType } from '../uploads/image-signature';
import { UPLOAD_URL_PREFIX, type UploadConfig } from '../uploads/upload.config';
import {
  StorageService,
  type StorageFolder,
  type UploadImageOptions,
} from './storage.types';

const EXTENSIONS: Record<ImageType, string> = {
  jpeg: 'jpg',
  png: 'png',
  webp: 'webp',
};
const ALL_EXTENSIONS = Object.values(EXTENSIONS);
const FOLDERS: readonly string[] = ['products', 'avatars'];
// publicId cục bộ: <thư mục>/<uuid>; chặn mọi thứ khác để không bao giờ ra khỏi thư mục upload
const PUBLIC_ID_PATTERN =
  /^(products|avatars)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;

// Driver ghi ổ đĩa: CHỈ dùng cho test/CI/dev offline. Không dùng được khi chạy nhiều máy (xem docs/cloudinary-setup.md).
// File ghi thẳng vào <rootDir>/<thư mục>/<uuid>.<đuôi> (không qua thư mục tạm); ServeStatic của UploadModule phục vụ.
export class LocalStorage extends StorageService {
  readonly driver = 'local' as const;

  constructor(private readonly config: UploadConfig) {
    super();
  }

  isEnabled() {
    return true;
  }

  buildPublicId(folder: StorageFolder, name: string) {
    return `${folder}/${name}`;
  }

  ownsUrl(url: string) {
    return url.startsWith(`${this.config.publicUrl}${UPLOAD_URL_PREFIX}/`);
  }

  async upload(buffer: Buffer, { folder, name, type }: UploadImageOptions) {
    if (!FOLDERS.includes(folder)) {
      throw new Error(`Thư mục không hợp lệ: ${folder}`);
    }
    const ext = EXTENSIONS[type];
    const dir = join(this.config.rootDir, folder);
    await mkdir(dir, { recursive: true });
    // 'wx': không ghi đè file đã có (cùng ý nghĩa overwrite:false của Cloudinary)
    await writeFile(join(dir, `${name}.${ext}`), buffer, { flag: 'wx' });
    const size = readImageSize(buffer, type);
    return {
      publicId: this.buildPublicId(folder, name),
      secureUrl: `${this.config.publicUrl}${UPLOAD_URL_PREFIX}/${folder}/${name}.${ext}`,
      width: size?.width ?? null,
      height: size?.height ?? null,
      format: ext,
      bytes: buffer.length,
    };
  }

  async delete(publicId: string) {
    const match = PUBLIC_ID_PATTERN.exec(publicId);
    if (!match) return 'not_found' as const;
    let deleted = false;
    for (const ext of ALL_EXTENSIONS) {
      try {
        await unlink(join(this.config.rootDir, match[1], `${match[2]}.${ext}`));
        deleted = true;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }
    return deleted ? ('deleted' as const) : ('not_found' as const);
  }
}
