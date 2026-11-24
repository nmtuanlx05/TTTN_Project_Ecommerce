import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import { type MailConfig, readMailConfig } from './mail.config';

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

// Thời gian chờ của nodemailer (mili giây): nối TCP, chờ lời chào SMTP, và mỗi lần socket im lặng
const CONNECTION_TIMEOUT_MS = 10_000;
const GREETING_TIMEOUT_MS = 10_000;
const SOCKET_TIMEOUT_MS = 20_000;
// Hàng rào NGOÀI cho cả lần gửi (DNS, TLS, xác thực, truyền thư): nodemailer đôi khi treo mà không tự báo lỗi
export const SEND_DEADLINE_MS = 30_000;

// Lỗi đã làm sạch: message CỐ ĐỊNH, không chứa gì từ lỗi gốc và không giữ lỗi gốc (cause).
// BullMQ lưu failedReason + stack của lỗi vào Redis tới 7 ngày, nên mọi thứ ở đây đều được coi là sẽ bị lưu lâu dài.
export class MailSendError extends Error {
  constructor() {
    super('Không gửi được email. Hàng đợi sẽ thử lại theo cấu hình.');
    this.name = 'MailSendError';
  }
}

export interface MailTransportInfo {
  host: string;
  port: number;
  secure: boolean;
  requireTLS: boolean;
  hasAuth: boolean;
}

// Chỉ nhận giá trị đúng dạng mã (chữ hoa/số/gạch dưới, vd "EENVELOPE", "ETIMEDOUT", "EAUTH"); lạ thì bỏ
function safeCode(value: unknown): string | undefined {
  return typeof value === 'string' && /^[A-Z][A-Z0-9_]{1,30}$/.test(value)
    ? value
    : undefined;
}

// Mã phản hồi SMTP là số 3 chữ số (vd 550)
function safeResponseCode(value: unknown): number | undefined {
  return typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 100 &&
    value <= 599
    ? value
    : undefined;
}

// Tên lệnh SMTP chỉ gồm chữ hoa (vd "RCPT TO", "AUTH PLAIN"); phần sau dấu ":" (địa chỉ) không bao giờ vào log
function safeCommand(value: unknown): string | undefined {
  return typeof value === 'string' && /^[A-Z]{2,10}( [A-Z]{2,10})?$/.test(value)
    ? value
    : undefined;
}

@Injectable()
export class MailService implements OnModuleDestroy {
  private readonly logger = new Logger(MailService.name);
  private readonly mailConfig: MailConfig;
  private readonly transport: Transporter;

  // Thiếu/sai cấu hình thì ném lỗi nêu tên biến (AppModule đã chặn từ validateEnv; script mail:test đi đường này)
  constructor(config: ConfigService) {
    this.mailConfig = readMailConfig((key) => config.get<string>(key));
    const { host, port, secure, requireTLS, user, password } = this.mailConfig;
    this.transport = createTransport({
      host,
      port,
      secure,
      requireTLS,
      // Host ngoài: không chấp nhận TLS cũ
      ...(requireTLS && { tls: { minVersion: 'TLSv1.2' } }),
      ...(user && password && { auth: { user, pass: password } }),
      connectionTimeout: CONNECTION_TIMEOUT_MS,
      greetingTimeout: GREETING_TIMEOUT_MS,
      socketTimeout: SOCKET_TIMEOUT_MS,
      // Tắt hẳn log/debug của nodemailer (chúng in cả hội thoại SMTP, có thể gồm địa chỉ và dữ liệu xác thực)
      logger: false,
      debug: false,
      // Nội dung mail do ta dựng; không cho nodemailer đọc file/URL cục bộ nếu sau này lọt dữ liệu người dùng vào
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  }

  // Thông tin cấu hình KHÔNG bí mật, để script/chẩn đoán in ra (không có user, mật khẩu hay địa chỉ From)
  describe(): MailTransportInfo {
    const { host, port, secure, requireTLS, user } = this.mailConfig;
    return { host, port, secure, requireTLS, hasAuth: user !== undefined };
  }

  // Gửi một thư. Mọi lỗi (kể cả quá hạn) đều ném MailSendError cố định để BullMQ thử lại.
  async send(message: MailMessage): Promise<{ messageId: string }> {
    try {
      const info = await this.withDeadline(
        this.transport.sendMail({ from: this.mailConfig.from, ...message }),
        SEND_DEADLINE_MS,
      );
      return { messageId: String(info.messageId) };
    } catch (error) {
      this.logFailure(error);
      throw new MailSendError();
    }
  }

  onModuleDestroy() {
    this.transport.close();
  }

  // Chỉ ghi code/responseCode/command (đã lọc theo dạng cho phép) và host:port; KHÔNG ghi message/stack của lỗi gốc
  // vì message SMTP có thể chứa địa chỉ người nhận, tên đăng nhập hay đoạn hội thoại.
  private logFailure(error: unknown) {
    const source =
      typeof error === 'object' && error !== null
        ? (error as Record<string, unknown>)
        : {};
    const parts = [
      ['code', safeCode(source.code)],
      ['responseCode', safeResponseCode(source.responseCode)],
      ['command', safeCommand(source.command)],
    ]
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `${key}=${String(value)}`);
    const { host, port } = this.mailConfig;
    this.logger.error(
      `Gửi mail thất bại qua ${host}:${port}` +
        (parts.length > 0 ? ` (${parts.join(', ')})` : ''),
    );
  }

  private async withDeadline<T>(work: Promise<T>, ms: number): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    const timedOut = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error('TIMEOUT')), ms);
    });
    // Nếu bộ đếm giờ thắng thì lỗi muộn của `work` không được thành unhandled rejection
    work.catch(() => undefined);
    try {
      return await Promise.race([work, timedOut]);
    } finally {
      clearTimeout(timer);
    }
  }
}
