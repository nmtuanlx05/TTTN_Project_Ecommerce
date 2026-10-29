import {
  existsSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  BadRequestException,
  Logger,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import type { UploadConfig } from './upload.config';
import { UploadService } from './upload.service';

const PNG_HEAD = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0,
]);

describe('UploadService', () => {
  let base: string;
  let config: UploadConfig;
  let service: UploadService;

  beforeEach(async () => {
    // Tắt log "Thư mục upload" cho đỡ rối output test
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    base = mkdtempSync(join(tmpdir(), 'upload-unit-'));
    const rootDir = join(base, 'uploads');
    config = {
      rootDir,
      tmpDir: join(rootDir, '.tmp'),
      publicUrl: 'http://localhost:3000',
    };
    service = new UploadService(config);
    await service.onModuleInit();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    rmSync(base, { recursive: true, force: true });
  });

  const tmpFile = (content: Buffer) => {
    const path = join(config.tmpDir, 'abc');
    writeFileSync(path, content);
    return { path } as Express.Multer.File;
  };

  it('onModuleInit tạo thư mục gốc, .tmp và thư mục theo loại', () => {
    expect(readdirSync(config.rootDir).sort()).toEqual([
      '.tmp',
      'avatars',
      'products',
    ]);
  });

  describe('saveImage', () => {
    it('thiếu file -> 400', async () => {
      await expect(service.saveImage(undefined, 'products')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('ảnh hợp lệ: chuyển sang <kind>/<uuid>.<ext>, trả URL, dọn file tạm', async () => {
      const { url } = await service.saveImage(tmpFile(PNG_HEAD), 'avatars');
      expect(url).toMatch(
        /^http:\/\/localhost:3000\/uploads\/avatars\/[0-9a-f-]{36}\.png$/,
      );
      const name = url.split('/').pop()!;
      expect(existsSync(join(config.rootDir, 'avatars', name))).toBe(true);
      expect(readdirSync(config.tmpDir)).toEqual([]);
    });

    it('sai chữ ký -> 415 và xóa file, không để lại gì', async () => {
      await expect(
        service.saveImage(tmpFile(Buffer.from('not a png')), 'products'),
      ).rejects.toThrow(UnsupportedMediaTypeException);
      expect(readdirSync(config.tmpDir)).toEqual([]);
      expect(readdirSync(join(config.rootDir, 'products'))).toEqual([]);
    });
  });

  describe('deleteByUrl', () => {
    const own = (kind: string, name: string) =>
      `http://localhost:3000/uploads/${kind}/${name}`;
    const place = (kind: string, name: string) => {
      const path = join(config.rootDir, kind, name);
      writeFileSync(path, 'x');
      return path;
    };

    it('xóa file nằm trong thư mục upload', async () => {
      const path = place('products', 'a.png');
      await service.deleteByUrl(own('products', 'a.png'));
      expect(existsSync(path)).toBe(false);
    });

    it('file không tồn tại -> không ném lỗi', async () => {
      await expect(
        service.deleteByUrl(own('products', 'khong-co.png')),
      ).resolves.toBeUndefined();
    });

    it.each([null, undefined, ''])('bỏ qua %p', async (value) => {
      await expect(service.deleteByUrl(value)).resolves.toBeUndefined();
    });

    it('bỏ qua URL ngoài hệ thống (khác origin hoặc không phải /uploads)', async () => {
      const path = place('products', 'a.png');
      await service.deleteByUrl(
        'https://cdn.example.com/uploads/products/a.png',
      );
      await service.deleteByUrl('http://localhost:3000/other/products/a.png');
      await service.deleteByUrl('http://localhost:3001/uploads/products/a.png');
      expect(existsSync(path)).toBe(true);
    });

    it.each([
      '../../secret.txt',
      '..%2F..%2Fsecret.txt',
      '%2e%2e/%2e%2e/secret.txt',
      '..%2fsecret.txt',
      'products/../../secret.txt',
      'products/..%2F..%2Fsecret.txt',
      'products/%2e%2e%2f%2e%2e%2fsecret.txt',
      'products/a.png%00.txt',
      'products/..',
      'products/.tmp',
      '.tmp/abc',
      'products',
      'products/',
      '/etc/passwd',
    ])('chặn path traversal / đường dẫn lạ: %s', async (path) => {
      const secret = join(base, 'secret.txt');
      writeFileSync(secret, 'secret');
      const inside = place('products', 'a.png');
      const tmp = join(config.tmpDir, 'abc');
      writeFileSync(tmp, 'x');

      await expect(
        service.deleteByUrl(`http://localhost:3000/uploads/${path}`),
      ).resolves.toBeUndefined();

      expect(existsSync(secret)).toBe(true);
      expect(existsSync(inside)).toBe(true);
      expect(existsSync(tmp)).toBe(true);
      expect(existsSync(config.rootDir)).toBe(true);
    });

    it('chặn kiểu /uploads/../ ngay trong URL đầy đủ', async () => {
      const secret = join(base, 'secret.txt');
      writeFileSync(secret, 'secret');
      await service.deleteByUrl('http://localhost:3000/uploads/../secret.txt');
      expect(existsSync(secret)).toBe(true);
    });
  });
});
