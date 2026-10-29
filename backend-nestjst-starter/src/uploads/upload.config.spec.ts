import { resolve } from 'path';
import {
  DEFAULT_PUBLIC_URL,
  MAX_PUBLIC_URL_LENGTH,
  resolveUploadConfig,
  validatePublicUrl,
} from './upload.config';

describe('resolveUploadConfig', () => {
  it('thiếu biến thì dùng mặc định, thư mục là đường dẫn tuyệt đối', () => {
    const config = resolveUploadConfig({});
    expect(config.rootDir).toBe(resolve(process.cwd(), 'uploads'));
    expect(config.tmpDir).toBe(resolve(process.cwd(), 'uploads', '.tmp'));
    expect(config.publicUrl).toBe(DEFAULT_PUBLIC_URL);
  });

  it('chuỗi rỗng coi như chưa đặt', () => {
    expect(
      resolveUploadConfig({ UPLOAD_DIR: '  ', APP_PUBLIC_URL: '' }),
    ).toEqual(resolveUploadConfig({}));
  });

  it('nhận đường dẫn tương đối và tuyệt đối; bỏ dấu / cuối của URL', () => {
    expect(resolveUploadConfig({ UPLOAD_DIR: 'data/img' }).rootDir).toBe(
      resolve(process.cwd(), 'data/img'),
    );
    expect(resolveUploadConfig({ UPLOAD_DIR: '/var/img' }).rootDir).toBe(
      '/var/img',
    );
    expect(
      resolveUploadConfig({ APP_PUBLIC_URL: 'https://api.shop.vn//' })
        .publicUrl,
    ).toBe('https://api.shop.vn');
  });
});

describe('validatePublicUrl', () => {
  it('độ dài tối đa là 132 để URL ảnh dài nhất vẫn ≤ 191', () => {
    expect(MAX_PUBLIC_URL_LENGTH).toBe(132);
    const base = 'https://' + 'a'.repeat(MAX_PUBLIC_URL_LENGTH - 8);
    expect(base).toHaveLength(MAX_PUBLIC_URL_LENGTH);
    expect(validatePublicUrl(base)).toBeNull();
    expect(
      `${base}/uploads/products/${'0'.repeat(36)}.webp`.length,
    ).toBeLessThanOrEqual(191);
    expect(validatePublicUrl(`${base}a`)).toMatch(/không được dài quá 132/);
  });

  it('chấp nhận http(s) hợp lệ', () => {
    expect(validatePublicUrl(DEFAULT_PUBLIC_URL)).toBeNull();
    expect(validatePublicUrl('https://api.shop.vn/')).toBeNull();
  });

  it.each(['abc', 'ftp://x.vn', 'localhost:3000'])('từ chối %s', (value) => {
    expect(validatePublicUrl(value)).not.toBeNull();
  });
});
