// res.body của supertest có kiểu any; test chỉ đọc để so sánh nên tắt các rule unsafe-* cho file này.
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from '../src/app.setup';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { AdminPaymentsController } from '../src/payments/admin-payments.controller';
import { PaymentConfigService } from '../src/payments/payment-config.service';
import { PaymentsService } from '../src/payments/payments.service';
import { SepayWebhookController } from '../src/payments/sepay-webhook.controller';
import { UsersService } from '../src/users/users.service';

jest.mock('@nestjs/config', () => ({ ConfigService: class {} }));
jest.mock('../src/prisma/prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../src/inventory/inventory.service', () => ({
  InventoryService: class {},
}));
jest.mock('../src/orders/order-workflow.service', () => ({
  OrderWorkflowService: class {},
}));

const ACCESS_SECRET = 'test-access-secret';
const WEBHOOK_KEY = 'test-webhook-key-not-a-real-secret';
type RoleName = 'ADMIN' | 'STAFF' | 'CUSTOMER';

const sepayBody = {
  id: 92704,
  gateway: 'Vietcombank',
  transactionDate: '2026-11-09 11:08:33',
  accountNumber: '0123456789',
  code: null,
  content: 'MS261105PKGA',
  transferType: 'in',
  transferAmount: 350000,
  accumulated: 19077000,
  subAccount: null,
  referenceCode: 'FT24012345678',
  description: '',
};

