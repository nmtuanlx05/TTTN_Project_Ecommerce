// res.body của supertest có kiểu any; test chỉ đọc để so sánh nên tắt các rule unsafe-* cho file này.
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from '../src/app.setup';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { JwtRefreshGuard } from '../src/auth/guards/jwt-refresh.guard';
import { LocalAuthGuard } from '../src/auth/guards/local-auth.guard';
import { JwtRefreshStrategy } from '../src/auth/strategies/jwt-refresh.strategy';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { LocalStrategy } from '../src/auth/strategies/local.strategy';
import { PrismaService } from '../src/prisma/prisma.service';
import { UsersService } from '../src/users/users.service';

// @nestjs/config và @nestjs/mapped-types chỉ có bản ESM nên Jest không nạp được; spec mock chúng lại.
jest.mock('@nestjs/config', () => ({ ConfigService: class {} }));
jest.mock('../src/prisma/prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../src/users/dto/update-user.dto', () => ({
  UpdateUserDto: class {},
}));

const ENV: Record<string, string> = {
  JWT_ACCESS_SECRET: 'test-access-secret',
  JWT_ACCESS_EXPIRES_IN: '15m',
  JWT_REFRESH_SECRET: 'test-refresh-secret',
  JWT_REFRESH_EXPIRES_IN: '7d',
};

