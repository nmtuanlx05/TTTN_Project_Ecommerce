import { mkdir, open, rename, unlink } from 'fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'path';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import {
  buildFileName,
  detectImageType,
  SIGNATURE_BYTES,
} from './image-signature';
import {
  MSG_UNSUPPORTED_IMAGE,
  UPLOAD_CONFIG,
  UPLOAD_FIELD,
  UPLOAD_KINDS,
  UPLOAD_URL_PREFIX,
  type UploadConfig,
  type UploadKind,
} from './upload.config';

export interface UploadResult {
  url: string;
}

function isErrno(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as NodeJS.ErrnoException).code === code
  );
}

@Injectable()
export class UploadService implements OnModuleInit {
  private readonly logger = new Logger(UploadService.name);

  constructor(@Inject(UPLOAD_CONFIG) private readonly config: UploadConfig) {}

  // Tạo sẵn thư mục upload, thư mục con theo loại và thư mục tạm.
  async onModuleInit() {
    await mkdir(this.config.tmpDir, { recursive: true });
    for (const kind of Object.keys(UPLOAD_KINDS)) {
      await mkdir(join(this.config.rootDir, kind), { recursive: true });
    }
    this.logger.log(`Thư mục upload: ${this.config.rootDir}`);
  }

  // Kiểm chữ ký byte của file Multer vừa ghi tạm; hợp lệ thì chuyển sang <rootDir>/<kind>/<uuid>.<ext>.
  // Sai chữ ký thì xóa file và trả 415. Mọi nhánh lỗi đều dọn file tạm.
  async saveImage(
    file: Express.Multer.File | undefined,
    kind: UploadKind,
  ): Promise<UploadResult> {
    if (!file) {
      throw new BadRequestException(
        `Vui lòng chọn file ảnh (trường "${UPLOAD_FIELD}")`,
      );
    }

    try {
      const type = detectImageType(await this.readHead(file.path));
      if (!type) {
        throw new UnsupportedMediaTypeException(MSG_UNSUPPORTED_IMAGE);
      }

      const fileName = buildFileName(type);
      // Tạo lại thư mục đích nếu bị xóa sau lúc khởi động (rename không tự tạo thư mục)
      const kindDir = join(this.config.rootDir, kind);
      await mkdir(kindDir, { recursive: true });
      await rename(file.path, join(kindDir, fileName));
      return {
        url: `${this.config.publicUrl}${UPLOAD_URL_PREFIX}/${kind}/${fileName}`,
      };
    } catch (error) {
      await this.removeQuietly(file.path);
      throw error;
    }
  }

  // Xóa file theo URL do hệ thống này tạo ra. Bỏ qua (không ném lỗi) nếu URL ngoài hệ thống,
  // có dấu hiệu path traversal, không nằm trong thư mục upload hoặc file không tồn tại.
  async deleteByUrl(url: string | null | undefined): Promise<void> {
    const target = this.resolveOwnFile(url);
    if (target) {
      await this.removeQuietly(target);
    }
  }

  // Đổi URL thành đường dẫn file trong thư mục upload; trả null nếu URL không phải của hệ thống.
  private resolveOwnFile(url: string | null | undefined): string | null {
    const prefix = `${this.config.publicUrl}${UPLOAD_URL_PREFIX}/`;
    if (!url || !url.startsWith(prefix)) {
      return null;
    }

    let path = url.slice(prefix.length);
    if (/[?#]/.test(path)) {
      return null;
    }
    try {
      path = decodeURIComponent(path);
    } catch {
      return null;
    }
    if (path.includes('\0')) {
      return null;
    }

    // Phải có dạng <kind>/<tên file>; tên file do hệ thống tạo nên không bao giờ bắt đầu bằng dấu chấm
    const segments = path.split('/');
    if (
      segments.length !== 2 ||
      !Object.hasOwn(UPLOAD_KINDS, segments[0]) ||
      segments[1] === '' ||
      segments[1].startsWith('.')
    ) {
      return null;
    }

    const target = resolve(this.config.rootDir, path);
    const rel = relative(this.config.rootDir, target);
    if (!rel || rel.startsWith(`..${sep}`) || rel === '..' || isAbsolute(rel)) {
      return null;
    }
    return target;
  }

  private async readHead(path: string): Promise<Buffer> {
    const handle = await open(path, 'r');
    try {
      const buffer = Buffer.alloc(SIGNATURE_BYTES);
      const { bytesRead } = await handle.read(buffer, 0, SIGNATURE_BYTES, 0);
      return buffer.subarray(0, bytesRead);
    } finally {
      await handle.close();
    }
  }

  // Dọn file là việc phụ: file không còn thì bỏ qua, lỗi khác chỉ ghi log để không che lỗi gốc.
  private async removeQuietly(path: string): Promise<void> {
    try {
      await unlink(path);
    } catch (error) {
      if (!isErrno(error, 'ENOENT')) {
        this.logger.warn(
          `Không xóa được file ${path}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }
}
