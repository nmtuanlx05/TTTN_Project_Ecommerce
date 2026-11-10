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
import { UsersController } from '../src/users/users.controller';
import { UsersService } from '../src/users/users.service';

// @nestjs/config và @nestjs/mapped-types chỉ có bản ESM nên Jest không nạp được; spec mock chúng lại.
jest.mock('@nestjs/config', () => ({ ConfigService: class {} }));
jest.mock('../src/prisma/prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../src/users/dto/update-user.dto', () => ({
  UpdateUserDto: class {},
}));

const ACCESS_SECRET = 'test-access-secret';
const OWN_URL =
  'https://res.cloudinary.com/demo/image/upload/v1/mono/avatars/3f2b8c1e.webp';
type RoleName = 'ADMIN' | 'STAFF' | 'CUSTOMER';

// JwtStrategy, JwtAuthGuard, ValidationPipe là bản thật; UsersService giả (không DB). Việc ảnh có phải của người dùng hay không
// (assetId/URL đã đăng ký, đúng chủ) được kiểm ở UsersService/MediaService, có unit test riêng.
describe('PATCH /users/me/avatar (e2e, service giả)', () => {
  let app: INestApplication<App>;
  const tokens = {} as Record<RoleName, string>;
  const ids: Record<RoleName, number> = { ADMIN: 1, STAFF: 2, CUSTOMER: 3 };

  const usersService = {
    findForAuth: jest.fn(),
    findOne: jest.fn(),
    updateAvatar: jest.fn(),
  };

  const patchAvatar = (role: RoleName | undefined, body: unknown) => {
    const req = request(app.getHttpServer()).patch('/users/me/avatar');
    return (
      role ? req.set('Authorization', `Bearer ${tokens[role]}`) : req
    ).send(body as object);
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule, JwtModule.register({})],
      controllers: [UsersController],
      providers: [
        JwtStrategy,
        RolesGuard,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
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

    const jwt = app.get(JwtService);
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
    usersService.updateAvatar.mockImplementation(
      (id: number, dto: { avatarUrl: string | null }) =>
        Promise.resolve({ id, avatarUrl: dto.avatarUrl, password: 'hash' }),
    );
  });

  it('không token → 401, không gọi service', async () => {
    const res = await patchAvatar(undefined, { avatarUrl: OWN_URL });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(usersService.updateAvatar).not.toHaveBeenCalled();
  });

  it.each<RoleName>(['ADMIN', 'STAFF', 'CUSTOMER'])(
    '%s sửa avatar của chính mình → 200, id lấy từ token',
    async (role) => {
      const res = await patchAvatar(role, { avatarUrl: OWN_URL });

      expect(res.status).toBe(200);
      // Lớp chốt của ResponseInterceptor: không có password
      expect(res.body).toEqual({
        success: true,
        data: { id: ids[role], avatarUrl: OWN_URL },
      });
      expect(usersService.updateAvatar).toHaveBeenCalledWith(
        ids[role],
        expect.objectContaining({ avatarUrl: OWN_URL }),
      );
    },
  );

  it('null → xóa ảnh', async () => {
    const res = await patchAvatar('CUSTOMER', { avatarUrl: null });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ id: 3, avatarUrl: null });
    expect(usersService.updateAvatar).toHaveBeenCalledWith(3, {
      avatarUrl: null,
    });
  });

  it('assetId: gửi số nguyên → chuyển nguyên xuống service', async () => {
    const res = await patchAvatar('CUSTOMER', { assetId: 12 });

    expect(res.status).toBe(200);
    expect(usersService.updateAvatar).toHaveBeenCalledWith(3, { assetId: 12 });
  });

  it.each<[string, string, unknown]>([
    ['avatarUrl chuỗi rỗng', 'avatarUrl', { avatarUrl: '' }],
    ['avatarUrl không phải chuỗi', 'avatarUrl', { avatarUrl: 123 }],
    [
      'avatarUrl quá 500 ký tự',
      'avatarUrl',
      { avatarUrl: `https://x/${'a'.repeat(500)}.png` },
    ],
    ['assetId không phải số nguyên', 'assetId', { assetId: 'abc' }],
    ['assetId âm hoặc 0', 'assetId', { assetId: 0 }],
  ])('%s → 400, errors theo đúng trường', async (_name, field, body) => {
    const res = await patchAvatar('CUSTOMER', body);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Dữ liệu không hợp lệ');
    expect(res.body.errors.length).toBeGreaterThan(0);
    for (const error of res.body.errors) {
      expect(error).toEqual({ field, message: expect.any(String) });
    }
    expect(usersService.updateAvatar).not.toHaveBeenCalled();
  });

  it('không nhận id hay trường lạ trong body → 400', async () => {
    const res = await patchAvatar('CUSTOMER', { avatarUrl: OWN_URL, id: 1 });

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual([
      { field: 'id', message: 'Trường id không được phép gửi lên' },
    ]);
    expect(usersService.updateAvatar).not.toHaveBeenCalled();
  });

  it('/users/me/avatar không bị nhầm với PATCH /users/:id', async () => {
    await patchAvatar('ADMIN', { avatarUrl: null }).expect(200);

    // Không rơi vào :id (sẽ là 400 "ID không hợp lệ" vì "me" không phải số)
    expect(usersService.updateAvatar).toHaveBeenCalledTimes(1);
    const res = await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${tokens.ADMIN}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('ID không hợp lệ');
  });
});
