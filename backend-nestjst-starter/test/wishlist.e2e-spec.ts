// res.body của supertest có kiểu any; test chỉ đọc để so sánh nên tắt các rule unsafe-* cho file này.
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { INestApplication, NotFoundException } from '@nestjs/common';
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
import { Paginated } from '../src/common/paginated';
import { conflict } from '../src/common/errors/coded-errors';
import { UsersService } from '../src/users/users.service';
import { WishlistController } from '../src/wishlist/wishlist.controller';
import { WishlistService } from '../src/wishlist/wishlist.service';

// @nestjs/config chỉ có bản ESM nên Jest không nạp được; spec mock lại. Prisma cũng mock vì dùng service giả.
jest.mock('@nestjs/config', () => ({ ConfigService: class {} }));
jest.mock('../src/prisma/prisma.service', () => ({ PrismaService: class {} }));

const ACCESS_SECRET = 'test-access-secret';
type RoleName = 'ADMIN' | 'STAFF' | 'CUSTOMER';
const ADMIN_MESSAGE = 'Tài khoản quản trị không dùng danh sách yêu thích';

// WishlistService giả (không DB): kiểm phần nối ở tầng toàn cục (guard 401/403, ValidationPipe, parseIdPipe,
// response/lỗi chuẩn) và việc controller lấy userId từ token. Logic ở src/wishlist/*.spec.ts.
describe('Wishlist API (e2e, service giả)', () => {
  let app: INestApplication<App>;
  const tokens = {} as Record<RoleName, string>;
  const CUSTOMER_ID = 3;

  const wishlistService = {
    list: jest.fn(),
    listIds: jest.fn(),
    add: jest.fn(),
    remove: jest.fn(),
  };

  const server = () => app.getHttpServer();
  const as = (role?: RoleName) => (req: request.Test) =>
    role ? req.set('Authorization', `Bearer ${tokens[role]}`) : req;

  beforeAll(async () => {
    const fakeUsers: Record<number, { id: number; role: RoleName }> = {
      1: { id: 1, role: 'ADMIN' },
      2: { id: 2, role: 'STAFF' },
      3: { id: CUSTOMER_ID, role: 'CUSTOMER' },
    };
    const usersService = {
      findForAuth: (id: number) =>
        Promise.resolve(
          fakeUsers[id] ? { ...fakeUsers[id], isActive: true } : null,
        ),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule, JwtModule.register({})],
      controllers: [WishlistController],
      providers: [
        JwtStrategy,
        RolesGuard,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: WishlistService, useValue: wishlistService },
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
    wishlistService.list.mockResolvedValue(
      new Paginated([], { page: 1, limit: 12, total: 0 }),
    );
    wishlistService.listIds.mockResolvedValue([5, 3]);
    wishlistService.add.mockResolvedValue({ productId: 9, added: true });
    wishlistService.remove.mockResolvedValue({ productId: 9, removed: true });
  });

  const endpoints: ['get' | 'post' | 'delete', string][] = [
    ['get', '/wishlist'],
    ['get', '/wishlist/ids'],
    ['post', '/wishlist/9'],
    ['delete', '/wishlist/9'],
  ];

  describe.each(endpoints)('%s %s', (method, path) => {
    const call = (role?: RoleName) => as(role)(request(server())[method](path));

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

    it('CUSTOMER → 200 (kể cả POST)', async () => {
      await call('CUSTOMER').expect(200);
    });
  });

  it('GET /wishlist: phân trang bọc { success, data, meta }, userId lấy từ token', async () => {
    const res = await as('CUSTOMER')(
      request(server()).get('/wishlist?page=2&limit=5'),
    ).expect(200);
    expect(res.body).toEqual({
      success: true,
      data: [],
      meta: { page: 1, limit: 12, total: 0, totalPages: 0 },
    });
    expect(wishlistService.list).toHaveBeenCalledWith(
      CUSTOMER_ID,
      expect.objectContaining({ page: 2, limit: 5 }),
    );
  });

  it.each(['limit=49', 'limit=0', 'page=0', 'x=1'])(
    'GET /wishlist?%s → 400',
    async (qs) => {
      await as('CUSTOMER')(request(server()).get(`/wishlist?${qs}`)).expect(
        400,
      );
    },
  );

  it('GET /wishlist/ids trả mảng id (không bị hiểu là :productId)', async () => {
    const res = await as('CUSTOMER')(
      request(server()).get('/wishlist/ids'),
    ).expect(200);
    expect(res.body).toEqual({ success: true, data: [5, 3] });
    expect(wishlistService.listIds).toHaveBeenCalledWith(CUSTOMER_ID);
  });

  it('POST /wishlist/:productId → 200 { productId, added }', async () => {
    const res = await as('CUSTOMER')(
      request(server()).post('/wishlist/9'),
    ).expect(200);
    expect(res.body).toEqual({
      success: true,
      data: { productId: 9, added: true },
    });
    expect(wishlistService.add).toHaveBeenCalledWith(CUSTOMER_ID, 9);
  });

  it('DELETE /wishlist/:productId → 200 { productId, removed }', async () => {
    const res = await as('CUSTOMER')(
      request(server()).delete('/wishlist/9'),
    ).expect(200);
    expect(res.body).toEqual({
      success: true,
      data: { productId: 9, removed: true },
    });
    expect(wishlistService.remove).toHaveBeenCalledWith(CUSTOMER_ID, 9);
  });

  it.each(['post', 'delete'] as const)(
    '%s /wishlist/abc → 400 ID không hợp lệ',
    async (method) => {
      const res = await as('CUSTOMER')(
        request(server())[method]('/wishlist/abc'),
      ).expect(400);
      expect(res.body.message).toBe('ID không hợp lệ');
    },
  );

  it('POST sản phẩm không tồn tại → 404 không có code', async () => {
    wishlistService.add.mockRejectedValue(
      new NotFoundException('Không tìm thấy sản phẩm'),
    );
    const res = await as('CUSTOMER')(
      request(server()).post('/wishlist/9'),
    ).expect(404);
    expect(res.body).toEqual({
      success: false,
      statusCode: 404,
      message: 'Không tìm thấy sản phẩm',
    });
  });

  it('POST khi đủ 100 → 409 WISHLIST_FULL', async () => {
    wishlistService.add.mockRejectedValue(
      conflict('WISHLIST_FULL', 'Danh sách yêu thích đã đầy'),
    );
    const res = await as('CUSTOMER')(
      request(server()).post('/wishlist/9'),
    ).expect(409);
    expect(res.body).toMatchObject({
      success: false,
      statusCode: 409,
      code: 'WISHLIST_FULL',
    });
  });
});
