// res.body của supertest có kiểu any; test chỉ đọc để so sánh nên tắt các rule unsafe-* cho file này.
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import {
  BadRequestException,
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
import { AdminProductsController } from '../src/products/admin-products.controller';
import { ProductsService } from '../src/products/products.service';
import { PublicProductsController } from '../src/products/public-products.controller';
import { UsersService } from '../src/users/users.service';

// @nestjs/config chỉ có bản ESM nên Jest không nạp được; spec mock lại. Prisma cũng mock vì dùng service giả.
jest.mock('@nestjs/config', () => ({ ConfigService: class {} }));
jest.mock('../src/prisma/prisma.service', () => ({ PrismaService: class {} }));

const ACCESS_SECRET = 'test-access-secret';
type RoleName = 'ADMIN' | 'STAFF' | 'CUSTOMER';

// Dùng ProductsService giả (không DB) để kiểm tra phần nối ở tầng toàn cục:
// JwtAuthGuard + RolesGuard (401/403), ValidationPipe, ParseIdPipe, ResponseInterceptor, AllExceptionsFilter.
// Logic truy vấn (phân trang, lọc, tìm kiếm, slug -2, trùng SKU, upsert biến thể) KHÔNG được kiểm ở đây.
// Việc public không lộ trường nội bộ được kiểm ở mức mapping trong src/products/products.mapper.spec.ts.
describe('Products API (e2e, service giả)', () => {
  let app: INestApplication<App>;
  const tokens = {} as Record<RoleName, string>;

  const productsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    findAllPublic: jest.fn(),
    findBySlug: jest.fn(),
  };

  const server = () => app.getHttpServer();
  const as = (role?: RoleName) => (req: request.Test) =>
    role ? req.set('Authorization', `Bearer ${tokens[role]}`) : req;
  const errorsOf = (
    res: request.Response,
  ): { field: string; message: string }[] => res.body.errors;

  const validVariant = { sku: 'atb-m-den', size: 'M', color: 'Đen' };
  const validCreate = {
    name: 'Áo thun basic',
    price: 199000,
    categoryId: 2,
    variants: [validVariant],
  };

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
      controllers: [AdminProductsController, PublicProductsController],
      providers: [
        JwtStrategy,
        RolesGuard,
        // Giống AppModule: JwtAuthGuard bật toàn cục, endpoint công khai đánh dấu @Public()
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: ProductsService, useValue: productsService },
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
    productsService.findAll.mockResolvedValue(
      new Paginated([], { page: 1, limit: 10, total: 0 }),
    );
    productsService.findAllPublic.mockResolvedValue(
      new Paginated([], { page: 1, limit: 10, total: 0 }),
    );
    productsService.findOne.mockResolvedValue({ id: 1 });
    productsService.create.mockResolvedValue({ id: 1 });
    productsService.update.mockResolvedValue({ id: 1 });
    productsService.updateStatus.mockResolvedValue({ id: 1 });
    productsService.findBySlug.mockResolvedValue({ id: 1 });
  });

  describe('phân quyền admin', () => {
    // Mọi endpoint admin: ADMIN và STAFF được phép, CUSTOMER bị chặn
    const cases: {
      name: string;
      method: 'get' | 'post' | 'patch';
      path: string;
      body?: object;
      ok: number;
      service: keyof typeof productsService;
    }[] = [
      {
        name: 'GET /admin/products',
        method: 'get',
        path: '/admin/products',
        ok: 200,
        service: 'findAll',
      },
      {
        name: 'GET /admin/products/:id',
        method: 'get',
        path: '/admin/products/1',
        ok: 200,
        service: 'findOne',
      },
      {
        name: 'POST /admin/products',
        method: 'post',
        path: '/admin/products',
        body: validCreate,
        ok: 201,
        service: 'create',
      },
      {
        name: 'PATCH /admin/products/:id',
        method: 'patch',
        path: '/admin/products/1',
        body: { name: 'Áo phông' },
        ok: 200,
        service: 'update',
      },
      {
        name: 'PATCH /admin/products/:id/status',
        method: 'patch',
        path: '/admin/products/1/status',
        body: { isActive: false },
        ok: 200,
        service: 'updateStatus',
      },
    ];

    it.each(cases)('$name: không token → 401', async (c) => {
      const res = await request(server())
        [c.method](c.path)
        .send(c.body)
        .expect(401);
      expect(res.body).toMatchObject({ success: false, statusCode: 401 });
      expect(productsService[c.service]).not.toHaveBeenCalled();
    });

    it.each(cases)('$name: token rác → 401', async (c) => {
      await request(server())
        [c.method](c.path)
        .set('Authorization', 'Bearer abc.def.ghi')
        .send(c.body)
        .expect(401);
      expect(productsService[c.service]).not.toHaveBeenCalled();
    });

    for (const role of ['ADMIN', 'STAFF'] as RoleName[]) {
      it.each(cases)(`$name: ${role} → thành công`, async (c) => {
        const res = await as(role)(request(server())[c.method](c.path)).send(
          c.body,
        );
        expect(res.status).toBe(c.ok);
        expect(res.body.success).toBe(true);
        expect(productsService[c.service]).toHaveBeenCalledTimes(1);
      });
    }

    it.each(cases)('$name: CUSTOMER → 403', async (c) => {
      const res = await as('CUSTOMER')(
        request(server())[c.method](c.path),
      ).send(c.body);
      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        success: false,
        statusCode: 403,
        message: 'Bạn không có quyền thực hiện thao tác này',
      });
      expect(productsService[c.service]).not.toHaveBeenCalled();
    });

    it('không có DELETE cho sản phẩm (kể cả ADMIN) → 404', async () => {
      await as('ADMIN')(request(server()).delete('/admin/products/1')).expect(
        404,
      );
      await request(server()).delete('/products/1').expect(404);
    });
  });

  describe('public: GET /products, GET /products/:slug', () => {
    it('không cần token, danh sách bọc { success, data, meta }', async () => {
      productsService.findAllPublic.mockResolvedValue(
        new Paginated([{ id: 1, slug: 'ao-thun', inStock: true }], {
          page: 1,
          limit: 10,
          total: 1,
        }),
      );

      const res = await request(server()).get('/products').expect(200);

      expect(res.body).toEqual({
        success: true,
        data: [{ id: 1, slug: 'ao-thun', inStock: true }],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });
    });

    it('chi tiết theo slug bọc { success, data }', async () => {
      productsService.findBySlug.mockResolvedValue({ id: 1, slug: 'ao-thun' });

      const res = await request(server()).get('/products/ao-thun').expect(200);

      expect(res.body).toEqual({
        success: true,
        data: { id: 1, slug: 'ao-thun' },
      });
      expect(productsService.findBySlug).toHaveBeenCalledWith('ao-thun');
    });

    it('sản phẩm ẩn/không tồn tại (service ném NotFound) → 404 đúng dạng lỗi chung', async () => {
      productsService.findBySlug.mockRejectedValue(
        new NotFoundException('Không tìm thấy sản phẩm'),
      );
      const res = await request(server()).get('/products/da-an').expect(404);
      expect(res.body).toEqual({
        success: false,
        statusCode: 404,
        message: 'Không tìm thấy sản phẩm',
      });
    });

    it('CUSTOMER đã đăng nhập vẫn xem được', async () => {
      await as('CUSTOMER')(request(server()).get('/products')).expect(200);
    });

    it('không có endpoint ghi công khai (POST/PATCH /products → 404)', async () => {
      await request(server()).post('/products').send(validCreate).expect(404);
      await request(server()).patch('/products/ao-thun').send({}).expect(404);
      expect(productsService.create).not.toHaveBeenCalled();
      expect(productsService.update).not.toHaveBeenCalled();
    });

    it('query ép kiểu đúng, không nhận isActive (public luôn chỉ sản phẩm đang bán)', async () => {
      await request(server())
        .get(
          '/products?page=2&limit=5&categoryId=3&sortBy=price&order=asc&q=%20%C3%A1o%20',
        )
        .expect(200);
      expect(productsService.findAllPublic).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          limit: 5,
          categoryId: 3,
          sortBy: 'price',
          order: 'asc',
          q: 'áo',
        }),
      );

      const res = await request(server())
        .get('/products?isActive=false')
        .expect(400);
      expect(errorsOf(res)).toEqual([
        {
          field: 'isActive',
          message: 'Trường isActive không được phép gửi lên',
        },
      ]);
    });

    it('mặc định page=1, limit=10, sortBy=createdAt, order=desc', async () => {
      await request(server()).get('/products').expect(200);
      expect(productsService.findAllPublic).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 10,
          sortBy: 'createdAt',
          order: 'desc',
        }),
      );
    });

    it('query sai → 400 kèm errors theo trường', async () => {
      const res = await request(server())
        .get('/products?limit=101&page=0&sortBy=id&order=up&categoryId=abc')
        .expect(400);
      expect(errorsOf(res).map((e) => e.field)).toEqual(
        expect.arrayContaining([
          'limit',
          'page',
          'sortBy',
          'order',
          'categoryId',
        ]),
      );
      expect(errorsOf(res)).toContainEqual({
        field: 'sortBy',
        message: 'sortBy phải là createdAt, price hoặc name',
      });
      expect(productsService.findAllPublic).not.toHaveBeenCalled();
    });
  });

  describe('GET /admin/products', () => {
    it('bọc { success, data, meta }, ép kiểu query (kể cả isActive) và truyền đủ cho service', async () => {
      productsService.findAll.mockResolvedValue(
        new Paginated([{ id: 1, name: 'Áo' }], {
          page: 2,
          limit: 5,
          total: 11,
        }),
      );

      const res = await as('STAFF')(
        request(server()).get(
          '/admin/products?page=2&limit=5&categoryId=7&isActive=false&sortBy=name&order=asc&q=%20%C3%A1o%20',
        ),
      ).expect(200);

      expect(res.body).toEqual({
        success: true,
        data: [{ id: 1, name: 'Áo' }],
        meta: { page: 2, limit: 5, total: 11, totalPages: 3 },
      });
      expect(productsService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          limit: 5,
          categoryId: 7,
          isActive: false,
          sortBy: 'name',
          order: 'asc',
          q: 'áo',
        }),
      );
    });

    it('isActive=true → boolean true; không gửi → undefined (lấy cả ẩn và hiện)', async () => {
      await as('ADMIN')(
        request(server()).get('/admin/products?isActive=true'),
      ).expect(200);
      expect(productsService.findAll).toHaveBeenLastCalledWith(
        expect.objectContaining({ isActive: true }),
      );

      await as('ADMIN')(request(server()).get('/admin/products')).expect(200);
      expect(productsService.findAll.mock.lastCall[0].isActive).toBeUndefined();
    });

    it('isActive không phải true/false → 400 tiếng Việt', async () => {
      const res = await as('ADMIN')(
        request(server()).get('/admin/products?isActive=abc'),
      ).expect(400);
      expect(errorsOf(res)).toContainEqual({
        field: 'isActive',
        message: 'isActive phải là true hoặc false',
      });
    });

    it('query lạ bị từ chối (forbidNonWhitelisted)', async () => {
      const res = await as('ADMIN')(
        request(server()).get('/admin/products?foo=1'),
      ).expect(400);
      expect(errorsOf(res)).toEqual([
        { field: 'foo', message: 'Trường foo không được phép gửi lên' },
      ]);
    });
  });

  describe('GET /admin/products/:id', () => {
    it('id không phải số → 400 "ID không hợp lệ"', async () => {
      const res = await as('ADMIN')(
        request(server()).get('/admin/products/abc'),
      ).expect(400);
      expect(res.body).toEqual({
        success: false,
        statusCode: 400,
        message: 'ID không hợp lệ',
      });
    });

    it('service ném NotFound → 404', async () => {
      productsService.findOne.mockRejectedValue(
        new NotFoundException('Không tìm thấy sản phẩm với ID #999'),
      );
      const res = await as('STAFF')(
        request(server()).get('/admin/products/999'),
      ).expect(404);
      expect(res.body).toEqual({
        success: false,
        statusCode: 404,
        message: 'Không tìm thấy sản phẩm với ID #999',
      });
    });
  });

  describe('POST /admin/products', () => {
    const post = (body: object, role: RoleName = 'ADMIN') =>
      as(role)(request(server()).post('/admin/products')).send(body);

    it('hợp lệ → 201; trim tên, SKU chuẩn hóa chữ hoa, ""→null cho description/imageUrl', async () => {
      productsService.create.mockResolvedValue({
        id: 5,
        slug: 'ao-thun-basic',
      });

      const res = await post({
        name: '  Áo thun basic  ',
        description: '   ',
        price: 199000,
        imageUrl: '',
        categoryId: 2,
        variants: [{ sku: '  atb-m-den ', size: ' M ', color: ' Đen ' }],
      }).expect(201);

      expect(res.body).toEqual({
        success: true,
        data: { id: 5, slug: 'ao-thun-basic' },
      });
      expect(productsService.create).toHaveBeenCalledWith({
        name: 'Áo thun basic',
        description: null,
        price: 199000,
        imageUrl: null,
        categoryId: 2,
        variants: [{ sku: 'ATB-M-DEN', size: 'M', color: 'Đen' }],
      });
    });

    it('STAFF tạo được (khác categories, products không giới hạn ADMIN)', async () => {
      await post(validCreate, 'STAFF').expect(201);
    });

    it('body rỗng → 400, báo thiếu name, price, categoryId, variants', async () => {
      const res = await post({}).expect(400);
      expect(res.body.message).toBe('Dữ liệu không hợp lệ');
      expect(errorsOf(res).map((e) => e.field)).toEqual(
        expect.arrayContaining(['name', 'price', 'categoryId', 'variants']),
      );
      expect(productsService.create).not.toHaveBeenCalled();
    });

    it('variants rỗng → 400 "ít nhất 1 biến thể"', async () => {
      const res = await post({ ...validCreate, variants: [] }).expect(400);
      expect(errorsOf(res)).toContainEqual({
        field: 'variants',
        message: 'Sản phẩm phải có ít nhất 1 biến thể',
      });
    });

    it('variants quá 100 phần tử → 400', async () => {
      const variants = Array.from({ length: 101 }, (_, i) => ({
        sku: `SKU-${i}`,
        size: 'M',
        color: `C${i}`,
      }));
      const res = await post({ ...validCreate, variants }).expect(400);
      expect(errorsOf(res)).toContainEqual({
        field: 'variants',
        message: 'Sản phẩm không được vượt quá 100 biến thể',
      });
    });

    it('lỗi trong biến thể được báo theo đường dẫn variants.<i>.<trường>', async () => {
      const res = await post({
        ...validCreate,
        variants: [
          validVariant,
          { sku: 'có dấu', size: '', color: 'x'.repeat(51) },
        ],
      }).expect(400);
      expect(errorsOf(res)).toEqual(
        expect.arrayContaining([
          {
            field: 'variants.1.sku',
            message: 'SKU chỉ gồm chữ cái không dấu, số và các ký tự . _ -',
          },
          { field: 'variants.1.size', message: 'Size không được để trống' },
          {
            field: 'variants.1.color',
            message: 'Màu sắc không được vượt quá 50 ký tự',
          },
        ]),
      );
    });

    it('không nhận stock/reserved/minStock ở biến thể (thuộc module Kho)', async () => {
      const res = await post({
        ...validCreate,
        variants: [{ ...validVariant, stock: 10, minStock: 2 }],
      }).expect(400);
      expect(errorsOf(res)).toEqual(
        expect.arrayContaining([
          {
            field: 'variants.0.stock',
            message: 'Trường variants.0.stock không được phép gửi lên',
          },
          {
            field: 'variants.0.minStock',
            message: 'Trường variants.0.minStock không được phép gửi lên',
          },
        ]),
      );
    });

    it('giá: âm, số lẻ, chuỗi, vượt 2147483647 → 400', async () => {
      const cases: [unknown, string][] = [
        [-1, 'Giá không được âm'],
        [10.5, 'Giá phải là số nguyên (VND)'],
        ['199000', 'Giá phải là số nguyên (VND)'],
        [2147483648, 'Giá không được vượt quá 2147483647'],
      ];
      for (const [price, message] of cases) {
        const res = await post({ ...validCreate, price }).expect(400);
        expect(errorsOf(res)).toContainEqual({ field: 'price', message });
      }
      // Biên hợp lệ: 0 và 2147483647
      await post({ ...validCreate, price: 0 }).expect(201);
      await post({ ...validCreate, price: 2147483647 }).expect(201);
    });

    it('imageUrl dài quá 191 ký tự → 400 với message tiếng Việt rõ ràng', async () => {
      const url = `https://cdn.example.com/${'a'.repeat(170)}.jpg`; // 193 ký tự
      expect(url.length).toBeGreaterThan(191);
      const res = await post({ ...validCreate, imageUrl: url }).expect(400);
      expect(errorsOf(res)).toContainEqual({
        field: 'imageUrl',
        message: 'Đường dẫn ảnh không được vượt quá 191 ký tự',
      });
      expect(productsService.create).not.toHaveBeenCalled();
    });

    it('imageUrl đúng 191 ký tự → hợp lệ; không phải http(s) → 400', async () => {
      const prefix = 'https://cdn.example.com/';
      const ok = prefix + 'a'.repeat(191 - prefix.length);
      expect(ok.length).toBe(191);
      await post({ ...validCreate, imageUrl: ok }).expect(201);

      for (const imageUrl of [
        'not-a-url',
        'ftp://x.com/a.jpg',
        'x.com/a.jpg',
      ]) {
        const res = await post({ ...validCreate, imageUrl }).expect(400);
        expect(errorsOf(res)).toContainEqual({
          field: 'imageUrl',
          message:
            'Đường dẫn ảnh không hợp lệ, phải bắt đầu bằng http:// hoặc https://',
        });
      }
    });

    it('name rỗng/toàn khoảng trắng, quá 191 ký tự, không phải chuỗi → 400', async () => {
      const blank = await post({ ...validCreate, name: '   ' }).expect(400);
      expect(errorsOf(blank)).toContainEqual({
        field: 'name',
        message: 'Tên sản phẩm không được để trống',
      });

      const long = await post({ ...validCreate, name: 'a'.repeat(192) }).expect(
        400,
      );
      expect(errorsOf(long)).toContainEqual({
        field: 'name',
        message: 'Tên sản phẩm không được vượt quá 191 ký tự',
      });

      const num = await post({ ...validCreate, name: 123 }).expect(400);
      expect(errorsOf(num)).toContainEqual({
        field: 'name',
        message: 'Tên sản phẩm phải là chuỗi',
      });
    });

    it('slug "" bị từ chối giống categories; slug sai định dạng → 400; slug hợp lệ được chuyển nguyên', async () => {
      for (const slug of ['', 'Áo Thun']) {
        const res = await post({ ...validCreate, slug }).expect(400);
        expect(errorsOf(res)).toContainEqual({
          field: 'slug',
          message: 'Slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang',
        });
      }
      await post({ ...validCreate, slug: 'ao-thun' }).expect(201);
      expect(productsService.create).toHaveBeenLastCalledWith(
        expect.objectContaining({ slug: 'ao-thun' }),
      );
    });

    it('categoryId < 1 hoặc không phải số nguyên → 400', async () => {
      const res = await post({ ...validCreate, categoryId: 0 }).expect(400);
      expect(errorsOf(res)).toContainEqual({
        field: 'categoryId',
        message: 'categoryId phải lớn hơn hoặc bằng 1',
      });
      await post({ ...validCreate, categoryId: '2' }).expect(400);
    });

    it('trường lạ (vd isActive, id) bị từ chối', async () => {
      const res = await post({ ...validCreate, isActive: false, id: 9 }).expect(
        400,
      );
      expect(errorsOf(res)).toEqual(
        expect.arrayContaining([
          {
            field: 'isActive',
            message: 'Trường isActive không được phép gửi lên',
          },
          { field: 'id', message: 'Trường id không được phép gửi lên' },
        ]),
      );
    });

    it('service ném Conflict (slug/SKU trùng) → 409', async () => {
      productsService.create.mockRejectedValue(
        new ConflictException('SKU "ATB-M-DEN" đã được sử dụng'),
      );
      const res = await post(validCreate).expect(409);
      expect(res.body).toEqual({
        success: false,
        statusCode: 409,
        message: 'SKU "ATB-M-DEN" đã được sử dụng',
      });
    });

    it('service ném BadRequest (categoryId không tồn tại) → 400', async () => {
      productsService.create.mockRejectedValue(
        new BadRequestException('Danh mục với ID #9 không tồn tại'),
      );
      const res = await post({ ...validCreate, categoryId: 9 }).expect(400);
      expect(res.body.message).toBe('Danh mục với ID #9 không tồn tại');
    });
  });

  describe('PATCH /admin/products/:id', () => {
    const patch = (
      body: object,
      role: RoleName = 'STAFF',
      path = '/admin/products/4',
    ) => as(role)(request(server()).patch(path)).send(body);

    it('chỉ gửi một phần trường → 200; description/imageUrl null hoặc "" được chuyển thành null để xóa', async () => {
      await patch({ price: 250000, description: null, imageUrl: '' }).expect(
        200,
      );
      expect(productsService.update).toHaveBeenCalledWith(4, {
        price: 250000,
        description: null,
        imageUrl: null,
      });
    });

    it('body rỗng {} hợp lệ (không đổi gì)', async () => {
      await patch({}).expect(200);
      expect(productsService.update).toHaveBeenCalledWith(4, {});
    });

    it('biến thể: có id (sửa), không id (tạo mới) trong cùng một request', async () => {
      await patch({
        variants: [
          { id: 10, isActive: false },
          { id: 11, sku: 'new-sku' },
          { sku: 'atb-xl-den', size: 'XL', color: 'Đen' },
        ],
      }).expect(200);
      expect(productsService.update).toHaveBeenCalledWith(4, {
        variants: [
          { id: 10, isActive: false },
          { id: 11, sku: 'NEW-SKU' },
          { sku: 'ATB-XL-DEN', size: 'XL', color: 'Đen' },
        ],
      });
    });

    it('biến thể không có id mà thiếu sku/size/color → 400 theo từng trường', async () => {
      const res = await patch({ variants: [{ isActive: true }] }).expect(400);
      expect(errorsOf(res)).toEqual(
        expect.arrayContaining([
          { field: 'variants.0.sku', message: 'SKU không được để trống' },
          { field: 'variants.0.size', message: 'Size không được để trống' },
          { field: 'variants.0.color', message: 'Màu sắc không được để trống' },
        ]),
      );
      expect(productsService.update).not.toHaveBeenCalled();
    });

    it('biến thể có id nhưng gửi sku rỗng → 400; sku null cũng bị từ chối', async () => {
      const blank = await patch({ variants: [{ id: 10, sku: '' }] }).expect(
        400,
      );
      expect(errorsOf(blank)).toContainEqual({
        field: 'variants.0.sku',
        message: 'SKU không được để trống',
      });
      await patch({ variants: [{ id: 10, sku: null }] }).expect(400);
    });

    it('id biến thể sai kiểu hoặc < 1 → 400', async () => {
      const res = await patch({ variants: [{ id: 0, isActive: true }] }).expect(
        400,
      );
      expect(errorsOf(res)).toContainEqual({
        field: 'variants.0.id',
        message: 'id biến thể phải lớn hơn hoặc bằng 1',
      });
      await patch({ variants: [{ id: 'abc', isActive: true }] }).expect(400);
    });

    it('không nhận stock trong biến thể; không nhận isActive/variants sai kiểu ở sản phẩm', async () => {
      const stock = await patch({ variants: [{ id: 10, stock: 5 }] }).expect(
        400,
      );
      expect(errorsOf(stock)).toContainEqual({
        field: 'variants.0.stock',
        message: 'Trường variants.0.stock không được phép gửi lên',
      });

      const flag = await patch({ isActive: false }).expect(400);
      expect(errorsOf(flag)).toEqual([
        {
          field: 'isActive',
          message: 'Trường isActive không được phép gửi lên',
        },
      ]);

      await patch({ variants: 'x' }).expect(400);
    });

    it('name rỗng, price âm, imageUrl quá dài → 400', async () => {
      const res = await patch({
        name: '',
        price: -5,
        imageUrl: `https://x.com/${'a'.repeat(200)}`,
      }).expect(400);
      expect(errorsOf(res)).toEqual(
        expect.arrayContaining([
          { field: 'name', message: 'Tên sản phẩm không được để trống' },
          { field: 'price', message: 'Giá không được âm' },
          {
            field: 'imageUrl',
            message: 'Đường dẫn ảnh không được vượt quá 191 ký tự',
          },
        ]),
      );
    });

    it('id sai → 400; service ném NotFound → 404; Conflict → 409; BadRequest → 400', async () => {
      await patch({ name: 'A' }, 'STAFF', '/admin/products/x').expect(400);

      productsService.update.mockRejectedValueOnce(
        new NotFoundException('Không tìm thấy sản phẩm với ID #4'),
      );
      await patch({ name: 'A' }).expect(404);

      productsService.update.mockRejectedValueOnce(
        new ConflictException('Slug "a" đã được sử dụng'),
      );
      const conflict = await patch({ slug: 'a' }, 'ADMIN').expect(409);
      expect(conflict.body.message).toBe('Slug "a" đã được sử dụng');

      productsService.update.mockRejectedValueOnce(
        new BadRequestException('Biến thể #99 không thuộc sản phẩm này'),
      );
      const bad = await patch({
        variants: [{ id: 99, isActive: false }],
      }).expect(400);
      expect(bad.body.message).toBe('Biến thể #99 không thuộc sản phẩm này');
    });
  });

  describe('PATCH /admin/products/:id/status', () => {
    const patchStatus = (body: object, path = '/admin/products/3/status') =>
      as('STAFF')(request(server()).patch(path)).send(body);

    it('ẩn / hiện → 200, truyền (id, isActive) cho service', async () => {
      productsService.updateStatus.mockResolvedValue({
        id: 3,
        isActive: false,
      });
      const res = await patchStatus({ isActive: false }).expect(200);
      expect(res.body).toEqual({
        success: true,
        data: { id: 3, isActive: false },
      });
      expect(productsService.updateStatus).toHaveBeenCalledWith(3, false);

      await patchStatus({ isActive: true }).expect(200);
      expect(productsService.updateStatus).toHaveBeenLastCalledWith(3, true);
    });

    it('thiếu hoặc sai kiểu isActive → 400 tiếng Việt', async () => {
      for (const body of [{}, { isActive: 'false' }, { isActive: 0 }]) {
        const res = await patchStatus(body).expect(400);
        expect(errorsOf(res)).toContainEqual({
          field: 'isActive',
          message: 'isActive phải là true hoặc false',
        });
      }
      expect(productsService.updateStatus).not.toHaveBeenCalled();
    });

    it('trường lạ bị từ chối; id sai → 400; không tồn tại → 404', async () => {
      await patchStatus({ isActive: true, name: 'x' }).expect(400);
      await patchStatus(
        { isActive: true },
        '/admin/products/abc/status',
      ).expect(400);

      productsService.updateStatus.mockRejectedValue(
        new NotFoundException('Không tìm thấy sản phẩm với ID #3'),
      );
      await patchStatus({ isActive: true }).expect(404);
    });
  });
});
