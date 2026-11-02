// res.body của supertest có kiểu any; test chỉ đọc để so sánh nên tắt các rule unsafe-* cho file này.
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
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
import { Paginated } from '../src/common/paginated';
import { AdminInventoryController } from '../src/inventory/admin-inventory.controller';
import { InventoryService } from '../src/inventory/inventory.service';
import { UsersService } from '../src/users/users.service';

// @nestjs/config chỉ có bản ESM nên Jest không nạp được; spec mock lại. Prisma cũng mock vì dùng service giả.
jest.mock('@nestjs/config', () => ({ ConfigService: class {} }));
jest.mock('../src/prisma/prisma.service', () => ({ PrismaService: class {} }));

const ACCESS_SECRET = 'test-access-secret';
type RoleName = 'ADMIN' | 'STAFF' | 'CUSTOMER';

// Dùng InventoryService giả (không DB) để kiểm tra phần nối ở tầng toàn cục:
// JwtAuthGuard + RolesGuard (401/403), ValidationPipe, ParseIdPipe, ResponseInterceptor, AllExceptionsFilter.
// Logic thật (SQL thô, khóa dòng, bất biến tồn kho) KHÔNG được kiểm ở đây: xem inventory.*.spec.ts
// (Prisma giả, chỉ kiểm chuỗi/tham số SQL) và danh sách test tay trên MySQL thật.
describe('Inventory API (e2e, service giả)', () => {
  let app: INestApplication<App>;
  const tokens = {} as Record<RoleName, string>;

  const inventoryService = {
    findAll: jest.fn(),
    getSummary: jest.fn(),
    importStock: jest.fn(),
    exportStock: jest.fn(),
    adjustStock: jest.fn(),
    updateMinStock: jest.fn(),
    findMovements: jest.fn(),
  };

  const server = () => app.getHttpServer();
  const as = (role?: RoleName) => (req: request.Test) =>
    role ? req.set('Authorization', `Bearer ${tokens[role]}`) : req;
  const errorsOf = (
    res: request.Response,
  ): { field: string; message: string }[] => res.body.errors;

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
      controllers: [AdminInventoryController],
      providers: [
        JwtStrategy,
        RolesGuard,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: InventoryService, useValue: inventoryService },
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
    inventoryService.findAll.mockResolvedValue(
      new Paginated([], { page: 1, limit: 10, total: 0 }),
    );
    inventoryService.findMovements.mockResolvedValue(
      new Paginated([], { page: 1, limit: 10, total: 0 }),
    );
    inventoryService.getSummary.mockResolvedValue({
      total: 0,
      inStock: 0,
      low: 0,
      out: 0,
    });
    inventoryService.importStock.mockResolvedValue({
      variant: {},
      movement: {},
    });
    inventoryService.exportStock.mockResolvedValue({
      variant: {},
      movement: {},
    });
    inventoryService.adjustStock.mockResolvedValue({
      variant: {},
      movement: {},
    });
    inventoryService.updateMinStock.mockResolvedValue({ id: 5 });
  });

  const importBody = { quantity: 10 };
  const exportBody = { quantity: 2, reason: 'DAMAGED' };
  const adjustBody = { newStock: 7, reason: 'Kiểm kê' };

  describe('phân quyền', () => {
    const cases: {
      name: string;
      method: 'get' | 'post' | 'patch';
      path: string;
      body?: object;
      ok: number;
      service: keyof typeof inventoryService;
    }[] = [
      {
        name: 'GET /admin/inventory',
        method: 'get',
        path: '/admin/inventory',
        ok: 200,
        service: 'findAll',
      },
      {
        name: 'GET /admin/inventory/summary',
        method: 'get',
        path: '/admin/inventory/summary',
        ok: 200,
        service: 'getSummary',
      },
      {
        name: 'POST /admin/inventory/:variantId/import',
        method: 'post',
        path: '/admin/inventory/5/import',
        body: importBody,
        ok: 201,
        service: 'importStock',
      },
      {
        name: 'POST /admin/inventory/:variantId/export',
        method: 'post',
        path: '/admin/inventory/5/export',
        body: exportBody,
        ok: 201,
        service: 'exportStock',
      },
      {
        name: 'POST /admin/inventory/:variantId/adjust',
        method: 'post',
        path: '/admin/inventory/5/adjust',
        body: adjustBody,
        ok: 201,
        service: 'adjustStock',
      },
      {
        name: 'PATCH /admin/inventory/:variantId/min-stock',
        method: 'patch',
        path: '/admin/inventory/5/min-stock',
        body: { minStock: 3 },
        ok: 200,
        service: 'updateMinStock',
      },
      {
        name: 'GET /admin/inventory/:variantId/movements',
        method: 'get',
        path: '/admin/inventory/5/movements',
        ok: 200,
        service: 'findMovements',
      },
    ];

    describe.each(cases)('$name', ({ method, path, body, ok, service }) => {
      const call = (role?: RoleName) => {
        const req = request(server())[method](path);
        if (body) req.send(body);
        return as(role)(req);
      };

      it('không có token → 401', async () => {
        const res = await call();
        expect(res.status).toBe(401);
        expect(inventoryService[service]).not.toHaveBeenCalled();
      });

      it('CUSTOMER → 403', async () => {
        const res = await call('CUSTOMER');
        expect(res.status).toBe(403);
        expect(res.body).toEqual({
          success: false,
          statusCode: 403,
          message: 'Bạn không có quyền thực hiện thao tác này',
        });
        expect(inventoryService[service]).not.toHaveBeenCalled();
      });

      it.each(['STAFF', 'ADMIN'] as const)('%s → thành công', async (role) => {
        const res = await call(role);
        expect(res.status).toBe(ok);
        expect(res.body.success).toBe(true);
        expect(inventoryService[service]).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('định dạng response', () => {
    it('danh sách: success + data + meta phân trang', async () => {
      inventoryService.findAll.mockResolvedValue(
        new Paginated([{ id: 1 }], { page: 2, limit: 5, total: 11 }),
      );

      const res = await as('STAFF')(request(server()).get('/admin/inventory'));

      expect(res.body).toEqual({
        success: true,
        data: [{ id: 1 }],
        meta: { page: 2, limit: 5, total: 11, totalPages: 3 },
      });
    });

    it('summary: success + data', async () => {
      inventoryService.getSummary.mockResolvedValue({
        total: 10,
        inStock: 6,
        low: 3,
        out: 1,
      });

      const res = await as('ADMIN')(
        request(server()).get('/admin/inventory/summary'),
      );

      expect(res.body).toEqual({
        success: true,
        data: { total: 10, inStock: 6, low: 3, out: 1 },
      });
    });

    it('thao tác đổi tồn: data có variant và movement', async () => {
      inventoryService.importStock.mockResolvedValue({
        variant: { id: 5, stock: 30 },
        movement: { id: 9, type: 'IMPORT' },
      });

      const res = await as('STAFF')(
        request(server()).post('/admin/inventory/5/import').send(importBody),
      );

      expect(res.body).toEqual({
        success: true,
        data: {
          variant: { id: 5, stock: 30 },
          movement: { id: 9, type: 'IMPORT' },
        },
      });
    });

    it('lịch sử: success + data + meta', async () => {
      const res = await as('STAFF')(
        request(server()).get('/admin/inventory/5/movements'),
      );

      expect(res.body.meta).toEqual({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      });
    });
  });

  describe('truyền tham số xuống service', () => {
    it('user thực hiện lấy từ token, id lấy từ đường dẫn', async () => {
      await as('STAFF')(
        request(server()).post('/admin/inventory/5/import').send(importBody),
      );
      await as('ADMIN')(
        request(server()).post('/admin/inventory/6/adjust').send(adjustBody),
      );

      expect(inventoryService.importStock).toHaveBeenCalledWith(
        5,
        expect.objectContaining({ quantity: 10 }),
        2,
      );
      expect(inventoryService.adjustStock).toHaveBeenCalledWith(
        6,
        expect.objectContaining({ newStock: 7, reason: 'Kiểm kê' }),
        1,
      );
    });

    it('query mặc định của danh sách; includeHidden "true" thành boolean', async () => {
      await as('STAFF')(request(server()).get('/admin/inventory'));
      expect(inventoryService.findAll).toHaveBeenLastCalledWith(
        expect.objectContaining({
          sortBy: 'name',
          order: 'asc',
          page: 1,
          limit: 10,
          includeHidden: false,
        }),
      );

      await as('STAFF')(
        request(server()).get('/admin/inventory').query({
          includeHidden: 'true',
          categoryId: '3',
          stockStatus: 'low',
          q: '  áo  ',
          sortBy: 'available',
          order: 'desc',
          page: '2',
          limit: '50',
        }),
      );
      expect(inventoryService.findAll).toHaveBeenLastCalledWith(
        expect.objectContaining({
          includeHidden: true,
          categoryId: 3,
          stockStatus: 'low',
          q: 'áo',
          sortBy: 'available',
          order: 'desc',
          page: 2,
          limit: 50,
        }),
      );
    });

    it('summary nhận categoryId và includeHidden', async () => {
      await as('STAFF')(
        request(server())
          .get('/admin/inventory/summary')
          .query({ categoryId: '3', includeHidden: 'false' }),
      );

      expect(inventoryService.getSummary).toHaveBeenCalledWith(
        expect.objectContaining({ categoryId: 3, includeHidden: false }),
      );
    });

    it('xuất kho: ghi chú rỗng được đổi thành null', async () => {
      await as('STAFF')(
        request(server())
          .post('/admin/inventory/5/export')
          .send({ ...exportBody, note: '   ' }),
      );

      expect(inventoryService.exportStock).toHaveBeenCalledWith(
        5,
        expect.objectContaining({ reason: 'DAMAGED', note: null }),
        2,
      );
    });
  });

  describe('validate', () => {
    const bad = (
      method: 'get' | 'post' | 'patch',
      path: string,
      payload?: object,
    ) => {
      const req = request(server())[method](path);
      if (payload) {
        if (method === 'get') req.query(payload as Record<string, string>);
        else req.send(payload);
      }
      return as('STAFF')(req);
    };

    describe.each([
      ['import', '/admin/inventory/5/import', {}],
      ['export', '/admin/inventory/5/export', { reason: 'LOST' }],
    ])('quantity của %s', (_name, path, extra) => {
      it.each([
        ['0', 0],
        ['âm', -3],
        ['không nguyên', 1.5],
        ['là chuỗi', '5'],
        ['vượt 100000', 100001],
        ['thiếu', undefined],
      ])('%s → 400', async (_label, quantity) => {
        const res = await bad('post', path, { ...extra, quantity });
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Dữ liệu không hợp lệ');
        expect(errorsOf(res).some((e) => e.field === 'quantity')).toBe(true);
      });

      it('đúng 100000 → hợp lệ', async () => {
        const res = await bad('post', path, { ...extra, quantity: 100000 });
        expect(res.status).toBe(201);
      });
    });

    describe('xuất kho', () => {
      it.each([
        ['thiếu reason', { quantity: 1 }],
        ['reason ngoài enum', { quantity: 1, reason: 'STOLEN' }],
      ])('%s → 400', async (_label, body) => {
        const res = await bad('post', '/admin/inventory/5/export', body);
        expect(res.status).toBe(400);
        expect(errorsOf(res).some((e) => e.field === 'reason')).toBe(true);
      });

      it.each([
        ['không gửi note', {}],
        ['note rỗng', { note: '' }],
        ['note toàn khoảng trắng', { note: '   ' }],
        ['note null', { note: null }],
      ])('reason = OTHER, %s → 400 yêu cầu ghi chú', async (_label, extra) => {
        const res = await bad('post', '/admin/inventory/5/export', {
          quantity: 1,
          reason: 'OTHER',
          ...extra,
        });
        expect(res.status).toBe(400);
        expect(errorsOf(res)).toEqual(
          expect.arrayContaining([
            {
              field: 'note',
              message: 'Xuất kho với lý do "Khác" phải có ghi chú',
            },
          ]),
        );
        expect(inventoryService.exportStock).not.toHaveBeenCalled();
      });

      it('reason = OTHER kèm ghi chú → hợp lệ (ghi chú được trim)', async () => {
        const res = await bad('post', '/admin/inventory/5/export', {
          quantity: 1,
          reason: 'OTHER',
          note: '  Tặng đối tác  ',
        });
        expect(res.status).toBe(201);
        expect(inventoryService.exportStock).toHaveBeenCalledWith(
          5,
          expect.objectContaining({ note: 'Tặng đối tác' }),
          2,
        );
      });

      it.each(['DAMAGED', 'LOST'])(
        'reason = %s không cần note',
        async (reason) => {
          const res = await bad('post', '/admin/inventory/5/export', {
            quantity: 1,
            reason,
          });
          expect(res.status).toBe(201);
        },
      );

      it('note không phải chuỗi → 400', async () => {
        const res = await bad('post', '/admin/inventory/5/export', {
          quantity: 1,
          reason: 'LOST',
          note: 123,
        });
        expect(res.status).toBe(400);
      });
    });

    describe('điều chỉnh', () => {
      it.each([
        ['thiếu newStock', { reason: 'x' }, 'newStock'],
        ['newStock âm', { newStock: -1, reason: 'x' }, 'newStock'],
        ['newStock không nguyên', { newStock: 2.5, reason: 'x' }, 'newStock'],
        ['newStock là chuỗi', { newStock: '5', reason: 'x' }, 'newStock'],
        ['thiếu reason', { newStock: 5 }, 'reason'],
        ['reason rỗng', { newStock: 5, reason: '   ' }, 'reason'],
        ['reason quá dài', { newStock: 5, reason: 'x'.repeat(192) }, 'reason'],
      ])('%s → 400', async (_label, body, field) => {
        const res = await bad('post', '/admin/inventory/5/adjust', body);
        expect(res.status).toBe(400);
        expect(errorsOf(res).some((e) => e.field === field)).toBe(true);
        expect(inventoryService.adjustStock).not.toHaveBeenCalled();
      });

      it('newStock = 0 là hợp lệ', async () => {
        const res = await bad('post', '/admin/inventory/5/adjust', {
          newStock: 0,
          reason: 'Hết hàng',
        });
        expect(res.status).toBe(201);
      });
    });

    describe('ngưỡng tồn tối thiểu', () => {
      it.each([
        ['âm', { minStock: -1 }],
        ['không nguyên', { minStock: 1.2 }],
        ['thiếu', {}],
        ['là chuỗi', { minStock: '3' }],
      ])('%s → 400', async (_label, body) => {
        const res = await bad('patch', '/admin/inventory/5/min-stock', body);
        expect(res.status).toBe(400);
        expect(errorsOf(res).some((e) => e.field === 'minStock')).toBe(true);
      });

      it('minStock = 0 là hợp lệ', async () => {
        const res = await bad('patch', '/admin/inventory/5/min-stock', {
          minStock: 0,
        });
        expect(res.status).toBe(200);
      });
    });

    describe('query danh sách', () => {
      it.each([
        [
          'sortBy ngoài whitelist (updatedAt)',
          { sortBy: 'updatedAt' },
          'sortBy',
        ],
        ['sortBy lạ', { sortBy: 'name; DROP TABLE x' }, 'sortBy'],
        ['order lạ', { order: 'up' }, 'order'],
        [
          'stockStatus ngoài whitelist',
          { stockStatus: 'empty' },
          'stockStatus',
        ],
        [
          'includeHidden không phải boolean',
          { includeHidden: 'yes' },
          'includeHidden',
        ],
        ['categoryId không phải số', { categoryId: 'abc' }, 'categoryId'],
        ['page = 0', { page: '0' }, 'page'],
        ['limit = 101', { limit: '101' }, 'limit'],
        ['q quá dài', { q: 'a'.repeat(101) }, 'q'],
        ['trường lạ', { foo: 'bar' }, 'foo'],
      ])('%s → 400', async (_label, query, field) => {
        const res = await bad('get', '/admin/inventory', query);
        expect(res.status).toBe(400);
        expect(errorsOf(res).some((e) => e.field === field)).toBe(true);
        expect(inventoryService.findAll).not.toHaveBeenCalled();
      });
    });

    describe('query summary', () => {
      it.each([
        ['q', { q: 'ao' }],
        ['stockStatus', { stockStatus: 'low' }],
        ['sortBy', { sortBy: 'name' }],
        ['page', { page: '1' }],
        ['includeHidden sai kiểu', { includeHidden: '1' }],
      ])('không nhận %s → 400', async (_label, query) => {
        const res = await bad('get', '/admin/inventory/summary', query);
        expect(res.status).toBe(400);
        expect(inventoryService.getSummary).not.toHaveBeenCalled();
      });
    });

    it('trường thừa trong body → 400 (forbidNonWhitelisted)', async () => {
      const res = await bad('post', '/admin/inventory/5/import', {
        ...importBody,
        stock: 999,
      });
      expect(res.status).toBe(400);
      expect(errorsOf(res)).toEqual(
        expect.arrayContaining([
          { field: 'stock', message: 'Trường stock không được phép gửi lên' },
        ]),
      );
    });

    it.each([
      ['POST', 'post', '/admin/inventory/abc/import', importBody],
      ['POST', 'post', '/admin/inventory/xyz/export', exportBody],
      ['POST', 'post', '/admin/inventory/abc/adjust', adjustBody],
      ['PATCH', 'patch', '/admin/inventory/abc/min-stock', { minStock: 1 }],
      ['GET', 'get', '/admin/inventory/abc/movements', undefined],
    ] as const)(
      '%s %s: variantId không hợp lệ → 400',
      async (_m, method, path, body) => {
        const res = await bad(method, path, body);
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('ID không hợp lệ');
      },
    );
  });

  describe('lỗi do service ném', () => {
    it.each([
      [
        'import',
        'importStock',
        'post',
        '/admin/inventory/404/import',
        importBody,
      ],
      [
        'export',
        'exportStock',
        'post',
        '/admin/inventory/404/export',
        exportBody,
      ],
      [
        'adjust',
        'adjustStock',
        'post',
        '/admin/inventory/404/adjust',
        adjustBody,
      ],
      [
        'min-stock',
        'updateMinStock',
        'patch',
        '/admin/inventory/404/min-stock',
        { minStock: 1 },
      ],
      [
        'movements',
        'findMovements',
        'get',
        '/admin/inventory/404/movements',
        undefined,
      ],
    ] as const)(
      '%s: biến thể không tồn tại → 404',
      async (_n, fn, method, path, body) => {
        inventoryService[fn].mockRejectedValue(
          new NotFoundException('Không tìm thấy biến thể với ID #404'),
        );
        const req = request(server())[method](path);
        if (body) req.send(body);

        const res = await as('STAFF')(req);

        expect(res.status).toBe(404);
        expect(res.body).toEqual({
          success: false,
          statusCode: 404,
          message: 'Không tìm thấy biến thể với ID #404',
        });
      },
    );

    it('xuất vượt khả dụng → 409 với message tiếng Việt', async () => {
      inventoryService.exportStock.mockRejectedValue(
        new ConflictException(
          'Tồn khả dụng không đủ để xuất: khả dụng 2, cần xuất 5',
        ),
      );

      const res = await as('STAFF')(
        request(server())
          .post('/admin/inventory/5/export')
          .send({ quantity: 5, reason: 'LOST' }),
      );

      expect(res.status).toBe(409);
      expect(res.body).toEqual({
        success: false,
        statusCode: 409,
        message: 'Tồn khả dụng không đủ để xuất: khả dụng 2, cần xuất 5',
      });
    });

    it('lỗi không lường trước → 500 chung, không lộ chi tiết', async () => {
      inventoryService.importStock.mockRejectedValue(
        new Error('Check constraint chk_product_variants_reserved is violated'),
      );

      const res = await as('STAFF')(
        request(server()).post('/admin/inventory/5/import').send(importBody),
      );

      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Lỗi hệ thống, vui lòng thử lại sau');
      expect(JSON.stringify(res.body)).not.toContain('chk_product_variants');
    });
  });
});
