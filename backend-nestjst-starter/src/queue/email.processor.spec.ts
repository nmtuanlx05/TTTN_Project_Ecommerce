import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { EmailProcessor } from './email.processor';
import { WELCOME_VOUCHER_CODE } from '../mail/templates/mail-assets';

// @nestjs/bullmq và @nestjs/config chỉ có bản ESM nên Jest không nạp được; chỉ cần chúng làm decorator/token
jest.mock('@nestjs/bullmq', () => ({
  Processor: () => () => undefined,
  OnWorkerEvent: () => () => undefined,
  WorkerHost: class WorkerHost {},
}));
jest.mock('@nestjs/config', () => ({ ConfigService: class ConfigService {} }));

const USER = {
  id: 7,
  email: 'khach.hang@example.com',
  name: 'Lan Anh',
  isActive: true,
};

const FUTURE = new Date(Date.now() + 30 * 24 * 3600 * 1000);
const PAST = new Date(Date.now() - 30 * 24 * 3600 * 1000);

function voucherRow(overrides: Record<string, unknown> = {}) {
  return {
    code: 'MONO10',
    discountType: 'PERCENT',
    discountValue: 10,
    maxDiscount: 100_000,
    minOrderValue: 300_000,
    expiresAt: FUTURE,
    isActive: true,
    startsAt: PAST,
    usageLimit: null,
    usedCount: 0,
    ...overrides,
  };
}

function setup(
  env: Record<string, string> = { FRONTEND_URL: 'http://localhost:5173' },
) {
  const prisma = {
    user: { findUnique: jest.fn() },
    voucher: { findUnique: jest.fn() },
  };
  const mail = { send: jest.fn<Promise<{ messageId: string }>, [SentMail]>() };
  const config = { get: (key: string) => env[key] };
  prisma.user.findUnique.mockResolvedValue(USER);
  prisma.voucher.findUnique.mockResolvedValue(voucherRow());
  mail.send.mockResolvedValue({ messageId: '<id@local>' });
  const processor = new EmailProcessor(
    prisma as never,
    mail as never,
    config as never,
  );
  const run = (name: string, data?: unknown) =>
    processor.process({ name, data, id: 'welcome-7' } as unknown as Job);
  return { prisma, mail, run };
}

const welcome = (userId: unknown = 7) => ({ userId });

interface SentMail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

