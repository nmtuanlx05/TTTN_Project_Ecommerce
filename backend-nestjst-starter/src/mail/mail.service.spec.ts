import { Logger } from '@nestjs/common';
import { MailService } from './mail.service';

// @nestjs/config chỉ có bản ESM nên Jest không nạp được; MailService chỉ cần class này làm token DI
jest.mock('@nestjs/config', () => ({ ConfigService: class ConfigService {} }));

// nodemailer giả: test KHÔNG BAO GIỜ mở kết nối SMTP hay gửi mail thật
const sendMail = jest.fn();
const close = jest.fn();
const createTransport = jest.fn<
  { sendMail: jest.Mock; close: jest.Mock },
  [Record<string, unknown>]
>(() => ({ sendMail, close }));
jest.mock('nodemailer', () => ({
  createTransport: (options: Record<string, unknown>) =>
    createTransport(options),
}));

const MAILPIT: Record<string, string> = {
  MAIL_HOST: '127.0.0.1',
  MAIL_PORT: '1025',
  MAIL_FROM: 'no-reply@example.com',
};
const GMAIL: Record<string, string> = {
  MAIL_HOST: 'smtp.gmail.com',
  MAIL_PORT: '587',
  MAIL_FROM: 'Shop <shop@example.com>',
  MAIL_USER: 'shop@example.com',
  MAIL_PASSWORD: 'hunter2',
};

const configOf = (env: Record<string, string>) =>
  ({ get: (key: string) => env[key] }) as never;

const MESSAGE = {
  to: 'nguoi-nhan@example.com',
  subject: 'Xin chào',
  html: '<p>Xin chào</p>',
  text: 'Xin chào',
};

// Lỗi SMTP mô phỏng: message thô chứa địa chỉ người nhận và mật khẩu (nodemailer có thể làm vậy)
function smtpError(overrides: Record<string, unknown> = {}) {
  return Object.assign(
    new Error(
      'Invalid login hunter2 / 550 5.1.1 <nguoi-nhan@example.com>: user unknown',
    ),
    { code: 'EENVELOPE', responseCode: 550, command: 'RCPT TO' },
    overrides,
  );
}

