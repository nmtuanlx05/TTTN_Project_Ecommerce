// res.body của supertest có kiểu any; test chỉ đọc để so sánh nên tắt các rule unsafe-* cho file này.
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
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
import { AdminCategoriesController } from '../src/categories/admin-categories.controller';
import { CategoriesService } from '../src/categories/categories.service';
import { PublicCategoriesController } from '../src/categories/public-categories.controller';
import { Paginated } from '../src/common/paginated';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { UsersService } from '../src/users/users.service';

// @nestjs/config chỉ có bản ESM nên Jest không nạp được; spec mock lại. Prisma cũng mock vì dùng service giả.
jest.mock('@nestjs/config', () => ({ ConfigService: class {} }));
jest.mock('../src/prisma/prisma.service', () => ({ PrismaService: class {} }));

const ACCESS_SECRET = 'test-access-secret';
type RoleName = 'ADMIN' | 'STAFF' | 'CUSTOMER';

// Dùng CategoriesService giả (không DB) để kiểm tra phần nối ở tầng toàn cục:
// JwtAuthGuard + RolesGuard (401/403), ValidationPipe, ParseIdPipe, ResponseInterceptor, AllExceptionsFilter.
// Logic truy vấn (phân trang, lọc, trùng tên/slug, xóa danh mục không rỗng) KHÔNG được kiểm ở đây.
describe('Categories API (e2e, service giả)', () => {
  let app: INestApplication<App>;
  const tokens = {} as Record<RoleName, string>;

  const categoriesService = {
    findAll: jest.fn(),
    findAllPublic: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
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
      controllers: [AdminCategoriesController, PublicCategoriesController],
      providers: [
        JwtStrategy,
        RolesGuard,
        // Giống AppModule: JwtAuthGuard bật toàn cục, endpoint công khai đánh dấu @Public()
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: CategoriesService, useValue: categoriesService },
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
    categoriesService.findAll.mockResolvedValue(
      new Paginated([], { page: 1, limit: 10, total: 0 }),
    );
    categoriesService.findAllPublic.mockResolvedValue([]);
    categoriesService.findOne.mockResolvedValue({ id: 1 });
    categoriesService.create.mockResolvedValue({ id: 1 });
    categoriesService.update.mockResolvedValue({ id: 1 });
    categoriesService.remove.mockResolvedValue({ message: 'ok' });
  });

  describe('phân quyền', () => {
    // Mỗi endpoint admin: role nào được phép, và mã thành công tương ứng
    const cases: {
      name: string;
      method: 'get' | 'post' | 'patch' | 'delete';
      path: string;
      body?: object;
      allowed: RoleName[];
      ok: number;
      service: keyof typeof categoriesService;
    }[] = [
      {
        name: 'GET /admin/categories',
        method: 'get',
        path: '/admin/categories',
        allowed: ['ADMIN', 'STAFF'],
        ok: 200,
        service: 'findAll',
      },
      {
        name: 'GET /admin/categories/:id',
        method: 'get',
        path: '/admin/categories/1',
        allowed: ['ADMIN', 'STAFF'],
        ok: 200,
        service: 'findOne',
      },
      {
        name: 'POST /admin/categories',
        method: 'post',
        path: '/admin/categories',
        body: { name: 'Áo thun' },
        allowed: ['ADMIN'],
        ok: 201,
        service: 'create',
      },
      {
        name: 'PATCH /admin/categories/:id',
        method: 'patch',
        path: '/admin/categories/1',
        body: { name: 'Áo phông' },
        allowed: ['ADMIN', 'STAFF'],
        ok: 200,
        service: 'update',
      },
      {
        name: 'DELETE /admin/categories/:id',
        method: 'delete',
        path: '/admin/categories/1',
        allowed: ['ADMIN'],
        ok: 200,
        service: 'remove',
      },
    ];

    it.each(cases)('$name: không token → 401', async (c) => {
      const res = await request(server())
        [c.method](c.path)
        .send(c.body)
        .expect(401);
      expect(res.body).toMatchObject({ success: false, statusCode: 401 });
      expect(categoriesService[c.service]).not.toHaveBeenCalled();
    });

    it.each(cases)('$name: token rác → 401', async (c) => {
      await request(server())
        [c.method](c.path)
        .set('Authorization', 'Bearer abc.def.ghi')
        .send(c.body)
        .expect(401);
      expect(categoriesService[c.service]).not.toHaveBeenCalled();
    });

    for (const role of ['ADMIN', 'STAFF', 'CUSTOMER'] as RoleName[]) {
      it.each(cases)(`$name: ${role}`, async (c) => {
        const allowed = c.allowed.includes(role);
        const res = await as(role)(request(server())[c.method](c.path)).send(
          c.body,
        );

        expect(res.status).toBe(allowed ? c.ok : 403);
        if (allowed) {
          expect(res.body.success).toBe(true);
          expect(categoriesService[c.service]).toHaveBeenCalledTimes(1);
        } else {
          expect(res.body).toMatchObject({
            success: false,
            statusCode: 403,
            message: 'Bạn không có quyền thực hiện thao tác này',
          });
          expect(categoriesService[c.service]).not.toHaveBeenCalled();
        }
      });
    }
  });

  describe('GET /categories (public)', () => {
    it('không cần token, trả mảng phẳng bọc { success, data }', async () => {
      categoriesService.findAllPublic.mockResolvedValue([
        { id: 1, name: 'Áo', slug: 'ao', parentId: null },
        { id: 2, name: 'Áo thun', slug: 'ao-thun', parentId: 1 },
      ]);

      const res = await request(server()).get('/categories').expect(200);

      expect(res.body).toEqual({
        success: true,
        data: [
          { id: 1, name: 'Áo', slug: 'ao', parentId: null },
          { id: 2, name: 'Áo thun', slug: 'ao-thun', parentId: 1 },
        ],
      });
    });

    it('CUSTOMER đã đăng nhập vẫn xem được', async () => {
      await as('CUSTOMER')(request(server()).get('/categories')).expect(200);
    });

    it('không có endpoint ghi công khai (POST/DELETE /categories → 404)', async () => {
      await request(server())
        .post('/categories')
        .send({ name: 'x' })
        .expect(404);
      await request(server()).delete('/categories/1').expect(404);
      expect(categoriesService.create).not.toHaveBeenCalled();
      expect(categoriesService.remove).not.toHaveBeenCalled();
    });
  });

  describe('GET /admin/categories', () => {
    it('bọc { success, data, meta }, ép kiểu query và truyền đủ cho service', async () => {
      categoriesService.findAll.mockResolvedValue(
        new Paginated([{ id: 1, name: 'Áo', productCount: 3 }], {
          page: 2,
          limit: 5,
          total: 11,
        }),
      );

      const res = await as('STAFF')(
        request(server()).get(
          '/admin/categories?page=2&limit=5&parentId=7&sortBy=name&order=asc&q=%20%C3%A1o%20',
        ),
      ).expect(200);

      expect(res.body).toEqual({
        success: true,
        data: [{ id: 1, name: 'Áo', productCount: 3 }],
        meta: { page: 2, limit: 5, total: 11, totalPages: 3 },
      });
      expect(categoriesService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          limit: 5,
          parentId: 7,
          sortBy: 'name',
          order: 'asc',
          q: 'áo', // đã trim
        }),
      );
    });

    it('mặc định page=1, limit=10, sortBy=id, order=desc', async () => {
      await as('ADMIN')(request(server()).get('/admin/categories')).expect(200);

      expect(categoriesService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 10,
          sortBy: 'id',
          order: 'desc',
        }),
      );
    });

    it('query sai → 400 kèm errors theo trường', async () => {
      const res = await as('ADMIN')(
        request(server()).get(
          '/admin/categories?limit=101&page=0&sortBy=createdAt&order=up&parentId=abc',
        ),
      ).expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Dữ liệu không hợp lệ');
      const fields = res.body.errors.map((e: { field: string }) => e.field);
      expect(fields).toEqual(
        expect.arrayContaining([
          'limit',
          'page',
          'sortBy',
          'order',
          'parentId',
        ]),
      );
      expect(res.body.errors).toContainEqual({
        field: 'sortBy',
        message: 'sortBy phải là id hoặc name',
      });
      expect(categoriesService.findAll).not.toHaveBeenCalled();
    });

    it('query lạ bị từ chối (forbidNonWhitelisted)', async () => {
      const res = await as('ADMIN')(
        request(server()).get('/admin/categories?foo=1'),
      ).expect(400);
      expect(res.body.errors).toEqual([
        { field: 'foo', message: 'Trường foo không được phép gửi lên' },
      ]);
    });
  });

  describe('GET /admin/categories/:id', () => {
    it('id không phải số → 400 "ID không hợp lệ"', async () => {
      const res = await as('ADMIN')(
        request(server()).get('/admin/categories/abc'),
      ).expect(400);
      expect(res.body).toEqual({
        success: false,
        statusCode: 400,
        message: 'ID không hợp lệ',
      });
    });

    it('service ném NotFound → 404 đúng dạng lỗi chung', async () => {
      categoriesService.findOne.mockRejectedValue(
        new NotFoundException('Không tìm thấy danh mục với ID #999'),
      );
      const res = await as('STAFF')(
        request(server()).get('/admin/categories/999'),
      ).expect(404);
      expect(res.body).toEqual({
        success: false,
        statusCode: 404,
        message: 'Không tìm thấy danh mục với ID #999',
      });
    });
  });

  describe('POST /admin/categories', () => {
    it('hợp lệ → 201, name được trim, truyền đúng dữ liệu cho service', async () => {
      categoriesService.create.mockResolvedValue({
        id: 5,
        name: 'Áo thun',
        slug: 'ao-thun',
        parentId: 1,
      });

      const res = await as('ADMIN')(request(server()).post('/admin/categories'))
        .send({ name: '  Áo thun  ', parentId: 1, slug: 'ao-thun' })
        .expect(201);

      expect(res.body).toEqual({
        success: true,
        data: { id: 5, name: 'Áo thun', slug: 'ao-thun', parentId: 1 },
      });
      expect(categoriesService.create).toHaveBeenCalledWith({
        name: 'Áo thun',
        parentId: 1,
        slug: 'ao-thun',
      });
    });

    it('thiếu name / name chỉ có khoảng trắng → 400 tiếng Việt', async () => {
      const missing = await as('ADMIN')(
        request(server()).post('/admin/categories'),
      )
        .send({})
        .expect(400);
      expect(missing.body.errors).toContainEqual({
        field: 'name',
        message: 'Tên danh mục không được để trống',
      });

      const blank = await as('ADMIN')(
        request(server()).post('/admin/categories'),
      )
        .send({ name: '   ' })
        .expect(400);
      expect(blank.body.errors).toContainEqual({
        field: 'name',
        message: 'Tên danh mục không được để trống',
      });
      expect(categoriesService.create).not.toHaveBeenCalled();
    });

    it('name > 191 ký tự, slug sai định dạng, parentId < 1 → 400', async () => {
      const res = await as('ADMIN')(request(server()).post('/admin/categories'))
        .send({ name: 'a'.repeat(192), slug: 'Áo Thun', parentId: 0 })
        .expect(400);

      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          {
            field: 'name',
            message: 'Tên danh mục không được vượt quá 191 ký tự',
          },
          {
            field: 'slug',
            message: 'Slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang',
          },
          {
            field: 'parentId',
            message: 'parentId phải lớn hơn hoặc bằng 1',
          },
        ]),
      );
    });

    it('name không phải chuỗi → 400', async () => {
      const res = await as('ADMIN')(request(server()).post('/admin/categories'))
        .send({ name: 123 })
        .expect(400);
      expect(res.body.errors).toContainEqual({
        field: 'name',
        message: 'Tên danh mục phải là chuỗi',
      });
    });

    it('trường lạ bị từ chối (forbidNonWhitelisted)', async () => {
      const res = await as('ADMIN')(request(server()).post('/admin/categories'))
        .send({ name: 'Áo', id: 99 })
        .expect(400);
      expect(res.body.errors).toEqual([
        { field: 'id', message: 'Trường id không được phép gửi lên' },
      ]);
    });

    it('service ném Conflict (trùng tên/slug) → 409', async () => {
      categoriesService.create.mockRejectedValue(
        new ConflictException('Tên danh mục "Áo" đã tồn tại trong cùng cấp'),
      );
      const res = await as('ADMIN')(request(server()).post('/admin/categories'))
        .send({ name: 'Áo' })
        .expect(409);
      expect(res.body).toEqual({
        success: false,
        statusCode: 409,
        message: 'Tên danh mục "Áo" đã tồn tại trong cùng cấp',
      });
    });

    it('service ném BadRequest (danh mục cha không tồn tại) → 400', async () => {
      categoriesService.create.mockRejectedValue(
        new BadRequestException('Danh mục cha với ID #9 không tồn tại'),
      );
      const res = await as('ADMIN')(request(server()).post('/admin/categories'))
        .send({ name: 'Áo', parentId: 9 })
        .expect(400);
      expect(res.body.message).toBe('Danh mục cha với ID #9 không tồn tại');
    });
  });

  describe('PATCH /admin/categories/:id', () => {
    it('chỉ gửi một phần trường → 200; parentId: null (đưa về gốc) được chuyển nguyên cho service', async () => {
      await as('STAFF')(request(server()).patch('/admin/categories/4'))
        .send({ parentId: null })
        .expect(200);

      expect(categoriesService.update).toHaveBeenCalledWith(4, {
        parentId: null,
      });
    });

    it('name rỗng → 400', async () => {
      const res = await as('STAFF')(
        request(server()).patch('/admin/categories/4'),
      )
        .send({ name: '' })
        .expect(400);
      expect(res.body.errors).toContainEqual({
        field: 'name',
        message: 'Tên danh mục không được để trống',
      });
    });

    it('trường ngoài name/parentId/slug (vd id) bị từ chối', async () => {
      const res = await as('STAFF')(
        request(server()).patch('/admin/categories/4'),
      )
        .send({ id: 8 })
        .expect(400);
      expect(res.body.errors).toEqual([
        { field: 'id', message: 'Trường id không được phép gửi lên' },
      ]);
    });

    it('id sai → 400; service ném NotFound → 404; Conflict → 409', async () => {
      await as('STAFF')(request(server()).patch('/admin/categories/x'))
        .send({ name: 'A' })
        .expect(400);

      categoriesService.update.mockRejectedValueOnce(
        new NotFoundException('Không tìm thấy danh mục với ID #4'),
      );
      await as('STAFF')(request(server()).patch('/admin/categories/4'))
        .send({ name: 'A' })
        .expect(404);

      categoriesService.update.mockRejectedValueOnce(
        new ConflictException('Slug "a" đã được sử dụng'),
      );
      const conflict = await as('ADMIN')(
        request(server()).patch('/admin/categories/4'),
      )
        .send({ slug: 'a' })
        .expect(409);
      expect(conflict.body.message).toBe('Slug "a" đã được sử dụng');
    });
  });

  describe('DELETE /admin/categories/:id', () => {
    it('ADMIN xóa được → 200', async () => {
      categoriesService.remove.mockResolvedValue({
        message: 'Xóa danh mục thành công',
      });
      const res = await as('ADMIN')(
        request(server()).delete('/admin/categories/3'),
      ).expect(200);
      expect(res.body).toEqual({
        success: true,
        data: { message: 'Xóa danh mục thành công' },
      });
      expect(categoriesService.remove).toHaveBeenCalledWith(3);
    });

    it('danh mục còn sản phẩm/danh mục con (service ném Conflict) → 409', async () => {
      categoriesService.remove.mockRejectedValue(
        new ConflictException('Không thể xóa danh mục đang có 2 sản phẩm.'),
      );
      const res = await as('ADMIN')(
        request(server()).delete('/admin/categories/3'),
      ).expect(409);
      expect(res.body).toMatchObject({ success: false, statusCode: 409 });
    });

    it('id sai → 400', async () => {
      await as('ADMIN')(
        request(server()).delete('/admin/categories/abc'),
      ).expect(400);
    });
  });
});
