import { ENV_FILE } from './env-file';

// Các biến bắt buộc cho Auth; thiếu biến nào thì app dừng ngay khi khởi động và nói rõ thiếu biến nào.
const REQUIRED_AUTH_ENV = [
  'JWT_ACCESS_SECRET',
  'JWT_ACCESS_EXPIRES_IN',
  'JWT_REFRESH_SECRET',
  'JWT_REFRESH_EXPIRES_IN',
] as const;

export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const missing = REQUIRED_AUTH_ENV.filter((key) => {
    const value = config[key];
    return typeof value !== 'string' || value.trim() === '';
  });

  if (missing.length > 0) {
    throw new Error(
      `Thiếu biến môi trường: ${missing.join(', ')}. Hãy khai báo trong file ${ENV_FILE} (xem .env.example).`,
    );
  }

  // Hai secret trùng nhau thì access token dùng được như refresh token, làm mất tác dụng tách secret.
  if (config.JWT_ACCESS_SECRET === config.JWT_REFRESH_SECRET) {
    throw new Error('JWT_ACCESS_SECRET và JWT_REFRESH_SECRET phải khác nhau.');
  }

  return config;
}