// Service giả (không DB, không ghi vào ecommerce_dev): kiểm phần nối ở tầng toàn cục (xác thực khóa webhook, guard 401/403,
// ValidationPipe, response chuẩn) và việc controller chuyển đúng tham số. Logic xác nhận nằm ở src/payments/*.spec.ts.
// Chống xử lý hai lần ở DB (ràng buộc duy nhất, khóa dòng) CHƯA được kiểm chứng trên MySQL thật.
describe('Payments API (e2e, service giả)', () => {
  let app: INestApplication<App>;
  const tokens = {} as Record<RoleName, string>;
  const seen = new Set<string>();

  const paymentsService = {
    // Giả lập đúng hợp đồng của lõi: id đã thấy → DUPLICATE
    confirmBankTransfer: jest.fn((input: { providerTxnId: string }) => {
      if (seen.has(input.providerTxnId)) {
        return Promise.resolve({ result: 'DUPLICATE', transactionId: 1 });
      }
      seen.add(input.providerTxnId);
      return Promise.resolve({
        result: 'CONFIRMED',
        transactionId: 1,
        orderCode: 'MS-261105-PKGA',
        overpaid: false,
      });
    }),
    confirmManually: jest.fn(),
    listTransactions: jest.fn(),
    resolveTransaction: jest.fn(),
  };
  const paymentConfig = { sepayApiKey: WEBHOOK_KEY as string | undefined };

  const server = () => app.getHttpServer();
  const as = (role?: RoleName) => (req: request.Test) =>
    role ? req.set('Authorization', `Bearer ${tokens[role]}`) : req;

  beforeAll(async () => {
    const fakeUsers: Record<number, { id: number; role: RoleName }> = {
      1: { id: 1, role: 'ADMIN' },
      2: { id: 2, role: 'STAFF' },
      3: { id: 3, role: 'CUSTOMER' },
    };
    const usersService = {
      findForAuth: (id: number) =>
        Promise.resolve(
          fakeUsers[id] ? { ...fakeUsers[id], isActive: true } : null,
        ),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule, JwtModule.register({})],
      controllers: [SepayWebhookController, AdminPaymentsController],
      providers: [
        JwtStrategy,
        RolesGuard,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: PaymentsService, useValue: paymentsService },
        { provide: PaymentConfigService, useValue: paymentConfig },
        { provide: UsersService, useValue: usersService },
        {
          provide: ConfigService,
          useValue: { getOrThrow: () => ACCESS_SECRET },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    const jwt = moduleRef.get(JwtService);
    for (const [id, user] of Object.entries(fakeUsers)) {
      tokens[user.role] = jwt.sign(
        { sub: Number(id), role: user.role },
        { secret: ACCESS_SECRET },
      );
    }
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    seen.clear();
    paymentConfig.sepayApiKey = WEBHOOK_KEY;
    paymentsService.confirmManually.mockResolvedValue({ result: 'CONFIRMED' });
    paymentsService.listTransactions.mockResolvedValue([]);
    paymentsService.resolveTransaction.mockResolvedValue({
      id: 1,
      resolved: true,
    });
  });

  describe('POST /payments/webhook/sepay', () => {
    const post = (body: object = sepayBody) =>
      request(server()).post('/payments/webhook/sepay').send(body);

    it('không có header Authorization → 401, không xử lý', async () => {
      const res = await post();
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(paymentsService.confirmBankTransfer).not.toHaveBeenCalled();
    });

    it.each([
      ['Apikey sai-khoa'],
      ['Bearer ' + WEBHOOK_KEY],
      [WEBHOOK_KEY],
      ['Apikey '],
    ])('header "%s" → 401', async (header) => {
      const res = await post().set('Authorization', header);
      expect(res.status).toBe(401);
      expect(paymentsService.confirmBankTransfer).not.toHaveBeenCalled();
    });

    it('JWT của người dùng KHÔNG thay được khóa webhook', async () => {
      const res = await post().set('Authorization', `Bearer ${tokens.ADMIN}`);
      expect(res.status).toBe(401);
    });

    it('đúng khóa → 200 { success: true }, chuyển đúng id, số tiền, nội dung, payload gốc', async () => {
      const res = await post().set('Authorization', `Apikey ${WEBHOOK_KEY}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        data: { processed: true, result: 'CONFIRMED' },
      });
      expect(paymentsService.confirmBankTransfer).toHaveBeenCalledTimes(1);
      expect(paymentsService.confirmBankTransfer).toHaveBeenCalledWith({
        source: 'SEPAY',
        providerTxnId: '92704',
        amount: 350000,
        content: 'MS261105PKGA',
        rawPayload: sepayBody,
      });
    });

    it('gửi trùng cùng id → vẫn 200, lõi trả DUPLICATE (không xử lý hai lần)', async () => {
      const key = `Apikey ${WEBHOOK_KEY}`;
      const first = await post().set('Authorization', key);
      const second = await post().set('Authorization', key);
      expect(first.body.data.result).toBe('CONFIRMED');
      expect(second.status).toBe(200);
      expect(second.body).toEqual({
        success: true,
        data: { processed: true, result: 'DUPLICATE' },
      });
    });

    it('tiền ra (transferType out) → 200, không gọi lõi', async () => {
      const res = await post({ ...sepayBody, transferType: 'out' }).set(
        'Authorization',
        `Apikey ${WEBHOOK_KEY}`,
      );
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: { processed: false } });
      expect(paymentsService.confirmBankTransfer).not.toHaveBeenCalled();
    });

    it('payload sai (thiếu số tiền) → 400 WEBHOOK_PAYLOAD_INVALID', async () => {
      const rest: Record<string, unknown> = { ...sepayBody };
      delete rest.transferAmount;
      const res = await post(rest).set(
        'Authorization',
        `Apikey ${WEBHOOK_KEY}`,
      );
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('WEBHOOK_PAYLOAD_INVALID');
      expect(paymentsService.confirmBankTransfer).not.toHaveBeenCalled();
    });

    it('chấp nhận trường lạ trong payload (không bị forbidNonWhitelisted chặn)', async () => {
      const res = await post({ ...sepayBody, truongMoi: 'x' }).set(
        'Authorization',
        `Apikey ${WEBHOOK_KEY}`,
      );
      expect(res.status).toBe(200);
    });

    it('chưa cấu hình khóa → webhook tắt hẳn: 404 dù gửi đúng định dạng', async () => {
      paymentConfig.sepayApiKey = undefined;
      const res = await post().set('Authorization', `Apikey ${WEBHOOK_KEY}`);
      expect(res.status).toBe(404);
      expect(paymentsService.confirmBankTransfer).not.toHaveBeenCalled();
    });

    it('lỗi nội bộ khi xử lý → 500 chung chung (để SePay gửi lại), không lộ chi tiết', async () => {
      paymentsService.confirmBankTransfer.mockRejectedValueOnce(
        new Error('SQL lỗi bảng payment_transactions'),
      );
      const res = await post().set('Authorization', `Apikey ${WEBHOOK_KEY}`);
      expect(res.status).toBe(500);
      expect(JSON.stringify(res.body)).not.toContain('payment_transactions');
    });
  });

  describe('route admin thanh toán: chỉ ADMIN', () => {
    const endpoints: [string, string, object | undefined][] = [
      ['post', '/admin/orders/10/confirm-payment', { note: 'FT24999' }],
      ['get', '/admin/payments/transactions', undefined],
      ['post', '/admin/payments/transactions/5/resolve', { note: 'đã hoàn' }],
    ];

    describe.each(endpoints)('%s %s', (method, path, body) => {
      const call = (role?: RoleName) => {
        const agent = request(server());
        const req = method === 'get' ? agent.get(path) : agent.post(path);
        if (body) void req.send(body);
        return as(role)(req);
      };

      it('không đăng nhập → 401', async () => {
        expect((await call()).status).toBe(401);
      });
      it('STAFF → 403', async () => {
        const res = await call('STAFF');
        expect(res.status).toBe(403);
      });
      it('CUSTOMER → 403', async () => {
        expect((await call('CUSTOMER')).status).toBe(403);
      });
      it('ADMIN → 200', async () => {
        expect((await call('ADMIN')).status).toBe(200);
      });
    });

    it('STAFF bị chặn trước khi chạm service', async () => {
      await as('STAFF')(
        request(server())
          .post('/admin/orders/10/confirm-payment')
          .send({ note: 'x' }),
      );
      expect(paymentsService.confirmManually).not.toHaveBeenCalled();
    });

    it('confirm-payment: thiếu ghi chú → 400 tiếng Việt; id sai → 400', async () => {
      const missing = await as('ADMIN')(
        request(server()).post('/admin/orders/10/confirm-payment').send({}),
      );
      expect(missing.status).toBe(400);
      expect(missing.body.errors[0]).toMatchObject({ field: 'note' });
      const blank = await as('ADMIN')(
        request(server())
          .post('/admin/orders/10/confirm-payment')
          .send({ note: '   ' }),
      );
      expect(blank.status).toBe(400);
      const badId = await as('ADMIN')(
        request(server())
          .post('/admin/orders/abc/confirm-payment')
          .send({ note: 'x' }),
      );
      expect(badId.status).toBe(400);
      expect(paymentsService.confirmManually).not.toHaveBeenCalled();
    });

    it('confirm-payment chuyển đúng id, ghi chú, transactionId và người xác nhận (từ token)', async () => {
      await as('ADMIN')(
        request(server())
          .post('/admin/orders/10/confirm-payment')
          .send({ note: ' FT24999 ', transactionId: 5 }),
      );
      expect(paymentsService.confirmManually).toHaveBeenCalledWith(
        10,
        { note: 'FT24999', transactionId: 5 },
        expect.objectContaining({ id: 1, role: 'ADMIN' }),
      );
    });

    it('danh sách: review mặc định pending, giá trị sai → 400', async () => {
      await as('ADMIN')(request(server()).get('/admin/payments/transactions'));
      expect(paymentsService.listTransactions).toHaveBeenCalledWith(
        expect.objectContaining({ review: 'pending', page: 1, limit: 10 }),
      );
      const bad = await as('ADMIN')(
        request(server()).get('/admin/payments/transactions?review=zzz'),
      );
      expect(bad.status).toBe(400);
    });

    it('resolve: thiếu ghi chú → 400', async () => {
      const res = await as('ADMIN')(
        request(server())
          .post('/admin/payments/transactions/5/resolve')
          .send({}),
      );
      expect(res.status).toBe(400);
    });
  });
});
