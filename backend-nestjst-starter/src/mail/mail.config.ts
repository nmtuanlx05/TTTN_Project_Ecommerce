// Cấu hình gửi mail (SMTP), thuần hàm: không import nodemailer nên dùng được ở env.validation.ts và test unit.
// Thông báo lỗi CHỈ nêu TÊN biến, KHÔNG BAO GIỜ chứa giá trị (MAIL_PASSWORD, MAIL_USER, MAIL_FROM đều có thể là bí mật/địa chỉ riêng).

export type ConfigGetter = (key: string) => string | undefined;

export interface MailConfig {
  host: string;
  port: number;
  // Chuỗi nguyên văn cho header From, vd `Mono Studio <no-reply@example.com>`
  from: string;
  // Có cả hai hoặc không có cả hai (Mailpit để trống)
  user?: string;
  password?: string;
  // Cổng 465 = TLS ngay từ đầu (SMTPS). Cổng khác = kết nối thường rồi nâng cấp STARTTLS (nếu server hỗ trợ).
  secure: boolean;
  // Host không phải máy cục bộ thì BẮT BUỘC nâng cấp TLS: không có thì từ chối gửi, để mật khẩu không đi dạng rõ.
  requireTLS: boolean;
}

const LOOPBACK_HOSTS = ['127.0.0.1', 'localhost', '::1'];

// Cùng tiêu chí "máy cục bộ" với scripts/assert-test-db.ts
export function isLocalMailHost(host: string): boolean {
  return LOOPBACK_HOSTS.includes(host.trim().toLowerCase());
}

const MAIL_HINT = 'Xem docs/mail-setup.md để biết cách khai báo.';

// Giá trị rỗng/khoảng trắng coi như chưa đặt
function read(get: ConfigGetter, key: string): string | undefined {
  const value = get(key);
  return value !== undefined && value.trim() !== '' ? value : undefined;
}

// Phân tích FRONTEND_URL: URL của TRANG WEB (frontend) dùng làm link trong mail, không phải URL backend.
// Trả về dạng chuẩn hóa không có dấu / cuối. Lỗi không lộ giá trị.
export function parseFrontendUrl(raw: string | undefined): string {
  const text = raw?.trim();
  if (!text) {
    throw new Error(
      `Thiếu biến môi trường FRONTEND_URL (địa chỉ trang web, vd http://localhost:5173). ${MAIL_HINT}`,
    );
  }
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw new Error(
      `FRONTEND_URL không phải là một URL hợp lệ (vd http://localhost:5173). ${MAIL_HINT}`,
    );
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`FRONTEND_URL phải bắt đầu bằng http:// hoặc https://.`);
  }
  if (url.username || url.password) {
    throw new Error('FRONTEND_URL không được chứa tên người dùng/mật khẩu.');
  }
  return `${url.origin}${url.pathname}`.replace(/\/+$/, '');
}

// Đọc và kiểm MAIL_*. Ném Error (tiếng Việt, chỉ nêu tên biến) nếu thiếu hoặc sai.
export function readMailConfig(get: ConfigGetter): MailConfig {
  const missing = ['MAIL_HOST', 'MAIL_PORT', 'MAIL_FROM'].filter(
    (key) => read(get, key) === undefined,
  );
  if (missing.length > 0) {
    throw new Error(
      `Thiếu biến môi trường: ${missing.join(', ')}. ${MAIL_HINT}`,
    );
  }

  const host = read(get, 'MAIL_HOST')!.trim();
  if (/\s/.test(host)) {
    throw new Error(`MAIL_HOST không được chứa khoảng trắng. ${MAIL_HINT}`);
  }

  const portText = read(get, 'MAIL_PORT')!.trim();
  const port = Number(portText);
  if (!/^\d+$/.test(portText) || port < 1 || port > 65535) {
    throw new Error(`MAIL_PORT phải là số nguyên từ 1 đến 65535. ${MAIL_HINT}`);
  }

  // Chặn xuống dòng trong header From (header injection) và địa chỉ không có '@'
  const from = read(get, 'MAIL_FROM')!.trim();
  if (/[\r\n]/.test(from) || !from.includes('@')) {
    throw new Error(
      `MAIL_FROM phải là địa chỉ email, dạng "no-reply@example.com" hoặc "Tên <no-reply@example.com>". ${MAIL_HINT}`,
    );
  }

  const user = read(get, 'MAIL_USER')?.trim();
  // Mật khẩu KHÔNG trim: giữ nguyên giá trị người dùng đặt
  const password = read(get, 'MAIL_PASSWORD');
  if (user && !password) {
    throw new Error(
      `Đã đặt MAIL_USER thì bắt buộc phải có MAIL_PASSWORD. ${MAIL_HINT}`,
    );
  }
  if (password && !user) {
    throw new Error(
      `Đã đặt MAIL_PASSWORD thì bắt buộc phải có MAIL_USER. ${MAIL_HINT}`,
    );
  }

  return {
    host,
    port,
    from,
    ...(user && password && { user, password }),
    secure: port === 465,
    requireTLS: !isLocalMailHost(host),
  };
}