describe('MailService', () => {
  let logged: string[];

  beforeEach(() => {
    jest.clearAllMocks();
    logged = [];
    for (const level of ['error', 'warn', 'log'] as const) {
      jest
        .spyOn(Logger.prototype, level)
        .mockImplementation((...args: unknown[]) => {
          logged.push(args.map((a) => String(a)).join(' '));
        });
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('cấu hình transport', () => {
    it('Mailpit: không auth, không secure, không requireTLS', () => {
      new MailService(configOf(MAILPIT));
      const options = createTransport.mock.calls[0][0];
      expect(options).toMatchObject({
        host: '127.0.0.1',
        port: 1025,
        secure: false,
        requireTLS: false,
      });
      expect(options).not.toHaveProperty('auth');
    });

    it('Gmail 587: có auth, secure=false, requireTLS=true', () => {
      new MailService(configOf(GMAIL));
      expect(createTransport.mock.calls[0][0]).toMatchObject({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        requireTLS: true,
        auth: { user: 'shop@example.com', pass: 'hunter2' },
      });
    });

    it('cổng 465 => secure=true', () => {
      new MailService(configOf({ ...GMAIL, MAIL_PORT: '465' }));
      expect(createTransport.mock.calls[0][0]).toMatchObject({ secure: true });
    });

    it('có timeout kết nối/chào/socket và tắt logger, đọc file/URL của nodemailer', () => {
      new MailService(configOf(MAILPIT));
      const options = createTransport.mock.calls[0][0];
      expect(options.connectionTimeout).toEqual(expect.any(Number));
      expect(options.greetingTimeout).toEqual(expect.any(Number));
      expect(options.socketTimeout).toEqual(expect.any(Number));
      expect(options).toMatchObject({
        logger: false,
        debug: false,
        disableFileAccess: true,
        disableUrlAccess: true,
      });
    });

    it('thiếu cấu hình thì ném lỗi nêu tên biến', () => {
      expect(() => new MailService(configOf({}))).toThrow(/MAIL_HOST/);
    });
  });

  describe('send', () => {
    it('thành công: gửi kèm from, to, subject, html và text; trả messageId', async () => {
      sendMail.mockResolvedValue({ messageId: '<abc@local>' });
      const service = new MailService(configOf(MAILPIT));

      await expect(service.send(MESSAGE)).resolves.toEqual({
        messageId: '<abc@local>',
      });
      expect(sendMail).toHaveBeenCalledWith({
        from: 'no-reply@example.com',
        ...MESSAGE,
      });
    });

    it('lỗi gửi: ném câu cố định tiếng Việt, KHÔNG lộ message thô, và không giữ lỗi gốc (cause)', async () => {
      sendMail.mockRejectedValue(smtpError());
      const service = new MailService(configOf(GMAIL));

      const error = await service.send(MESSAGE).catch((e: Error) => e);

      expect(error).toBeInstanceOf(Error);
      const failure = error as Error;
      expect(failure.message).toMatch(/Không gửi được email/);
      expect(failure.cause).toBeUndefined();
      // failedReason + stack của BullMQ nằm trong Redis 7 ngày: cả hai không được chứa bí mật
      const persisted = `${failure.message}\n${failure.stack ?? ''}\n${JSON.stringify(failure)}`;
      expect(persisted).not.toContain('hunter2');
      expect(persisted).not.toContain('nguoi-nhan@example.com');
      expect(persisted).not.toContain('user unknown');
    });

    it('lỗi gửi: log chỉ có code/responseCode/command/host:port, KHÔNG có message thô', async () => {
      sendMail.mockRejectedValue(smtpError());
      const service = new MailService(configOf(GMAIL));

      await service.send(MESSAGE).catch(() => undefined);

      const output = logged.join('\n');
      expect(output).toContain('EENVELOPE');
      expect(output).toContain('550');
      expect(output).toContain('smtp.gmail.com:587');
      expect(output).not.toContain('hunter2');
      expect(output).not.toContain('nguoi-nhan@example.com');
      expect(output).not.toContain('user unknown');
      expect(output).not.toContain('shop@example.com'); // MAIL_USER/MAIL_FROM
    });

    it('lỗi không có code (hoặc code lạ chứa dữ liệu) thì không đưa nguyên giá trị vào log', async () => {
      sendMail.mockRejectedValue(
        smtpError({
          code: 'tai-khoan nguoi-nhan@example.com',
          command: 'RCPT TO:<nguoi-nhan@example.com>',
          responseCode: 'hunter2',
        }),
      );
      const service = new MailService(configOf(GMAIL));

      await service.send(MESSAGE).catch(() => undefined);

      const output = logged.join('\n');
      expect(output).not.toContain('nguoi-nhan@example.com');
      expect(output).not.toContain('hunter2');
    });

    it('lỗi không phải Error (chuỗi/undefined) vẫn được làm sạch', async () => {
      sendMail.mockRejectedValue('mat-khau hunter2');
      const service = new MailService(configOf(GMAIL));

      const error = await service.send(MESSAGE).catch((e: Error) => e);

      expect((error as Error).message).toMatch(/Không gửi được email/);
      expect(logged.join('\n')).not.toContain('hunter2');
    });

    it('hàng rào 30 giây: sendMail treo thì send() thất bại, không treo vô hạn', async () => {
      jest.useFakeTimers();
      sendMail.mockReturnValue(new Promise(() => undefined)); // không bao giờ xong
      const service = new MailService(configOf(MAILPIT));

      const result = service.send(MESSAGE).catch((e: Error) => e);
      await jest.advanceTimersByTimeAsync(30_000);

      expect(await result).toMatchObject({
        message: expect.stringMatching(/Không gửi được email/) as string,
      });
    });

    it('sendMail xong trước hạn thì không để bộ đếm giờ treo lại', async () => {
      jest.useFakeTimers();
      sendMail.mockResolvedValue({ messageId: 'x' });
      const service = new MailService(configOf(MAILPIT));

      await service.send(MESSAGE);

      expect(jest.getTimerCount()).toBe(0);
    });
  });

  it('onModuleDestroy đóng transport', () => {
    new MailService(configOf(MAILPIT)).onModuleDestroy();
    expect(close).toHaveBeenCalledTimes(1);
  });

  describe('describe()', () => {
    it('chỉ trả thông tin không bí mật', () => {
      const info = new MailService(configOf(GMAIL)).describe();
      expect(info).toEqual({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        requireTLS: true,
        hasAuth: true,
      });
      expect(JSON.stringify(info)).not.toContain('hunter2');
    });
  });
});
