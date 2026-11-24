import { validateEnv } from './env.validation';

const BASE = {
  JWT_ACCESS_SECRET: 'a',
  JWT_ACCESS_EXPIRES_IN: '15m',
  JWT_REFRESH_SECRET: 'b',
  JWT_REFRESH_EXPIRES_IN: '7d',
  REDIS_URL: 'redis://127.0.0.1:6379',
  MAIL_HOST: '127.0.0.1',
  MAIL_PORT: '1025',
  MAIL_FROM: 'no-reply@example.com',
  FRONTEND_URL: 'http://localhost:5173',
};

describe('validateEnv', () => {
  it('không lỗi khi thiếu biến tùy chọn (Cloudinary, MEDIA_*)', () => {
    expect(() => validateEnv(BASE)).not.toThrow();
  });

  it('thiếu biến Cloudinary KHÔNG làm dừng app (chỉ tắt tải ảnh)', () => {
    expect(() => validateEnv({ ...BASE })).not.toThrow();
  });

  it('thiếu JWT thì dừng và nêu tên biến', () => {
    expect(() =>
      validateEnv({ ...BASE, JWT_ACCESS_SECRET: undefined }),
    ).toThrow(/JWT_ACCESS_SECRET/);
  });

  describe('Redis (bắt buộc)', () => {
    it('thiếu REDIS_URL thì dừng, nói cách sửa', () => {
      const missing = { ...BASE, REDIS_URL: undefined };
      expect(() => validateEnv(missing)).toThrow(/REDIS_URL/);
      expect(() => validateEnv(missing)).toThrow(/npm run db:up/);
    });

    it('REDIS_URL rỗng hoặc sai thì dừng', () => {
      expect(() => validateEnv({ ...BASE, REDIS_URL: '' })).toThrow(
        /REDIS_URL/,
      );
      expect(() => validateEnv({ ...BASE, REDIS_URL: 'http://x:1' })).toThrow(
        /REDIS_URL/,
      );
    });

    it('REDIS_PASSWORD, QUEUE_PREFIX, QUEUE_WORKER_ENABLED là tùy chọn', () => {
      expect(() => validateEnv({ ...BASE })).not.toThrow();
      expect(() =>
        validateEnv({
          ...BASE,
          REDIS_PASSWORD: 'pw',
          QUEUE_PREFIX: 'x',
          QUEUE_WORKER_ENABLED: 'false',
        }),
      ).not.toThrow();
    });

    it('QUEUE_WORKER_ENABLED giá trị lạ thì dừng', () => {
      expect(() =>
        validateEnv({ ...BASE, QUEUE_WORKER_ENABLED: 'False' }),
      ).toThrow(/QUEUE_WORKER_ENABLED/);
    });

    it('lỗi không lộ mật khẩu trong REDIS_URL', () => {
      let message = '';
      try {
        validateEnv({ ...BASE, REDIS_URL: 'ftp://u:hunter2@h:1' });
      } catch (error) {
        message = (error as Error).message;
      }
      expect(message).toContain('REDIS_URL');
      expect(message).not.toContain('hunter2');
    });
  });

  describe('Mail và FRONTEND_URL (bắt buộc)', () => {
    it('thiếu MAIL_HOST/MAIL_PORT/MAIL_FROM thì dừng và nêu tên biến', () => {
      for (const key of ['MAIL_HOST', 'MAIL_PORT', 'MAIL_FROM']) {
        expect(() => validateEnv({ ...BASE, [key]: undefined })).toThrow(
          new RegExp(key),
        );
      }
    });

    it('thiếu hoặc sai FRONTEND_URL thì dừng', () => {
      expect(() => validateEnv({ ...BASE, FRONTEND_URL: undefined })).toThrow(
        /FRONTEND_URL/,
      );
      expect(() => validateEnv({ ...BASE, FRONTEND_URL: '' })).toThrow(
        /FRONTEND_URL/,
      );
      expect(() =>
        validateEnv({ ...BASE, FRONTEND_URL: 'ftp://x.com' }),
      ).toThrow(/FRONTEND_URL/);
    });

    it('MAIL_USER và MAIL_PASSWORD tùy chọn nhưng phải đi cùng nhau', () => {
      expect(() => validateEnv({ ...BASE })).not.toThrow();
      expect(() =>
        validateEnv({ ...BASE, MAIL_USER: ' ', MAIL_PASSWORD: '' }),
      ).not.toThrow();
      expect(() =>
        validateEnv({ ...BASE, MAIL_USER: 'u@gmail.com', MAIL_PASSWORD: 'pw' }),
      ).not.toThrow();
      expect(() => validateEnv({ ...BASE, MAIL_USER: 'u@gmail.com' })).toThrow(
        /MAIL_PASSWORD/,
      );
    });

    it('lỗi không lộ MAIL_PASSWORD hay MAIL_USER', () => {
      let message = '';
      try {
        validateEnv({ ...BASE, MAIL_PASSWORD: 'hunter2' });
      } catch (error) {
        message = (error as Error).message;
      }
      expect(message).toContain('MAIL_USER');
      expect(message).not.toContain('hunter2');
    });
  });
});
