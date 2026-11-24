// Cấu hình hàng đợi (Redis + BullMQ), thuần hàm: không import bullmq/ioredis nên dùng được ở env.validation.ts và test unit.
// Thông báo lỗi KHÔNG BAO GIỜ chứa giá trị REDIS_URL/REDIS_PASSWORD vì URL có thể chứa mật khẩu.

export const DEFAULT_QUEUE_PREFIX = 'ecommerce';

// Gợi ý chung cho mọi lỗi cấu hình Redis: nói rõ cách sửa
const REDIS_URL_HINT =
  'REDIS_URL phải có dạng redis://127.0.0.1:6379 (hoặc rediss:// nếu Redis dùng TLS). ' +
  'Môi trường dev: chạy "npm run db:up" để dựng Redis rồi khai báo REDIS_URL trong file .env của môi trường (xem .env.example).';

// Tùy chọn kết nối dạng object (host/port/password/tls) để truyền cho BullMQ/ioredis; không truyền instance ioredis.
export interface RedisConnectionOptions {
  host: string;
  port: number;
  username?: string;
  password?: string;
  db?: number;
  // Có mặt khi dùng rediss:// (bật TLS). servername = tên máy chủ để kiểm chứng chứng chỉ; các tùy chọn TLS khác là mặc định của Node.
  tls?: { servername: string };
}

export interface QueueConfig {
  connection: RedisConnectionOptions;
  prefix: string;
  workerEnabled: boolean;
}

export type ConfigGetter = (key: string) => string | undefined;

function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new Error(
      `REDIS_URL có ký tự mã hóa % không hợp lệ. ${REDIS_URL_HINT}`,
    );
  }
}

// Phân tích REDIS_URL. Ném Error (tiếng Việt, kèm cách sửa) nếu thiếu hoặc sai.
// REDIS_PASSWORD (biến riêng, không rỗng) được ưu tiên hơn mật khẩu nằm trong URL.
export function parseRedisUrl(
  rawUrl: string | undefined,
  rawPassword?: string,
): RedisConnectionOptions {
  const text = rawUrl?.trim();
  if (!text) {
    throw new Error(`Thiếu biến môi trường REDIS_URL. ${REDIS_URL_HINT}`);
  }

  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw new Error(
      `REDIS_URL không phải là một URL hợp lệ. ${REDIS_URL_HINT}`,
    );
  }

  if (url.protocol !== 'redis:' && url.protocol !== 'rediss:') {
    throw new Error(
      `REDIS_URL phải bắt đầu bằng redis:// hoặc rediss://. ${REDIS_URL_HINT}`,
    );
  }
  if (!url.hostname) {
    throw new Error(`REDIS_URL thiếu tên máy chủ. ${REDIS_URL_HINT}`);
  }

  // new URL bỏ cổng khi trùng cổng mặc định của giao thức (không phải 6379), nên tự đặt mặc định 6379
  let port = 6379;
  if (url.port !== '') {
    port = Number(url.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error(`Cổng trong REDIS_URL không hợp lệ. ${REDIS_URL_HINT}`);
    }
  }

  // Đường dẫn /N chọn database số N (mặc định 0); đường dẫn khác bị từ chối thay vì lặng lẽ bỏ qua
  let db: number | undefined;
  const path = url.pathname.replace(/^\/+/, '');
  if (path !== '') {
    if (!/^\d+$/.test(path)) {
      throw new Error(
        `Phần đường dẫn của REDIS_URL phải là số database (ví dụ /0). ${REDIS_URL_HINT}`,
      );
    }
    db = Number(path);
  }

  const envPassword = rawPassword?.trim();
  const urlPassword = url.password ? decode(url.password) : undefined;
  const password = envPassword ? rawPassword : urlPassword;

  // Hostname IPv6 trong URL nằm trong ngoặc vuông ([::1]); ioredis cần dạng không có ngoặc
  const host = url.hostname.replace(/^\[|\]$/g, '');

  return {
    host,
    port,
    ...(url.username && { username: decode(url.username) }),
    ...(password && { password }),
    ...(db !== undefined && { db }),
    ...(url.protocol === 'rediss:' && { tls: { servername: host } }),
  };
}

// 'false' (đúng chữ thường) mới tắt worker; không đặt hoặc rỗng = bật
export function parseWorkerEnabled(raw: string | undefined): boolean {
  return raw?.trim() !== 'false';
}

// Chỉ nhận 'true'/'false' để gõ nhầm (vd 'False', '0') không lặng lẽ bật worker ngoài ý muốn
export function assertWorkerFlag(raw: string | undefined): void {
  const value = raw?.trim();
  if (value && value !== 'true' && value !== 'false') {
    throw new Error('QUEUE_WORKER_ENABLED chỉ nhận true hoặc false.');
  }
}

export function readQueueConfig(get: ConfigGetter): QueueConfig {
  const prefix = get('QUEUE_PREFIX')?.trim() || DEFAULT_QUEUE_PREFIX;
  return {
    connection: parseRedisUrl(get('REDIS_URL'), get('REDIS_PASSWORD')),
    prefix,
    workerEnabled: parseWorkerEnabled(get('QUEUE_WORKER_ENABLED')),
  };
}
