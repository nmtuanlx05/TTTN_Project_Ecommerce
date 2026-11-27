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
    order: { findUnique: jest.fn<Promise<unknown>, [unknown]>() },
  };
  const mail = { send: jest.fn<Promise<{ messageId: string }>, [SentMail]>() };
  const config = { get: (key: string) => env[key] };
  prisma.user.findUnique.mockResolvedValue(USER);
  prisma.voucher.findUnique.mockResolvedValue(voucherRow());
  prisma.order.findUnique.mockResolvedValue(orderRow());
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

// Đơn đã lưu (chỉ các trường processor được phép đọc). Dữ liệu giả.
function orderRow(overrides: Record<string, unknown> = {}) {
  return {
    code: 'MS-261127-AB12',
    status: 'PENDING',
    paymentMethod: 'COD',
    paymentStatus: 'UNPAID',
    paymentExpiresAt: null,
    createdAt: new Date('2026-11-27T07:30:00Z'),
    customerEmail: 'nguoi.nhan@example.com',
    customerName: 'Trần Thị B',
    wardName: 'Phường Bến Nghé',
    districtName: 'Quận 1',
    provinceName: 'Thành phố Hồ Chí Minh',
    subtotal: 700_000,
    discountAmount: 70_000,
    voucherCode: 'MONO10',
    shippingFee: 0,
    totalAmount: 630_000,
    items: [
      {
        productName: 'Áo sơ mi linen',
        size: 'M',
        color: 'Trắng',
        quantity: 2,
        price: 350_000,
        imageUrl: null,
      },
    ],
    ...overrides,
  };
}

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

