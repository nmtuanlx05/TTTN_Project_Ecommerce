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
import { Paginated } from '../src/common/paginated';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { UPLOAD_CONFIG } from '../src/uploads/upload.config';
import { AvatarUrlPipe } from '../src/users/avatar-url.pipe';
import { UsersController } from '../src/users/users.controller';
import { UsersService } from '../src/users/users.service';

// @nestjs/config chỉ có bản ESM nên Jest không nạp được; spec mock lại. Prisma cũng mock vì dùng service giả.
jest.mock('@nestjs/config', () => ({ ConfigService: class {} }));
jest.mock('../src/prisma/prisma.service', () => ({ PrismaService: class {} }));

const ACCESS_SECRET = 'test-access-secret';
const PUBLIC_URL = 'http://localhost:3000';
type RoleName = 'ADMIN' | 'STAFF' | 'CUSTOMER';
type Method = 'get' | 'post' | 'patch';

// JwtStrategy, JwtAuthGuard, RolesGuard, ValidationPipe là bản thật; UsersService giả (không DB).
// Chỉ kiểm phân quyền (401/403) của nhóm /users; logic truy vấn không được kiểm ở đây.
describe('Users API: phân quyền (e2e, service giả)', () => {
  let app: INestApplication<App>;
  const tokens = {} as Record<RoleName, string>;
  const ids: Record<RoleName, number> = { ADMIN: 1, STAFF: 2, CUSTOMER: 3 };

  const usersService = {
    findForAuth: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    updateAvatar: jest.fn(),
  };

  const call = (
    role: RoleName | undefined,
    method: Method,
    path: string,
    body?: object,
  ) => {
    const req = request(app.getHttpServer())[method](path);
    return (role ? req.set('Authorization', `Bearer ${tokens[role]}`) : req)
      .send(body)
      .then((res) => res);
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule, JwtModule.register({})],
      controllers: [UsersController],
      providers: [
        JwtStrategy,
        RolesGuard,
        AvatarUrlPipe,
        // Giống AppModule: JwtAuthGuard bật toàn cục
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: UsersService, useValue: usersService },
        {
          provide: ConfigService,
          useValue: { getOrThrow: () => ACCESS_SECRET },
        },
        { provide: UPLOAD_CONFIG, useValue: { publicUrl: PUBLIC_URL } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    const jwt = moduleRef.get(JwtService);
    for (const role of Object.keys(ids) as RoleName[]) {
      tokens[role] = jwt.sign(
        { sub: ids[role], role },
        { secret: ACCESS_SECRET },
      );
    }
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    usersService.findForAuth.mockImplementation((id: number) => {
      const role = (Object.keys(ids) as RoleName[]).find((r) => ids[r] === id);
      return Promise.resolve(role ? { id, role, isActive: true } : null);
    });
    usersService.create.mockResolvedValue({ id: 10 });
    usersService.findAll.mockResolvedValue(
      new Paginated([], { page: 1, limit: 10, total: 0 }),
    );
    usersService.findOne.mockResolvedValue({ id: 5 });
    usersService.update.mockResolvedValue({ id: 5 });
    usersService.updateStatus.mockResolvedValue({ id: 5 });
    usersService.updateAvatar.mockResolvedValue({ id: 1 });
  });

  const cases: {
    name: string;
    method: Method;
    path: string;
    body?: object;
    allowed: RoleName[];
    ok: number;
    service: keyof typeof usersService;
  }[] = [
    {
      name: 'GET /users',
      method: 'get',
      path: '/users',
      allowed: ['ADMIN'],
      ok: 200,
      service: 'findAll',
    },
    {
      name: 'GET /users/:id',
      method: 'get',
      path: '/users/5',
      allowed: ['ADMIN'],
      ok: 200,
      service: 'findOne',
    },
    {
      name: 'POST /users',
      method: 'post',
      path: '/users',
      body: { email: 'a@gmail.com', password: '123456', name: 'A' },
      allowed: ['ADMIN'],
      ok: 201,
      service: 'create',
    },
    {
      name: 'PATCH /users/:id',
      method: 'patch',
      path: '/users/5',
      body: { name: 'Tên mới' },
      allowed: ['ADMIN'],
      ok: 200,
      service: 'update',
    },
    {
      name: 'PATCH /users/:id/status',
      method: 'patch',
      path: '/users/5/status',
      body: { isActive: false },
      allowed: ['ADMIN'],
      ok: 200,
      service: 'updateStatus',
    },
    {
      name: 'PATCH /users/me/avatar',
      method: 'patch',
      path: '/users/me/avatar',
      body: { avatarUrl: null },
      allowed: ['ADMIN', 'STAFF', 'CUSTOMER'],
      ok: 200,
      service: 'updateAvatar',
    },
  ];

  describe.each(cases)('$name', (c) => {
    it('không token → 401, không gọi service', async () => {
      const res = await call(undefined, c.method, c.path, c.body);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(usersService[c.service]).not.toHaveBeenCalled();
    });

    it.each(['ADMIN', 'STAFF', 'CUSTOMER'] as RoleName[])(
      '%s',
      async (role) => {
        const res = await call(role, c.method, c.path, c.body);

        if (c.allowed.includes(role)) {
          expect(res.status).toBe(c.ok);
          expect(usersService[c.service]).toHaveBeenCalledTimes(1);
        } else {
          expect(res.status).toBe(403);
          expect(res.body).toEqual({
            success: false,
            statusCode: 403,
            message: 'Bạn không có quyền thực hiện thao tác này',
          });
          expect(usersService[c.service]).not.toHaveBeenCalled();
        }
      },
    );
  });

  it('CUSTOMER gửi role ADMIN vào POST /users → 403, không tạo được tài khoản', async () => {
    const res = await call('CUSTOMER', 'post', '/users', {
      email: 'hacker@gmail.com',
      password: '123456',
      name: 'Hacker',
      role: 'ADMIN',
    });

    expect(res.status).toBe(403);
    expect(usersService.create).not.toHaveBeenCalled();
  });

  it('CUSTOMER tự nâng role qua PATCH /users/:id → 403', async () => {
    const res = await call('CUSTOMER', 'patch', '/users/3', { role: 'ADMIN' });

    expect(res.status).toBe(403);
    expect(usersService.update).not.toHaveBeenCalled();
  });

  it('PATCH /users/:id và /status truyền id người thực hiện (từ token) xuống service', async () => {
    await call('ADMIN', 'patch', '/users/5', { role: 'STAFF' });
    await call('ADMIN', 'patch', '/users/5/status', { isActive: false });

    expect(usersService.update).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ role: 'STAFF' }),
      ids.ADMIN,
    );
    expect(usersService.updateStatus).toHaveBeenCalledWith(
      5,
      { isActive: false },
      ids.ADMIN,
    );
  });

  it('/users/me/avatar không bị nhầm với PATCH /users/:id (STAFF vẫn 200)', async () => {
    const res = await call('STAFF', 'patch', '/users/me/avatar', {
      avatarUrl: null,
    });

    expect(res.status).toBe(200);
    expect(usersService.updateAvatar).toHaveBeenCalledWith(ids.STAFF, {
      avatarUrl: null,
    });
    expect(usersService.update).not.toHaveBeenCalled();
  });

  it('ADMIN bị 403 từ service khi tự hạ role → trả đúng dạng lỗi chung', async () => {
    const { ForbiddenException } = await import('@nestjs/common');
    usersService.update.mockRejectedValue(
      new ForbiddenException(
        'Bạn không thể tự thay đổi vai trò của chính mình',
      ),
    );

    const res = await call('ADMIN', 'patch', '/users/1', { role: 'STAFF' });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      success: false,
      statusCode: 403,
      message: 'Bạn không thể tự thay đổi vai trò của chính mình',
    });
  });
});
