import { validateEnv } from './env.validation';

const BASE = {
  JWT_ACCESS_SECRET: 'a',
  JWT_ACCESS_EXPIRES_IN: '15m',
  JWT_REFRESH_SECRET: 'b',
  JWT_REFRESH_EXPIRES_IN: '7d',
};

describe('validateEnv', () => {
  it('không lỗi khi thiếu biến tùy chọn (Cloudinary, MEDIA_*)', () => {
    expect(() => validateEnv(BASE)).not.toThrow();
    expect(() => validateEnv({ ...BASE, APP_PUBLIC_URL: '' })).not.toThrow();
  });

  it('thiếu biến Cloudinary KHÔNG làm dừng app (chỉ tắt tải ảnh)', () => {
    expect(() => validateEnv({ ...BASE })).not.toThrow();
  });
});