describe('EmailProcessor: job welcome', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  describe('user', () => {
    it('user không tồn tại => skipped USER_GONE, KHÔNG gọi send, không throw', async () => {
      const { prisma, mail, run } = setup();
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(run('welcome', welcome())).resolves.toEqual({
        skipped: 'USER_GONE',
      });
      expect(mail.send).not.toHaveBeenCalled();
      expect(prisma.voucher.findUnique).not.toHaveBeenCalled();
    });

    it('user bị khóa (isActive=false) => skipped USER_GONE, KHÔNG gọi send', async () => {
      const { prisma, mail, run } = setup();
      prisma.user.findUnique.mockResolvedValue({ ...USER, isActive: false });

      await expect(run('welcome', welcome())).resolves.toEqual({
        skipped: 'USER_GONE',
      });
      expect(mail.send).not.toHaveBeenCalled();
    });

    it('chỉ đọc đúng các trường cần của user (id, email, name, isActive)', async () => {
      const { prisma, run } = setup();
      await run('welcome', welcome());
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 7 },
        select: { id: true, email: true, name: true, isActive: true },
      });
    });

    it.each([
      ['thiếu data', undefined],
      ['data null', null],
      ['không có userId', {}],
      ['userId là chuỗi', { userId: '7' }],
      ['userId = 0', { userId: 0 }],
      ['userId âm', { userId: -3 }],
      ['userId lẻ', { userId: 1.5 }],
      ['userId NaN', { userId: Number.NaN }],
    ])(
      'data sai (%s) => skipped INVALID_DATA, không đụng DB, không gửi',
      async (_l, data) => {
        const { prisma, mail, run } = setup();

        await expect(run('welcome', data)).resolves.toEqual({
          skipped: 'INVALID_DATA',
        });
        expect(prisma.user.findUnique).not.toHaveBeenCalled();
        expect(mail.send).not.toHaveBeenCalled();
      },
    );
  });

  describe('voucher', () => {
    it('đọc voucher theo mã WELCOME_VOUCHER_CODE', async () => {
      const { prisma, run } = setup();
      await run('welcome', welcome());
      expect(prisma.voucher.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { code: WELCOME_VOUCHER_CODE } }),
      );
      expect(WELCOME_VOUCHER_CODE).toBe('MONO10');
    });

    it('voucher dùng được => thư CÓ khối voucher', async () => {
      const { mail, run } = setup();
      const result = await run('welcome', welcome());

      expect(result).toEqual({ sent: true, voucherShown: true });
      const sent = mail.send.mock.calls[0][0];
      expect(sent.html).toContain('MONO10');
      expect(sent.html).toContain('Mã ưu đãi · Giảm 10%');
      expect(sent.text).toContain('MONO10');
    });

    it.each([
      ['không tồn tại', null],
      ['bị tắt', voucherRow({ isActive: false })],
      ['hết hạn', voucherRow({ expiresAt: PAST })],
      ['chưa đến hạn', voucherRow({ startsAt: FUTURE })],
      ['hết lượt', voucherRow({ usageLimit: 5, usedCount: 5 })],
    ])(
      'voucher %s => VẪN gửi thư, không có khối voucher, không throw',
      async (_l, row) => {
        const { prisma, mail, run } = setup();
        prisma.voucher.findUnique.mockResolvedValue(row);

        await expect(run('welcome', welcome())).resolves.toEqual({
          sent: true,
          voucherShown: false,
        });
        expect(mail.send).toHaveBeenCalledTimes(1);
        const sent = mail.send.mock.calls[0][0] as {
          html: string;
          text: string;
        };
        expect(sent.html).not.toContain('MONO10');
        expect(sent.html).not.toContain('Mã ưu đãi');
        expect(sent.text).not.toContain('MONO10');
      },
    );

    it('còn lượt (usedCount < usageLimit) thì vẫn hiển thị', async () => {
      const { prisma, run } = setup();
      prisma.voucher.findUnique.mockResolvedValue(
        voucherRow({ usageLimit: 5, usedCount: 4 }),
      );
      await expect(run('welcome', welcome())).resolves.toMatchObject({
        voucherShown: true,
      });
    });

    it('lỗi DB khi đọc voucher => throw (để thử lại), KHÔNG gửi thư thiếu', async () => {
      const { prisma, mail, run } = setup();
      prisma.voucher.findUnique.mockRejectedValue(new Error('db down'));

      await expect(run('welcome', welcome())).rejects.toThrow('db down');
      expect(mail.send).not.toHaveBeenCalled();
    });
  });

  describe('gửi thư', () => {
    it('gửi tới email của user với subject, html, text từ mẫu', async () => {
      const { mail, run } = setup();
      await run('welcome', welcome());

      expect(mail.send).toHaveBeenCalledTimes(1);
      expect(mail.send).toHaveBeenCalledWith({
        to: USER.email,
        subject: 'Chào mừng bạn đến với MONO STUDIO',
        html: expect.stringContaining('Xin chào,<br>Lan Anh.') as string,
        text: expect.stringContaining('Xin chào, Lan Anh.') as string,
      });
    });

    it('link dùng FRONTEND_URL (bỏ dấu / cuối) và ngưỡng miễn phí vận chuyển từ orders.constants', async () => {
      const { mail, run } = setup({
        FRONTEND_URL: 'https://shop.example.com/',
      });
      await run('welcome', welcome());
      const sent = mail.send.mock.calls[0][0];
      expect(sent.html).toContain('href="https://shop.example.com/products"');
      expect(sent.html).toContain('Miễn phí vận chuyển từ 500.000₫');
    });

    it('tên trùng phần trước @ => chào chung', async () => {
      const { prisma, mail, run } = setup();
      prisma.user.findUnique.mockResolvedValue({
        ...USER,
        name: 'KHACH.HANG',
      });
      await run('welcome', welcome());
      const sent = mail.send.mock.calls[0][0];
      expect(sent.html).toContain('Xin chào bạn.');
    });

    it('gửi lỗi => process() THROW (để BullMQ thử lại)', async () => {
      const { mail, run } = setup();
      mail.send.mockRejectedValue(new Error('Không gửi được email.'));
      await expect(run('welcome', welcome())).rejects.toThrow(
        'Không gửi được email.',
      );
    });

    it('lỗi DB khi đọc user => throw, không gửi', async () => {
      const { prisma, mail, run } = setup();
      prisma.user.findUnique.mockRejectedValue(new Error('db down'));
      await expect(run('welcome', welcome())).rejects.toThrow('db down');
      expect(mail.send).not.toHaveBeenCalled();
    });

    it('FRONTEND_URL thiếu/sai => throw (không gửi thư có link hỏng)', async () => {
      const { mail, run } = setup({});
      await expect(run('welcome', welcome())).rejects.toThrow(/FRONTEND_URL/);
      expect(mail.send).not.toHaveBeenCalled();
    });

    it('kết quả job và log KHÔNG chứa email hay tên', async () => {
      const logged: string[] = [];
      for (const level of ['log', 'warn'] as const) {
        jest
          .spyOn(Logger.prototype, level)
          .mockImplementation((...args: unknown[]) => {
            logged.push(args.map(String).join(' '));
          });
      }
      const { run } = setup();
      const result = await run('welcome', welcome());
      const text = JSON.stringify(result) + logged.join('\n');
      expect(text).not.toContain(USER.email);
      expect(text).not.toContain('Lan Anh');
    });
  });

  describe('job khác', () => {
    it('ping vẫn hoạt động', async () => {
      const { run } = setup();
      await expect(run('ping')).resolves.toHaveProperty('handledAt');
    });

    it('loại job lạ => reject', async () => {
      const { run } = setup();
      await expect(run('khong-biet')).rejects.toThrow(/không được hỗ trợ/);
    });
  });
});
