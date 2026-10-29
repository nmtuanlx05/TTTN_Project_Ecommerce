import { validateEnv } from './env.validation';

const BASE = {
  JWT_ACCESS_SECRET: 'a',
  JWT_ACCESS_EXPIRES_IN: '15m',
  JWT_REFRESH_SECRET: 'b',
  JWT_REFRESH_EXPIRES_IN: '7d',
};

describe('validateEnv', () => {
  it('không lỗi khi thiếu UPLOAD_DIR và APP_PUBLIC_URL (hai biến tùy chọn)', () => {
    expect(() => validateEnv(BASE)).not.toThrow();
    expect(() => validateEnv({ ...BASE, APP_PUBLIC_URL: '' })).not.toThrow();
  });

  it('chấp nhận APP_PUBLIC_URL hợp lệ', () => {
    expect(() =>
      validateEnv({ ...BASE, APP_PUBLIC_URL: 'http://localhost:3000' }),
    ).not.toThrow();
  });

  it('báo lỗi khi APP_PUBLIC_URL có giá trị nhưng dài quá 132 ký tự', () => {
    expect(() =>
      validateEnv({
        ...BASE,
        APP_PUBLIC_URL: `https://${'a'.repeat(125)}`,
      }),
    ).toThrow(/APP_PUBLIC_URL/);
  });

  it('báo lỗi khi APP_PUBLIC_URL không phải URL', () => {
    expect(() => validateEnv({ ...BASE, APP_PUBLIC_URL: 'abc' })).toThrow(
      /APP_PUBLIC_URL/,
    );
  });
});
