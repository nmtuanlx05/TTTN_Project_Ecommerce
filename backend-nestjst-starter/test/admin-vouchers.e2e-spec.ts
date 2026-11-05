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
import { conflict } from '../src/common/errors/coded-errors';
import { Paginated } from '../src/common/paginated';
import { UsersService } from '../src/users/users.service';
import { AdminVouchersController } from '../src/vouchers/admin-vouchers.controller';
import { AdminVouchersService } from '../src/vouchers/admin-vouchers.service';

jest.mock('@nestjs/config', () => ({ ConfigService: class {} }));
jest.mock('../src/prisma/prisma.service', () => ({ PrismaService: class {} }));

const SECRET = 'test-access-secret';
type RoleName = 'ADMIN' | 'STAFF' | 'CUSTOMER';

const voucher = { id: 1, code: 'SALE10', status: 'ACTIVE' };
const validBody = {
  code: 'zz-new10',
  discountType: 'PERCENT',
  discountValue: 10,
  startsAtDate: '2026-12-01',
  expiresAtDate: '2026-12-31',
};

// Service giả (không DB): kiểm guard 401/403, validate DTO và định dạng response.
describe('/admin/vouchers (e2e, service giả)', () => {
  let app: INestApplication<App>;
  const tokens = {} as Record<RoleName, string>;
  const service = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
  };
  const call = (
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
    role?: RoleName,
  ) => {
    const req = request(app.getHttpServer())[method](path);
    return role ? req.set('Authorization', `Bearer ${tokens[role]}`) : req;
  };

  beforeAll(async () => {
    const users: Record<number, { id: number; role: RoleName }> = {
      1: { id: 1, role: 'ADMIN' },
      2: { id: 2, role: 'STAFF' },
      3: { id: 3, role: 'CUSTOMER' },
    };
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule, JwtModule.register({})],
      controllers: [AdminVouchersController],
      providers: [
        JwtStrategy,
        RolesGuard,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: AdminVouchersService, useValue: service },
        {
          provide: UsersService,
          useValue: {
            findForAuth: (id: number) =>
              Promise.resolve(
                users[id] ? { ...users[id], isActive: true } : null,
              ),
          },
        },
        { provide: ConfigService, useValue: { getOrThrow: () => SECRET } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    const jwt = moduleRef.get(JwtService);
    for (const [id, u] of Object.entries(users)) {
      tokens[u.role] = jwt.sign(
        { sub: Number(id), role: u.role },
        { secret: SECRET },
      );
    }
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service.findAll.mockResolvedValue(
      new Paginated([voucher], { page: 1, limit: 10, total: 1 }),
    );
    service.findOne.mockResolvedValue(voucher);
    service.create.mockResolvedValue(voucher);
    service.update.mockResolvedValue(voucher);
    service.updateStatus.mockResolvedValue(voucher);
  });

  const routes: [string, 'get' | 'post' | 'patch', string][] = [
    ['danh sách', 'get', '/admin/vouchers'],
    ['chi tiết', 'get', '/admin/vouchers/1'],
    ['tạo', 'post', '/admin/vouchers'],
    ['sửa', 'patch', '/admin/vouchers/1'],
    ['bật/tắt', 'patch', '/admin/vouchers/1/status'],
  ];

  it.each(routes)('%s: chưa đăng nhập → 401', async (_n, method, path) => {
    await call(method, path).send({}).expect(401);
  });

  it.each(routes)(
    '%s: STAFF → 403, CUSTOMER → 403',
    async (_n, method, path) => {
      for (const role of ['STAFF', 'CUSTOMER'] as RoleName[]) {
        await call(method, path, role).send(validBody).expect(403);
      }
      for (const fn of Object.values(service))
        expect(fn).not.toHaveBeenCalled();
    },
  );

  it('ADMIN GET danh sách → 200 có meta; truyền query xuống service', async () => {
    const res = await call(
      'get',
      '/admin/vouchers?page=2&limit=5&q=sale&status=ACTIVE&sortBy=code&order=asc',
      'ADMIN',
    ).expect(200);
    expect(res.body).toEqual({
      success: true,
      data: [voucher],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    expect(service.findAll.mock.calls[0][0]).toMatchObject({
      page: 2,
      limit: 5,
      q: 'sale',
      status: 'ACTIVE',
      sortBy: 'code',
      order: 'asc',
    });
  });

  it.each([
    ['limit > 100', 'limit=101'],
    ['status lạ', 'status=FOO'],
    ['sortBy lạ', 'sortBy=status'],
    ['page = 0', 'page=0'],
  ])('GET danh sách với %s → 400', async (_n, qs) => {
    const res = await call('get', `/admin/vouchers?${qs}`, 'ADMIN').expect(400);
    expect(res.body.message).toBe('Dữ liệu không hợp lệ');
    expect(service.findAll).not.toHaveBeenCalled();
  });

  it('GET :id → 200; id không hợp lệ → 400', async () => {
    const res = await call('get', '/admin/vouchers/1', 'ADMIN').expect(200);
    expect(res.body).toEqual({ success: true, data: voucher });
    const bad = await call('get', '/admin/vouchers/abc', 'ADMIN').expect(400);
    expect(bad.body.message).toBe('ID không hợp lệ');
  });

  it('POST hợp lệ → 201 và gọi service', async () => {
    const res = await call('post', '/admin/vouchers', 'ADMIN')
      .send(validBody)
      .expect(201);
    expect(res.body).toEqual({ success: true, data: voucher });
    expect(service.create).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['thiếu code', { ...validBody, code: undefined }],
    ['ngày sai định dạng', { ...validBody, expiresAtDate: '31/12/2026' }],
    [
      'discountValue không phải số nguyên',
      { ...validBody, discountValue: 1.5 },
    ],
    ['discountType lạ', { ...validBody, discountType: 'BOGO' }],
    ['code quá 30 ký tự', { ...validBody, code: 'A'.repeat(31) }],
    [
      'description quá 191 ký tự',
      { ...validBody, description: 'x'.repeat(192) },
    ],
    ['trường thừa (isActive)', { ...validBody, isActive: true }],
  ])('POST %s → 400 kèm errors theo trường', async (_n, body) => {
    const res = await call('post', '/admin/vouchers', 'ADMIN')
      .send(body)
      .expect(400);
    expect(res.body).toMatchObject({
      success: false,
      statusCode: 400,
      message: 'Dữ liệu không hợp lệ',
    });
    expect(res.body.errors.length).toBeGreaterThan(0);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('POST mã trùng → 409 kèm code VOUCHER_CODE_EXISTS', async () => {
    service.create.mockRejectedValue(
      conflict('VOUCHER_CODE_EXISTS', 'Mã voucher đã tồn tại'),
    );
    const res = await call('post', '/admin/vouchers', 'ADMIN')
      .send(validBody)
      .expect(409);
    expect(res.body).toMatchObject({
      success: false,
      statusCode: 409,
      code: 'VOUCHER_CODE_EXISTS',
    });
  });

  it('PATCH :id → 200; PATCH không nhận isActive (dùng /status) → 400', async () => {
    await call('patch', '/admin/vouchers/1', 'ADMIN')
      .send({ description: 'Mới' })
      .expect(200);
    expect(service.update.mock.calls[0][0]).toBe(1);
    await call('patch', '/admin/vouchers/1', 'ADMIN')
      .send({ isActive: false })
      .expect(400);
  });

  it('PATCH :id/status → 200; thiếu hoặc sai kiểu isActive → 400', async () => {
    await call('patch', '/admin/vouchers/1/status', 'ADMIN')
      .send({ isActive: false })
      .expect(200);
    expect(service.updateStatus.mock.calls[0][1]).toEqual({ isActive: false });
    await call('patch', '/admin/vouchers/1/status', 'ADMIN')
      .send({ isActive: 'no' })
      .expect(400);
  });

  it('không có DELETE: voucher không bao giờ xóa cứng → 404', async () => {
    await call('delete', '/admin/vouchers/1', 'ADMIN').expect(404);
  });
});
