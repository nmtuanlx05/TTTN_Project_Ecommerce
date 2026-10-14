import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from '../src/app.setup';
import { Paginated } from '../src/common/paginated';
import { UsersController } from '../src/users/users.controller';
import { UsersService } from '../src/users/users.service';

// @nestjs/config và @nestjs/mapped-types chỉ có bản ESM nên Jest không nạp được; spec mock chúng lại.
jest.mock('../src/prisma/prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../src/users/dto/update-user.dto', () => ({
  UpdateUserDto: class {},
}));

// Dùng UsersService giả (không cần DB) để kiểm tra phần nối ở tầng toàn cục:
// ValidationPipe, ParseIdPipe, ResponseInterceptor, AllExceptionsFilter.
describe('Users API (e2e, service giả)', () => {
  let app: INestApplication<App>;
  const usersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => jest.clearAllMocks());

  it('GET /users: bọc { success, data, meta }, ép kiểu query và loại password lồng nhau', async () => {
    usersService.findAll.mockResolvedValue(
      new Paginated([{ id: 1, password: 'hash' }], {
        page: 2,
        limit: 5,
        total: 11,
      }),
    );

    const res = await request(app.getHttpServer())
      .get(
        '/users?page=2&limit=5&isActive=false&role=STAFF&sortBy=name&order=asc&q=a',
      )
      .expect(200);

    expect(res.body).toEqual({
      success: true,
      data: [{ id: 1 }],
      meta: { page: 2, limit: 5, total: 11, totalPages: 3 },
    });
    expect(usersService.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
        limit: 5,
        isActive: false,
        role: 'STAFF',
        sortBy: 'name',
        order: 'asc',
        q: 'a',
      }),
    );
  });

  it('GET /users?limit=101&sortBy=x → 400 kèm errors theo trường', async () => {
    const res = await request(app.getHttpServer())
      .get('/users?limit=101&sortBy=x')
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.statusCode).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        { field: 'limit', message: 'limit không được vượt quá 100' },
        {
          field: 'sortBy',
          message: 'sortBy phải là createdAt, name hoặc email',
        },
      ]),
    );
  });

  it('GET /users/abc → 400 "ID không hợp lệ"', async () => {
    const res = await request(app.getHttpServer())
      .get('/users/abc')
      .expect(400);

    expect(res.body).toEqual({
      success: false,
      statusCode: 400,
      message: 'ID không hợp lệ',
    });
    expect(usersService.findOne).not.toHaveBeenCalled();
  });

  it('POST /users: dữ liệu sai → 400, errors theo từng trường tiếng Việt', async () => {
    const res = await request(app.getHttpServer())
      .post('/users')
      .send({ email: 'abc', password: '123', phone: '12345', role: 'BOSS' })
      .expect(400);

    const fields = res.body.errors.map((e: { field: string }) => e.field);
    expect(fields).toEqual(
      expect.arrayContaining(['email', 'password', 'name', 'phone', 'role']),
    );
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        { field: 'email', message: 'Email không đúng định dạng' },
        { field: 'password', message: 'Mật khẩu phải có ít nhất 6 ký tự' },
      ]),
    );
    expect(usersService.create).not.toHaveBeenCalled();
  });

  it('POST /users: trường lạ bị từ chối (forbidNonWhitelisted)', async () => {
    const res = await request(app.getHttpServer())
      .post('/users')
      .send({ email: 'a@gmail.com', password: '12345678', name: 'A', foo: 1 })
      .expect(400);

    expect(res.body.errors).toEqual([
      { field: 'foo', message: 'Trường foo không được phép gửi lên' },
    ]);
  });

  it('POST /users: hợp lệ → 201 { success, data }', async () => {
    usersService.create.mockResolvedValue({ id: 1, email: 'a@gmail.com' });

    const res = await request(app.getHttpServer())
      .post('/users')
      .send({
        email: 'a@gmail.com',
        password: '12345678',
        name: 'Nguyen A',
        phone: '0912345678',
        role: 'STAFF',
      })
      .expect(201);

    expect(res.body).toEqual({
      success: true,
      data: { id: 1, email: 'a@gmail.com' },
    });
  });

  it('PATCH /users/:id/status: isActive không phải boolean → 400', async () => {
    const res = await request(app.getHttpServer())
      .patch('/users/1/status')
      .send({ isActive: 'khoa' })
      .expect(400);

    expect(res.body.errors).toEqual([
      { field: 'isActive', message: 'isActive phải là true hoặc false' },
    ]);
  });

  it('PATCH /users/:id/status: hợp lệ → 200', async () => {
    usersService.updateStatus.mockResolvedValue({ id: 1, isActive: false });

    const res = await request(app.getHttpServer())
      .patch('/users/1/status')
      .send({ isActive: false })
      .expect(200);

    expect(res.body).toEqual({
      success: true,
      data: { id: 1, isActive: false },
    });
    expect(usersService.updateStatus).toHaveBeenCalledWith(1, {
      isActive: false,
    });
  });

  it('DELETE /users/:id không còn tồn tại → 404', async () => {
    const res = await request(app.getHttpServer())
      .delete('/users/1')
      .expect(404);

    expect(res.body.success).toBe(false);
  });
});
