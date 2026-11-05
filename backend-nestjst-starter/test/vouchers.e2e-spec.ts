// res.body của supertest có kiểu any; test chỉ đọc để so sánh nên tắt các rule unsafe-* cho file này.

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
import { UsersService } from '../src/users/users.service';
import { VouchersController } from '../src/vouchers/vouchers.controller';
import { VouchersService } from '../src/vouchers/vouchers.service';

jest.mock('@nestjs/config', () => ({ ConfigService: class {} }));
jest.mock('../src/prisma/prisma.service', () => ({ PrismaService: class {} }));

const SECRET = 'test-access-secret';
type RoleName = 'ADMIN' | 'STAFF' | 'CUSTOMER';
const item = {
  code: 'SALE10',
  description: 'Giảm 10%',
  discountType: 'PERCENT',
  discountValue: 10,
  maxDiscount: 50000,
  minOrderValue: 0,
  expiresAt: '2027-06-30T16:59:59.000Z',
};

// Service giả (không DB): kiểm guard 401/403 và định dạng response. Điều kiện lọc nằm ở src/vouchers/*.spec.ts.
describe('GET /vouchers/available (e2e, service giả)', () => {
  let app: INestApplication<App>;
  const tokens = {} as Record<RoleName, string>;
  const vouchersService = { findAvailable: jest.fn() };
  const get = (role?: RoleName) => {
    const req = request(app.getHttpServer()).get('/vouchers/available');
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
      controllers: [VouchersController],
      providers: [
        JwtStrategy,
        RolesGuard,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: VouchersService, useValue: vouchersService },
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
    vouchersService.findAvailable.mockResolvedValue([item]);
  });

  it('chưa đăng nhập → 401', async () => {
    await get().expect(401);
    expect(vouchersService.findAvailable).not.toHaveBeenCalled();
  });

  it.each<RoleName>(['ADMIN', 'STAFF'])(
    '%s → 403 với thông báo riêng',
    async (role) => {
      const res = await get(role).expect(403);
      expect(res.body).toEqual({
        success: false,
        statusCode: 403,
        message: 'Tài khoản quản trị không dùng để mua hàng',
      });
      expect(vouchersService.findAvailable).not.toHaveBeenCalled();
    },
  );

  it('CUSTOMER → 200, bọc { success, data }, không có trường nội bộ', async () => {
    const res = await get('CUSTOMER').expect(200);
    expect(res.body).toEqual({ success: true, data: [item] });
    expect(JSON.stringify(res.body)).not.toMatch(/usageLimit|usedCount|"id"/);
  });
});