interface FakeUser {
  id: number;
  email: string;
  password: string;
  name: string | null;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Prisma giả lưu user trong bộ nhớ; UsersService, AuthService và các strategy là bản thật.
function createFakePrisma() {
  const users: FakeUser[] = [];
  const pick = (user: FakeUser, select?: Record<string, boolean>) =>
    Object.fromEntries(
      Object.entries(select ?? { id: true, email: true })
        .filter(([, on]) => on)
        .map(([key]) => [key, user[key as keyof FakeUser]]),
    );
  return {
    users,
    user: {
      findUnique: ({
        where,
        select,
      }: {
        where: { id?: number; email?: string };
        select?: Record<string, boolean>;
      }) => {
        const found = users.find((u) =>
          where.id !== undefined ? u.id === where.id : u.email === where.email,
        );
        return Promise.resolve(found ? pick(found, select) : null);
      },
      create: ({
        data,
        select,
      }: {
        data: Partial<FakeUser>;
        select: Record<string, boolean>;
      }) => {
        const user = {
          id: users.length + 1,
          name: null,
          phone: null,
          role: 'CUSTOMER',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        } as FakeUser;
        users.push(user);
        return Promise.resolve(pick(user, select));
      },
    },
  };
}

describe('Auth API (e2e, Prisma giả)', () => {
  let app: INestApplication<App>;
  let prisma: ReturnType<typeof createFakePrisma>;

  const server = () => app.getHttpServer();
  const login = (email: string, password: string) =>
    request(server()).post('/auth/login').send({ email, password });
  const refreshCookie = (res: request.Response) =>
    (res.headers['set-cookie'] as unknown as string[]).find((c) =>
      c.startsWith('refresh_token='),
    )!;

  beforeAll(async () => {
    prisma = createFakePrisma();
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule, JwtModule.register({})],
      controllers: [AuthController],
      providers: [
        AuthService,
        UsersService,
        LocalStrategy,
        JwtStrategy,
        JwtRefreshStrategy,
        LocalAuthGuard,
        JwtAuthGuard,
        JwtRefreshGuard,
        // Giống AppModule: JwtAuthGuard bật toàn cục, endpoint công khai đánh dấu @Public()
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: { getOrThrow: (key: string) => ENV[key] },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    configureApp(app);
    await app.init();

    // Hai user có sẵn (cost 4 cho nhanh)
    const hash = bcrypt.hashSync('123456', 4);
    for (const [email, isActive] of [
      ['active@gmail.com', true],
      ['locked@gmail.com', false],
    ] as const) {
      await prisma.user.create({
        data: { email, password: hash, isActive },
        select: { id: true },
      });
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/register: tạo CUSTOMER, không có password, name mặc định từ email', async () => {
    const res = await request(server())
      .post('/auth/register')
      .send({ email: '  New.User@Gmail.com ', password: '123456' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      email: 'new.user@gmail.com',
      name: 'new.user',
      role: 'CUSTOMER',
    });
    expect(res.body.data).not.toHaveProperty('password');
    expect(res.body).not.toHaveProperty('data.accessToken');
    expect(prisma.users.at(-1)!.password).not.toBe('123456'); // đã băm
  });

  it('POST /auth/register: gửi role bị từ chối 400; trùng email 409', async () => {
    const withRole = await request(server())
      .post('/auth/register')
      .send({ email: 'x@gmail.com', password: '123456', role: 'ADMIN' })
      .expect(400);
    expect(withRole.body.errors).toEqual([
      { field: 'role', message: 'Trường role không được phép gửi lên' },
    ]);

    const dup = await request(server())
      .post('/auth/register')
      .send({ email: 'ACTIVE@gmail.com', password: '123456' })
      .expect(409);
    expect(dup.body).toMatchObject({
      success: false,
      statusCode: 409,
      message: 'Email này đã được sử dụng',
    });
  });

  it('POST /auth/login đúng: trả accessToken + user (không password) và set cookie refresh', async () => {
    const res = await login('Active@gmail.com', '123456').expect(200);

    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.accessToken).toBe('string');
    expect(res.body.data.user).toMatchObject({
      email: 'active@gmail.com',
      role: 'CUSTOMER',
    });
    expect(res.body.data.user).not.toHaveProperty('password');

    const cookie = refreshCookie(res);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Path=/auth');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).not.toContain('Secure'); // chỉ bật ở production
  });

  it('POST /auth/login: sai mật khẩu và email không tồn tại cùng trả 401 một câu', async () => {
    const wrongPass = await login('active@gmail.com', 'sai-mat-khau').expect(
      401,
    );
    const noUser = await login('khong-co@gmail.com', '123456').expect(401);

    for (const res of [wrongPass, noUser]) {
      expect(res.body).toEqual({
        success: false,
        statusCode: 401,
        message: 'Email hoặc mật khẩu không đúng',
      });
    }
  });

  it('POST /auth/login: user bị khóa → 403; sai mật khẩu của user bị khóa vẫn 401', async () => {
    const locked = await login('locked@gmail.com', '123456').expect(403);
    expect(locked.body.message).toBe('Tài khoản đã bị khóa');
    expect(locked.headers['set-cookie']).toBeUndefined();

    await login('locked@gmail.com', 'sai').expect(401);
  });

  it('POST /auth/login: body thiếu/sai → 400 theo dạng lỗi validate chung', async () => {
    const res = await request(server())
      .post('/auth/login')
      .send({})
      .expect(400);
    expect(res.body.message).toBe('Dữ liệu không hợp lệ');
    expect(res.body.errors.map((e: { field: string }) => e.field)).toEqual(
      expect.arrayContaining(['email', 'password']),
    );
  });

  it('GET /auth/me: có token → 200; không token hoặc token sai → 401', async () => {
    const { body } = await login('active@gmail.com', '123456');

    const ok = await request(server())
      .get('/auth/me')
      .set('Authorization', `Bearer ${body.data.accessToken}`)
      .expect(200);
    expect(ok.body.data.email).toBe('active@gmail.com');
    expect(ok.body.data).not.toHaveProperty('password');

    await request(server()).get('/auth/me').expect(401);
    await request(server())
      .get('/auth/me')
      .set('Authorization', 'Bearer token-rac')
      .expect(401);
  });

  it('GET /auth/me: user bị khóa sau khi đăng nhập thì token cũ mất hiệu lực ngay', async () => {
    const { body } = await login('active@gmail.com', '123456');
    const user = prisma.users.find((u) => u.email === 'active@gmail.com')!;

    user.isActive = false;
    await request(server())
      .get('/auth/me')
      .set('Authorization', `Bearer ${body.data.accessToken}`)
      .expect(401);
    user.isActive = true;
  });

  it('POST /auth/refresh: cookie hợp lệ → access mới + refresh mới; thiếu/sai cookie → 401', async () => {
    const loginRes = await login('active@gmail.com', '123456');
    const cookie = refreshCookie(loginRes).split(';')[0];

    const res = await request(server())
      .post('/auth/refresh')
      .set('Cookie', cookie)
      .expect(200);
    expect(typeof res.body.data.accessToken).toBe('string');
    expect(refreshCookie(res)).toContain('HttpOnly');

    await request(server()).post('/auth/refresh').expect(401);
    // Access token không dùng được như refresh token (khác secret)
    await request(server())
      .post('/auth/refresh')
      .set('Cookie', `refresh_token=${loginRes.body.data.accessToken}`)
      .expect(401);
  });

  it('POST /auth/logout: xóa cookie refresh', async () => {
    const res = await request(server()).post('/auth/logout').expect(200);
    expect(res.body.success).toBe(true);
    expect(refreshCookie(res)).toMatch(/^refresh_token=;/);
    expect(refreshCookie(res)).toContain('Path=/auth');
  });
});