describe('EmailProcessor: job order-confirmation', () => {
  const NOW = new Date('2026-11-27T08:00:00Z');
  // Không truyền data => { orderId: 15 }; truyền undefined thật sự => data undefined (không dùng tham số mặc định)
  const run = (ctx: ReturnType<typeof setup>, ...data: unknown[]) =>
    ctx.run('order-confirmation', data.length > 0 ? data[0] : { orderId: 15 });

  beforeEach(() => {
    jest.useFakeTimers({
      now: NOW,
      doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'],
    });
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('bỏ qua (không throw, không gửi)', () => {
    it.each([
      [undefined],
      [null],
      [{}],
      [{ orderId: '15' }],
      [{ orderId: 0 }],
      [{ orderId: -1 }],
      [{ orderId: 1.5 }],
    ])('data sai (%p) => skipped INVALID_DATA', async (data) => {
      const ctx = setup();
      await expect(run(ctx, data)).resolves.toEqual({
        skipped: 'INVALID_DATA',
      });
      expect(ctx.prisma.order.findUnique).not.toHaveBeenCalled();
      expect(ctx.mail.send).not.toHaveBeenCalled();
    });

    it('không có đơn => ORDER_NOT_FOUND', async () => {
      const ctx = setup();
      ctx.prisma.order.findUnique.mockResolvedValue(null);
      await expect(run(ctx)).resolves.toEqual({ skipped: 'ORDER_NOT_FOUND' });
      expect(ctx.mail.send).not.toHaveBeenCalled();
    });

    it.each([[null], [''], ['   ']])(
      'customerEmail rỗng (%p) => NO_EMAIL',
      async (customerEmail) => {
        const ctx = setup();
        ctx.prisma.order.findUnique.mockResolvedValue(
          orderRow({ customerEmail }),
        );
        await expect(run(ctx)).resolves.toEqual({ skipped: 'NO_EMAIL' });
        expect(ctx.mail.send).not.toHaveBeenCalled();
      },
    );

    it('không có dòng hàng => NO_ITEMS', async () => {
      const ctx = setup();
      ctx.prisma.order.findUnique.mockResolvedValue(orderRow({ items: [] }));
      await expect(run(ctx)).resolves.toEqual({ skipped: 'NO_ITEMS' });
      expect(ctx.mail.send).not.toHaveBeenCalled();
    });

    it('đơn đã hủy lúc worker chạy => ORDER_CANCELLED', async () => {
      const ctx = setup();
      ctx.prisma.order.findUnique.mockResolvedValue(
        orderRow({ status: 'CANCELLED' }),
      );
      await expect(run(ctx)).resolves.toEqual({ skipped: 'ORDER_CANCELLED' });
      expect(ctx.mail.send).not.toHaveBeenCalled();
    });

    it.each([
      ['đúng hạn', new Date(NOW)],
      ['đã qua', new Date(NOW.getTime() - 60_000)],
    ])(
      'ONLINE chưa trả, hạn %s => PAYMENT_EXPIRED',
      async (_label, paymentExpiresAt) => {
        const ctx = setup();
        ctx.prisma.order.findUnique.mockResolvedValue(
          orderRow({
            status: 'PENDING_PAYMENT',
            paymentMethod: 'ONLINE',
            paymentExpiresAt,
          }),
        );
        await expect(run(ctx)).resolves.toEqual({
          skipped: 'PAYMENT_EXPIRED',
        });
        expect(ctx.mail.send).not.toHaveBeenCalled();
      },
    );

    it('ONLINE chưa trả mà không có hạn (dữ liệu hỏng) => NO_PAYMENT_DEADLINE', async () => {
      const ctx = setup();
      ctx.prisma.order.findUnique.mockResolvedValue(
        orderRow({
          status: 'PENDING_PAYMENT',
          paymentMethod: 'ONLINE',
          paymentExpiresAt: null,
        }),
      );
      await expect(run(ctx)).resolves.toEqual({
        skipped: 'NO_PAYMENT_DEADLINE',
      });
      expect(ctx.mail.send).not.toHaveBeenCalled();
    });
  });

  it('chỉ đọc đúng các trường cần, KHÔNG đọc SĐT, số nhà, ghi chú, địa chỉ ghép', async () => {
    const ctx = setup();
    await run(ctx);
    const args = ctx.prisma.order.findUnique.mock.calls[0][0] as {
      where: unknown;
      select: Record<string, unknown>;
    };
    expect(args.where).toEqual({ id: 15 });
    expect(Object.keys(args.select).sort()).toEqual(
      [
        'code',
        'createdAt',
        'customerEmail',
        'customerName',
        'discountAmount',
        'districtName',
        'items',
        'paymentExpiresAt',
        'paymentMethod',
        'paymentStatus',
        'provinceName',
        'shippingFee',
        'status',
        'subtotal',
        'totalAmount',
        'voucherCode',
        'wardName',
      ].sort(),
    );
    for (const field of [
      'customerPhone',
      'addressLine',
      'note',
      'shippingAddress',
    ]) {
      expect(args.select).not.toHaveProperty(field);
    }
    expect(args.select.items).toEqual({
      select: {
        productName: true,
        size: true,
        color: true,
        quantity: true,
        price: true,
        imageUrl: true,
      },
      orderBy: { id: 'asc' },
    });
    expect(ctx.prisma.user.findUnique).not.toHaveBeenCalled();
  });

  describe('gửi thư', () => {
    it('COD: gửi tới customerEmail của ĐƠN, thư dựng từ dữ liệu đã lưu', async () => {
      const ctx = setup();
      await expect(run(ctx)).resolves.toEqual({ sent: true, payment: 'COD' });

      expect(ctx.mail.send).toHaveBeenCalledTimes(1);
      const sent = ctx.mail.send.mock.calls[0][0];
      expect(sent.to).toBe('nguoi.nhan@example.com');
      expect(sent.subject).toBe(
        'MONO STUDIO · Đơn hàng #MS-261127-AB12 đã được ghi nhận',
      );
      expect(sent.html).toContain('Thanh toán khi nhận hàng');
      expect(sent.text).toContain('Tổng cộng: 630.000₫');
      expect(sent.text).toContain('Giảm giá (MONO10): -70.000₫');
      expect(sent.text).toContain('Chào Trần Thị B,');
      expect(sent.text).toContain(
        'Giao hàng tới: Trần Thị B, Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh',
      );
    });

    it('tổng tiền là giá trị ĐÃ LƯU, không tính lại', async () => {
      const ctx = setup();
      ctx.prisma.order.findUnique.mockResolvedValue(
        orderRow({ totalAmount: 123_456 }),
      );
      await run(ctx);
      expect(ctx.mail.send.mock.calls[0][0].text).toContain(
        'Tổng cộng: 123.456₫',
      );
    });

    it('ONLINE chưa trả, còn hạn => ONLINE_PENDING kèm hạn và link thanh toán', async () => {
      const ctx = setup();
      ctx.prisma.order.findUnique.mockResolvedValue(
        orderRow({
          status: 'PENDING_PAYMENT',
          paymentMethod: 'ONLINE',
          paymentExpiresAt: new Date('2026-11-27T08:30:00Z'),
        }),
      );
      await expect(run(ctx)).resolves.toEqual({
        sent: true,
        payment: 'ONLINE_PENDING',
      });
      const sent = ctx.mail.send.mock.calls[0][0];
      expect(sent.text).toContain(
        'Vui lòng chuyển khoản trước 27/11/2026 15:30. Quá hạn, đơn sẽ tự hủy.',
      );
      expect(sent.html).toContain(
        'href="http://localhost:5173/thanh-toan-online/MS-261127-AB12"',
      );
    });

    it('ONLINE đã PAID lúc worker chạy => ONLINE_PAID (không hạn, không link), kể cả khi đã quá hạn cũ', async () => {
      const ctx = setup();
      ctx.prisma.order.findUnique.mockResolvedValue(
        orderRow({
          status: 'PENDING',
          paymentMethod: 'ONLINE',
          paymentStatus: 'PAID',
          paymentExpiresAt: new Date(NOW.getTime() - 60_000),
        }),
      );
      await expect(run(ctx)).resolves.toEqual({
        sent: true,
        payment: 'ONLINE_PAID',
      });
      const sent = ctx.mail.send.mock.calls[0][0];
      expect(sent.html).toContain('Đã thanh toán');
      expect(sent.html).not.toContain('thanh-toan-online');
      expect(sent.html).not.toContain('tự hủy');
    });

    it('link dùng FRONTEND_URL; ngưỡng miễn phí ship từ orders.constants', async () => {
      const ctx = setup({ FRONTEND_URL: 'https://shop.example.com/' });
      await run(ctx);
      const sent = ctx.mail.send.mock.calls[0][0];
      expect(sent.html).toContain(
        'href="https://shop.example.com/tai-khoan/don-hang/MS-261127-AB12"',
      );
      expect(sent.html).toContain('Miễn phí vận chuyển từ 500.000₫');
    });

    it('FRONTEND_URL thiếu => throw, không gửi', async () => {
      const ctx = setup({});
      await expect(run(ctx)).rejects.toThrow(/FRONTEND_URL/);
      expect(ctx.mail.send).not.toHaveBeenCalled();
    });

    it('gửi lỗi => throw (để BullMQ thử lại)', async () => {
      const ctx = setup();
      ctx.mail.send.mockRejectedValue(new Error('Không gửi được email.'));
      await expect(run(ctx)).rejects.toThrow('Không gửi được email.');
    });

    it('lỗi DB khi đọc đơn => throw, không gửi', async () => {
      const ctx = setup();
      ctx.prisma.order.findUnique.mockRejectedValue(new Error('db down'));
      await expect(run(ctx)).rejects.toThrow('db down');
      expect(ctx.mail.send).not.toHaveBeenCalled();
    });

    it('kết quả job và log KHÔNG chứa email, tên, địa chỉ', async () => {
      const logged: string[] = [];
      jest.restoreAllMocks();
      for (const level of ['log', 'warn'] as const) {
        jest
          .spyOn(Logger.prototype, level)
          .mockImplementation((...args: unknown[]) => {
            logged.push(args.map(String).join(' '));
          });
      }
      const ctx = setup();
      const results = [await run(ctx)];
      ctx.prisma.order.findUnique.mockResolvedValue(orderRow({ items: [] }));
      results.push(await run(ctx));
      const text = JSON.stringify(results) + logged.join('\n');
      for (const secret of [
        'nguoi.nhan@example.com',
        'Trần Thị B',
        'Bến Nghé',
        'Quận 1',
      ]) {
        expect(text).not.toContain(secret);
      }
      expect(logged.join('\n')).toContain('orderId=15');
    });
  });
});
