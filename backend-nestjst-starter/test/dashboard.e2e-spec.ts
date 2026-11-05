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
import { DashboardController } from '../src/dashboard/dashboard.controller';
import { DashboardService } from '../src/dashboard/dashboard.service';
import { UsersService } from '../src/users/users.service';

// @nestjs/config chỉ có bản ESM nên Jest không nạp được; spec mock lại. Prisma cũng mock vì dùng service giả.
jest.mock('@nestjs/config', () => ({ ConfigService: class {} }));
jest.mock('../src/prisma/prisma.service', () => ({ PrismaService: class {} }));

const ACCESS_SECRET = 'test-access-secret';
type RoleName = 'ADMIN' | 'STAFF' | 'CUSTOMER';

// DashboardService giả (không DB) để kiểm tra phần nối ở tầng toàn cục: JwtAuthGuard + RolesGuard (401/403),
// ValidationPipe, ResponseInterceptor, AllExceptionsFilter. Luật khoảng ngày (from > to, 366 ngày...) nằm ở
// dashboard.range.spec.ts / dashboard.service.spec.ts. SQL thật KHÔNG được kiểm ở đây (xem docs/api/dashboard.md).
describe('Dashboard API (e2e, service giả)', () => {
  let app: INestApplication<App>;
  const tokens = {} as Record<RoleName, string>;
  const dashboardService = { getDashboard: jest.fn() };

  const server = () => app.getHttpServer();
  const as = (role?: RoleName) => (req: request.Test) =>
    role ? req.set('Authorization', `Bearer ${tokens[role]}`) : req;

  const fieldsOf = (res: request.Response) =>
    (res.body.errors as { field: string }[]).map((e) => e.field);

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
      controllers: [DashboardController],
      providers: [
        JwtStrategy,
        RolesGuard,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: DashboardService, useValue: dashboardService },
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
    dashboardService.getDashboard.mockResolvedValue({
      range: { from: '2026-11-05', to: '2026-11-05', days: 1 },
      current: { revenue: 847000 },
    });
  });

  const url = '/admin/dashboard?from=2026-11-05&to=2026-11-05';

  describe('phân quyền', () => {
    it('chưa đăng nhập → 401', async () => {
      await request(server()).get(url).expect(401);
      expect(dashboardService.getDashboard).not.toHaveBeenCalled();
    });

    it.each(['STAFF', 'CUSTOMER'] as const)('%s → 403', async (role) => {
      await as(role)(request(server()).get(url)).expect(403);
      expect(dashboardService.getDashboard).not.toHaveBeenCalled();
    });

    it('ADMIN → 200, bọc { success, data }', async () => {
      const res = await as('ADMIN')(request(server()).get(url)).expect(200);
      expect(res.body).toEqual({
        success: true,
        data: {
          range: { from: '2026-11-05', to: '2026-11-05', days: 1 },
          current: { revenue: 847000 },
        },
      });
      expect(dashboardService.getDashboard).toHaveBeenCalledWith({
        from: '2026-11-05',
        to: '2026-11-05',
      });
    });
  });

  describe('validate query', () => {
    it.each([
      ['thiếu from', '/admin/dashboard?to=2026-11-05', 'from'],
      ['thiếu to', '/admin/dashboard?from=2026-11-05', 'to'],
      [
        'from sai định dạng',
        '/admin/dashboard?from=05-11-2026&to=2026-11-05',
        'from',
      ],
      [
        'to sai định dạng',
        '/admin/dashboard?from=2026-11-05&to=2026-11-5',
        'to',
      ],
    ])('%s → 400 kèm lỗi theo trường', async (_name, path, field) => {
      const res = await as('ADMIN')(request(server()).get(path)).expect(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Dữ liệu không hợp lệ');
      expect(fieldsOf(res)).toContain(field);
      expect(dashboardService.getDashboard).not.toHaveBeenCalled();
    });

    it('tham số lạ bị từ chối (forbidNonWhitelisted)', async () => {
      const res = await as('ADMIN')(
        request(server()).get(`${url}&limit=5`),
      ).expect(400);
      expect(fieldsOf(res)).toContain('limit');
    });
  });
});
