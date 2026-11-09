// res.body của supertest có kiểu any; test chỉ đọc để so sánh nên tắt các rule unsafe-* cho file này.
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
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
import {
  badRequest,
  conflict,
  notFound,
} from '../src/common/errors/coded-errors';
import { AdminOrdersController } from '../src/orders/admin-orders.controller';
import { AdminOrdersService } from '../src/orders/admin-orders.service';
import { OrdersController } from '../src/orders/orders.controller';
import { OrdersService } from '../src/orders/orders.service';
import { UsersService } from '../src/users/users.service';

jest.mock('@nestjs/config', () => ({ ConfigService: class {} }));
jest.mock('../src/prisma/prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../src/inventory/inventory.service', () => ({
  InventoryService: class {},
}));

const ACCESS_SECRET = 'test-access-secret';
type RoleName = 'ADMIN' | 'STAFF' | 'CUSTOMER';
const ADMIN_MESSAGE = 'Tài khoản quản trị không dùng để mua hàng';

const validBody = {
  receiverName: 'Nguyễn Văn A',
  phone: '0912345678',
  provinceCode: '79',
  districtCode: '760',
  wardCode: '26734',
  addressLine: '12 Lê Lợi',
  paymentMethod: 'COD',
};

// Service giả (không DB, không ghi vào ecommerce_dev): kiểm phần nối ở tầng toàn cục (guard 401/403, ValidationPipe,
// response/lỗi chuẩn, mã lỗi code) và việc controller lấy userId từ token. Logic đơn nằm ở src/orders/*.spec.ts.
describe('Orders API (e2e, service giả)', () => {
  let app: INestApplication<App>;
  const tokens = {} as Record<RoleName, string>;

  const ordersService = {
    preview: jest.fn(),
    create: jest.fn(),
    findMine: jest.fn(),
    findMineByCode: jest.fn(),
    summaryMine: jest.fn(),
    reorderMine: jest.fn(),
    cancelMine: jest.fn(),
    getPaymentInfo: jest.fn(),
  };
  const adminOrdersService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    updateStatus: jest.fn(),
  };

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
      controllers: [OrdersController, AdminOrdersController],
      providers: [
        JwtStrategy,
        RolesGuard,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: OrdersService, useValue: ordersService },
        { provide: AdminOrdersService, useValue: adminOrdersService },
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
    for (const fn of [
      ...Object.values(ordersService),
      ...Object.values(adminOrdersService),
    ]) {
      fn.mockResolvedValue({ ok: true });
    }
  });

  describe('phân quyền khách: /orders', () => {
    const customerEndpoints: [string, string, object | undefined][] = [
      ['post', '/orders/preview', {}],
      ['post', '/orders', validBody],
      ['get', '/orders', undefined],
      ['get', '/orders/summary', undefined],
      ['post', '/orders/MS-261105-ABCD/reorder', {}],
      ['get', '/orders/MS-261105-ABCD', undefined],
      ['get', '/orders/MS-261105-ABCD/payment', undefined],
      ['post', '/orders/MS-261105-ABCD/cancel', {}],
    ];

    describe.each(customerEndpoints)('%s %s', (method, path, body) => {
      const call = (role?: RoleName) => {
        const req = request(server())[method as 'get' | 'post'](path);
        return as(role)(body ? req.send(body) : req);
      };

      it('chưa đăng nhập → 401', async () => {
        await call().expect(401);
      });

      it.each<RoleName>(['ADMIN', 'STAFF'])(
        '%s → 403 với thông báo riêng',
        async (role) => {
          const res = await call(role).expect(403);
          expect(res.body).toEqual({
            success: false,
            statusCode: 403,
            message: ADMIN_MESSAGE,
          });
        },
      );

      it('CUSTOMER được qua, response bọc { success, data }', async () => {
        const res = await call('CUSTOMER').expect(
          method === 'post' ? 201 : 200,
        );
        expect(res.body).toEqual({ success: true, data: { ok: true } });
      });
    });
  });

  describe('phân quyền quản trị: /admin/orders', () => {
    const adminEndpoints: [string, string, object | undefined][] = [
      ['get', '/admin/orders', undefined],
      ['get', '/admin/orders/5', undefined],
      ['patch', '/admin/orders/5/status', { status: 'CONFIRMED' }],
    ];

    describe.each(adminEndpoints)('%s %s', (method, path, body) => {
      const call = (role?: RoleName) => {
        const req = request(server())[method as 'get' | 'patch'](path);
        return as(role)(body ? req.send(body) : req);
      };

      it('chưa đăng nhập → 401', async () => {
        await call().expect(401);
      });

      it('CUSTOMER → 403 (khách không xử lý đơn)', async () => {
        const res = await call('CUSTOMER').expect(403);
        expect(res.body.success).toBe(false);
        expect(adminOrdersService.findAll).not.toHaveBeenCalled();
        expect(adminOrdersService.updateStatus).not.toHaveBeenCalled();
      });

      it.each<RoleName>(['ADMIN', 'STAFF'])('%s được qua', async (role) => {
        await call(role).expect(200);
      });
    });
  });

  describe('POST /orders', () => {
    const post = (body: object, headers: Record<string, string> = {}) =>
      as('CUSTOMER')(request(server()).post('/orders')).set(headers).send(body);

    it('userId lấy từ token; header Idempotency-Key chuyển cho service', async () => {
      await post(validBody, { 'Idempotency-Key': 'checkout-key-0001' }).expect(
        201,
      );
      const [user, dto, key] = ordersService.create.mock.calls[0];
      expect(user.id).toBe(3);
      expect(dto).toMatchObject({
        receiverName: 'Nguyễn Văn A',
        phone: '0912345678',
        paymentMethod: 'COD',
      });
      expect(key).toBe('checkout-key-0001');
    });

    it('không gửi Idempotency-Key: vẫn chạy', async () => {
      await post(validBody).expect(201);
      expect(ordersService.create.mock.calls[0][2]).toBeUndefined();
    });

    it.each([
      'subtotal',
      'totalAmount',
      'shippingFee',
      'discountAmount',
      'items',
      'userId',
    ])(
      'client không được gửi %s (forbidNonWhitelisted) → 400',
      async (field) => {
        const res = await post({ ...validBody, [field]: 1 }).expect(400);
        expect(res.body.message).toBe('Dữ liệu không hợp lệ');
        expect(res.body.errors).toContainEqual({
          field,
          message: `Trường ${field} không được phép gửi lên`,
        });
        expect(ordersService.create).not.toHaveBeenCalled();
      },
    );

    it.each([
      '123',
      '0212345678',
      '091234567',
      '09123456789',
      '+84912345678',
      'abcdefghij',
      '0412345678',
    ])('số điện thoại sai %s → 400 PHONE_INVALID tiếng Việt', async (phone) => {
      const res = await post({ ...validBody, phone }).expect(400);
      expect(res.body.errors).toContainEqual({
        field: 'phone',
        message: 'Số điện thoại phải gồm 10 số, đầu số 03, 05, 07, 08 hoặc 09',
        code: 'PHONE_INVALID',
      });
      expect(ordersService.create).not.toHaveBeenCalled();
    });

    it.each([
      '0312345678',
      '0512345678',
      '0712345678',
      '0812345678',
      '0912345678',
    ])('số điện thoại hợp lệ %s được qua', async (phone) => {
      await post({ ...validBody, phone }).expect(201);
    });

    it.each(['provinceCode', 'districtCode'])(
      'thiếu %s → 400 LOCATION_REQUIRED',
      async (field) => {
        const body: Record<string, unknown> = { ...validBody };
        delete body[field];
        const res = await post(body).expect(400);
        expect(res.body.errors).toContainEqual(
          expect.objectContaining({ field, code: 'LOCATION_REQUIRED' }),
        );
        expect(ordersService.create).not.toHaveBeenCalled();
      },
    );

    it('thiếu tên người nhận hoặc địa chỉ → 400 tiếng Việt', async () => {
      const res = await post({
        ...validBody,
        receiverName: '  ',
        addressLine: '',
      }).expect(400);
      expect(res.body.errors).toContainEqual({
        field: 'receiverName',
        message: 'Tên người nhận không được để trống',
      });
      expect(res.body.errors).toContainEqual({
        field: 'addressLine',
        message: 'Vui lòng nhập địa chỉ (số nhà, đường)',
      });
    });

    it('wardCode bỏ trống hoặc "" được đổi thành null (huyện không có phường/xã)', async () => {
      const body: Record<string, unknown> = { ...validBody, wardCode: '' };
      await post(body).expect(201);
      expect(ordersService.create.mock.calls[0][1].wardCode).toBeNull();
    });

    it('paymentMethod sai giá trị → 400', async () => {
      const res = await post({ ...validBody, paymentMethod: 'BITCOIN' }).expect(
        400,
      );
      expect(res.body.errors).toContainEqual({
        field: 'paymentMethod',
        message: 'Phương thức thanh toán phải là COD hoặc ONLINE',
      });
    });

    it('lỗi có code từ service đi qua bộ lọc: giữ code và errors', async () => {
      ordersService.create.mockRejectedValue(
        conflict(
          'CART_ITEMS_UNAVAILABLE',
          'Giỏ hàng có 1 sản phẩm không thể đặt',
          {
            errors: [
              {
                field: 'items.4',
                message: 'Áo (M, Đen) đã hết hàng, vui lòng xóa khỏi giỏ hàng',
              },
            ],
          },
        ),
      );
      const res = await post(validBody).expect(409);
      expect(res.body).toEqual({
        success: false,
        statusCode: 409,
        message: 'Giỏ hàng có 1 sản phẩm không thể đặt',
        code: 'CART_ITEMS_UNAVAILABLE',
        errors: [
          {
            field: 'items.4',
            message: 'Áo (M, Đen) đã hết hàng, vui lòng xóa khỏi giỏ hàng',
          },
        ],
      });
    });
  });

  describe('POST /orders/preview', () => {
    it('chỉ nhận voucherCode', async () => {
      await as('CUSTOMER')(request(server()).post('/orders/preview'))
        .send({ voucherCode: 'SALE10' })
        .expect(201);
      expect(ordersService.preview).toHaveBeenCalledWith(3, {
        voucherCode: 'SALE10',
      });

      const res = await as('CUSTOMER')(
        request(server()).post('/orders/preview'),
      )
        .send({ voucherCode: 'SALE10', totalAmount: 1 })
        .expect(400);
      expect(res.body.errors).toContainEqual({
        field: 'totalAmount',
        message: 'Trường totalAmount không được phép gửi lên',
      });
    });

    it('voucher sai trả mã máy đọc được', async () => {
      ordersService.preview.mockRejectedValue(
        badRequest('VOUCHER_EXPIRED', 'Mã giảm giá đã hết hạn'),
      );
      const res = await as('CUSTOMER')(
        request(server()).post('/orders/preview'),
      )
        .send({ voucherCode: 'OLD' })
        .expect(400);
      expect(res.body).toEqual({
        success: false,
        statusCode: 400,
        message: 'Mã giảm giá đã hết hạn',
        code: 'VOUCHER_EXPIRED',
      });
    });
  });

  describe('GET /orders và hủy', () => {
    it('lọc status/phân trang qua query, userId từ token', async () => {
      await as('CUSTOMER')(
        request(server()).get('/orders?status=PENDING&page=2&limit=5'),
      ).expect(200);
      expect(ordersService.findMine).toHaveBeenCalledWith(
        3,
        expect.objectContaining({ status: ['PENDING'], page: 2, limit: 5 }),
      );
    });

    it('status nhiều giá trị phân tách bằng dấu phẩy và q chuyển cho service', async () => {
      await as('CUSTOMER')(
        request(server()).get('/orders?status=PENDING,CONFIRMED&q=%20ms-26%20'),
      ).expect(200);
      expect(ordersService.findMine).toHaveBeenCalledWith(
        3,
        expect.objectContaining({
          status: ['PENDING', 'CONFIRMED'],
          q: 'ms-26',
        }),
      );
    });

    it('GET /orders/summary không bị hiểu là mã đơn; userId từ token', async () => {
      await as('CUSTOMER')(request(server()).get('/orders/summary')).expect(
        200,
      );
      expect(ordersService.summaryMine).toHaveBeenCalledWith(3);
      expect(ordersService.findMineByCode).not.toHaveBeenCalled();
    });

    it('POST /orders/:code/reorder: mã đơn và userId từ token; không có đơn thêm được → 409 có code', async () => {
      ordersService.reorderMine.mockRejectedValue(
        conflict('REORDER_NOTHING_ADDED', 'Không có sản phẩm nào thêm được'),
      );
      const res = await as('CUSTOMER')(
        request(server()).post('/orders/MS-261105-ABCD/reorder'),
      ).expect(409);
      expect(res.body.code).toBe('REORDER_NOTHING_ADDED');
      expect(ordersService.reorderMine).toHaveBeenCalledWith(
        3,
        'MS-261105-ABCD',
      );
    });

    it.each([
      'status=XYZ',
      'status=PENDING,NOPE',
      'status=CONFIRMED,PACKING',
      'page=0',
      'limit=101',
      'sortBy=password',
      'order=up',
    ])('query sai %s → 400', async (q) => {
      await as('CUSTOMER')(request(server()).get(`/orders?${q}`)).expect(400);
      expect(ordersService.findMine).not.toHaveBeenCalled();
    });

    it('đơn của người khác → 404 có code', async () => {
      ordersService.findMineByCode.mockRejectedValue(
        notFound('ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng'),
      );
      const res = await as('CUSTOMER')(
        request(server()).get('/orders/MS-261105-ZZZZ'),
      ).expect(404);
      expect(res.body).toEqual({
        success: false,
        statusCode: 404,
        message: 'Không tìm thấy đơn hàng',
        code: 'ORDER_NOT_FOUND',
      });
      expect(ordersService.findMineByCode).toHaveBeenCalledWith(
        3,
        'MS-261105-ZZZZ',
      );
    });

    it('khách hủy đơn không còn PENDING → 409 (không phải 403) với code riêng', async () => {
      ordersService.cancelMine.mockRejectedValue(
        conflict(
          'ORDER_NOT_CANCELLABLE_BY_CUSTOMER',
          'Đơn hàng đã được xác nhận hoặc đang xử lý, không thể tự hủy. Vui lòng liên hệ cửa hàng',
        ),
      );
      const res = await as('CUSTOMER')(
        request(server()).post('/orders/MS-261105-ABCD/cancel'),
      )
        .send({})
        .expect(409);
      expect(res.body.code).toBe('ORDER_NOT_CANCELLABLE_BY_CUSTOMER');
    });

    it('lý do hủy quá dài → 400', async () => {
      await as('CUSTOMER')(
        request(server()).post('/orders/MS-261105-ABCD/cancel'),
      )
        .send({ reason: 'x'.repeat(501) })
        .expect(400);
    });
  });

  describe('admin', () => {
    it('lọc theo trạng thái, ngày, từ khóa; phân trang', async () => {
      await as('STAFF')(
        request(server()).get(
          '/admin/orders?status=CONFIRMED&from=2026-11-01&to=2026-11-05&q=0912&page=2&limit=20',
        ),
      ).expect(200);
      expect(adminOrdersService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'CONFIRMED',
          from: '2026-11-01',
          to: '2026-11-05',
          q: '0912',
          page: 2,
          limit: 20,
        }),
      );
    });

    it.each([
      'from=05/11/2026',
      'to=2026-1-5',
      'status=NOPE',
      'status=PACKING',
    ])('query sai %s → 400', async (q) => {
      await as('ADMIN')(request(server()).get(`/admin/orders?${q}`)).expect(
        400,
      );
    });

    it('PATCH status: gửi status + reason, actor là user từ token', async () => {
      await as('STAFF')(request(server()).patch('/admin/orders/5/status'))
        .send({ status: 'CANCELLED', reason: 'Hết hàng thực tế' })
        .expect(200);
      expect(adminOrdersService.updateStatus).toHaveBeenCalledWith(
        5,
        { status: 'CANCELLED', reason: 'Hết hàng thực tế' },
        expect.objectContaining({ id: 2, role: 'STAFF' }),
      );
    });

    it('status không hợp lệ hoặc trường thừa → 400; id sai → 400 "ID không hợp lệ"', async () => {
      await as('ADMIN')(request(server()).patch('/admin/orders/5/status'))
        .send({ status: 'DONE' })
        .expect(400);
      await as('ADMIN')(request(server()).patch('/admin/orders/5/status'))
        .send({ status: 'CONFIRMED', totalAmount: 0 })
        .expect(400);
      const res = await as('ADMIN')(
        request(server()).patch('/admin/orders/abc/status'),
      )
        .send({ status: 'CONFIRMED' })
        .expect(400);
      expect(res.body.message).toBe('ID không hợp lệ');
    });

    it('chuyển sai bước → 409 ORDER_INVALID_TRANSITION qua bộ lọc', async () => {
      adminOrdersService.updateStatus.mockRejectedValue(
        conflict(
          'ORDER_INVALID_TRANSITION',
          'Không thể chuyển đơn từ "Chờ xác nhận" sang "Đang giao"',
        ),
      );
      const res = await as('ADMIN')(
        request(server()).patch('/admin/orders/5/status'),
      )
        .send({ status: 'SHIPPING' })
        .expect(409);
      expect(res.body.code).toBe('ORDER_INVALID_TRANSITION');
    });
  });
});
