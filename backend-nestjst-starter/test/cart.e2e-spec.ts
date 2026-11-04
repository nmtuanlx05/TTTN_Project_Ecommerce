// res.body của supertest có kiểu any; test chỉ đọc để so sánh nên tắt các rule unsafe-* cho file này.
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  ConflictException,
  INestApplication,
  NotFoundException,
} from '@nestjs/common';
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
import { CartController } from '../src/cart/cart.controller';
import { CartService } from '../src/cart/cart.service';
import { UsersService } from '../src/users/users.service';

// @nestjs/config chỉ có bản ESM nên Jest không nạp được; spec mock lại. Prisma cũng mock vì dùng service giả.
jest.mock('@nestjs/config', () => ({ ConfigService: class {} }));
jest.mock('../src/prisma/prisma.service', () => ({ PrismaService: class {} }));

const ACCESS_SECRET = 'test-access-secret';
type RoleName = 'ADMIN' | 'STAFF' | 'CUSTOMER';
const ADMIN_MESSAGE = 'Tài khoản quản trị không dùng để mua hàng';
const emptyCart = { items: [], subtotal: 0, itemCount: 0, unavailableCount: 0 };

// CartService giả (không DB, không ghi vào ecommerce_dev): kiểm phần nối ở tầng toàn cục
// (guard 401/403, ValidationPipe, ParseIdPipe, response/lỗi chuẩn) và việc controller lấy userId từ token.
// Logic giỏ nằm ở src/cart/*.spec.ts; khóa dòng/UNIQUE trên MySQL thật chưa được test tự động.
describe('Cart API (e2e, service giả)', () => {
  let app: INestApplication<App>;
  const tokens = {} as Record<RoleName, string>;

  const cartService = {
    getCart: jest.fn(),
    addItem: jest.fn(),
    updateItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  };

  const server = () => app.getHttpServer();
  const as = (role?: RoleName) => (req: request.Test) =>
    role ? req.set('Authorization', `Bearer ${tokens[role]}`) : req;

  beforeAll(async () => {
    // JwtStrategy thật, chỉ giả việc tải user từ DB: id 1 = ADMIN, 2 = STAFF, 3 = CUSTOMER
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
      controllers: [CartController],
      providers: [
        JwtStrategy,
        RolesGuard,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: CartService, useValue: cartService },
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
    for (const fn of Object.values(cartService))
      fn.mockResolvedValue(emptyCart);
  });

  const endpoints: [string, string, object | undefined][] = [
    ['get', '/cart', undefined],
    ['post', '/cart/items', { variantId: 1, quantity: 1 }],
    ['patch', '/cart/items/1', { quantity: 1 }],
    ['delete', '/cart/items/1', undefined],
    ['delete', '/cart', undefined],
  ];

  describe.each(endpoints)('%s %s', (method, path, body) => {
    const call = (role?: RoleName) => {
      const req =
        request(server())[method as 'get' | 'post' | 'patch' | 'delete'](path);
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
      const res = await call('CUSTOMER').expect(method === 'post' ? 201 : 200);
      expect(res.body).toEqual({ success: true, data: emptyCart });
    });
  });

  it('userId lấy từ token, không từ body/đường dẫn', async () => {
    await as('CUSTOMER')(request(server()).get('/cart')).expect(200);
    expect(cartService.getCart).toHaveBeenCalledWith(3);

    await as('CUSTOMER')(request(server()).post('/cart/items'))
      .send({ variantId: 9, quantity: 2 })
      .expect(201);
    expect(cartService.addItem).toHaveBeenCalledWith(3, 9, 2);

    await as('CUSTOMER')(request(server()).patch('/cart/items/4'))
      .send({ quantity: 5 })
      .expect(200);
    expect(cartService.updateItem).toHaveBeenCalledWith(3, 4, 5);

    await as('CUSTOMER')(request(server()).delete('/cart/items/4')).expect(200);
    expect(cartService.removeItem).toHaveBeenCalledWith(3, 4);

    await as('CUSTOMER')(request(server()).delete('/cart')).expect(200);
    expect(cartService.clear).toHaveBeenCalledWith(3);
  });

  it('không nhận userId trong body (forbidNonWhitelisted) → 400', async () => {
    const res = await as('CUSTOMER')(request(server()).post('/cart/items'))
      .send({ variantId: 1, quantity: 1, userId: 99 })
      .expect(400);
    expect(res.body.message).toBe('Dữ liệu không hợp lệ');
    expect(cartService.addItem).not.toHaveBeenCalled();
  });

  it.each([
    [{ variantId: 1, quantity: 0 }, 'quantity', 'Số lượng phải từ 1 đến 10'],
    [{ variantId: 1, quantity: 11 }, 'quantity', 'Số lượng phải từ 1 đến 10'],
    [{ variantId: 1, quantity: 1.5 }, 'quantity', 'Số lượng phải là số nguyên'],
    [{ variantId: 1 }, 'quantity', 'Số lượng phải là số nguyên'],
    [{ quantity: 1 }, 'variantId', 'Mã biến thể phải là số nguyên'],
  ])('POST body sai %j → 400 tiếng Việt', async (body, field, message) => {
    const res = await as('CUSTOMER')(request(server()).post('/cart/items'))
      .send(body)
      .expect(400);
    expect(res.body.errors).toContainEqual({ field, message });
    expect(cartService.addItem).not.toHaveBeenCalled();
  });

  it('PATCH quantity ngoài 1..10 → 400', async () => {
    for (const quantity of [0, 11]) {
      await as('CUSTOMER')(request(server()).patch('/cart/items/1'))
        .send({ quantity })
        .expect(400);
    }
    expect(cartService.updateItem).not.toHaveBeenCalled();
  });

  it('id không hợp lệ → 400 "ID không hợp lệ"', async () => {
    const res = await as('CUSTOMER')(
      request(server()).delete('/cart/items/abc'),
    ).expect(400);
    expect(res.body.message).toBe('ID không hợp lệ');
  });

  it('lỗi 404/409 từ service đi qua bộ lọc lỗi chuẩn', async () => {
    cartService.removeItem.mockRejectedValue(
      new NotFoundException('Không tìm thấy sản phẩm trong giỏ hàng'),
    );
    const notFound = await as('CUSTOMER')(
      request(server()).delete('/cart/items/8'),
    ).expect(404);
    expect(notFound.body).toEqual({
      success: false,
      statusCode: 404,
      message: 'Không tìm thấy sản phẩm trong giỏ hàng',
    });

    cartService.addItem.mockRejectedValue(
      new ConflictException('Sản phẩm đã hết hàng'),
    );
    const conflict = await as('CUSTOMER')(request(server()).post('/cart/items'))
      .send({ variantId: 1, quantity: 1 })
      .expect(409);
    expect(conflict.body.message).toBe('Sản phẩm đã hết hàng');
  });
});
