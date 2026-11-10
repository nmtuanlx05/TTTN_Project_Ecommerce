// res.body của supertest có kiểu any; test chỉ đọc để so sánh nên tắt các rule unsafe-* cho file này.
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Global, INestApplication, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD, NestFactory } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { v2 as cloudinary } from 'cloudinary';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from '../src/app.setup';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { PrismaService } from '../src/prisma/prisma.service';
import { UploadModule } from '../src/uploads/upload.module';
import { UsersService } from '../src/users/users.service';

// @nestjs/config chỉ có bản ESM nên Jest không nạp được; spec mock lại. Prisma cũng mock vì không dùng DB.
jest.mock('@nestjs/config', () => ({ ConfigService: class {} }));
jest.mock('../src/prisma/prisma.service', () => ({ PrismaService: class {} }));

// SDK Cloudinary GIẢ (mock cả module): không gọi mạng. Hành vi thật của SDK chưa được kiểm chứng (xem docs/cloudinary-setup.md).
jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: { upload_stream: jest.fn(), destroy: jest.fn() },
  },
}));
// Lấy lại chính đối tượng mock mà StorageModule (createStorage) đang dùng
const sdk = cloudinary as unknown as {
  config: jest.Mock;
  uploader: { upload_stream: jest.Mock; destroy: jest.Mock };
};

const ACCESS_SECRET = 'test-access-secret';
const MB = 1024 * 1024;
type RoleName = 'ADMIN' | 'STAFF' | 'CUSTOMER';

// Ảnh giả có tiêu đề hợp lệ (đọc được kích thước) + phần thân tùy ý
function png(width = 40, height = 30, size = 80) {
  const b = Buffer.alloc(Math.max(size, 33), 1);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
  b.writeUInt32BE(13, 8);
  b.write('IHDR', 12, 'ascii');
  b.writeUInt32BE(width, 16);
  b.writeUInt32BE(height, 20);
  return b;
}
function jpeg(width = 40, height = 30) {
  const b = Buffer.alloc(40, 1);
  b.set([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08]);
  b.writeUInt16BE(height, 7);
  b.writeUInt16BE(width, 9);
  return b;
}
function webp(width = 40, height = 30) {
  const b = Buffer.alloc(40, 1);
  b.write('RIFF', 0, 'ascii');
  b.write('WEBP', 8, 'ascii');
  b.write('VP8X', 12, 'ascii');
  b.writeUIntLE(width - 1, 24, 3);
  b.writeUIntLE(height - 1, 27, 3);
  return b;
}

// Dựng app với UploadModule/MediaModule/StorageModule THẬT (Multer thật, ServeStatic thật). Chỉ giả: ConfigService, UsersService
// (JwtStrategy), PrismaService (bảng media_assets trong bộ nhớ) và SDK Cloudinary.
async function buildApp(env: Record<string, string>) {
  const assets: Record<string, any>[] = [];
  const prisma = {
    mediaAsset: {
      count: jest.fn(
        (args: { where: { uploadedById: number; kind: string } }) =>
          Promise.resolve(
            assets.filter(
              (a) =>
                a.uploadedById === args.where.uploadedById &&
                a.kind === args.where.kind,
            ).length,
          ),
      ),
      create: jest.fn(({ data }: { data: Record<string, any> }) => {
        const row = { id: assets.length + 1, ...data };
        assets.push(row);
        return Promise.resolve({ id: row.id });
      }),
    },
  };
  @Global()
  @Module({
    providers: [
      {
        provide: ConfigService,
        useValue: {
          get: (key: string) => env[key],
          getOrThrow: () => ACCESS_SECRET,
        },
      },
      { provide: PrismaService, useValue: prisma },
    ],
    exports: [ConfigService, PrismaService],
  })
  class FakeGlobalModule {}

  const fakeUsers: Record<number, { id: number; role: RoleName }> = {
    1: { id: 1, role: 'ADMIN' },
    2: { id: 2, role: 'STAFF' },
    3: { id: 3, role: 'CUSTOMER' },
  };
  @Module({
    imports: [
      FakeGlobalModule,
      PassportModule,
      JwtModule.register({}),
      UploadModule,
    ],
    providers: [
      JwtStrategy,
      // Giống AppModule: JwtAuthGuard bật toàn cục
      { provide: APP_GUARD, useClass: JwtAuthGuard },
      {
        provide: UsersService,
        useValue: {
          findForAuth: (id: number) =>
            Promise.resolve(
              fakeUsers[id] ? { ...fakeUsers[id], isActive: true } : null,
            ),
        },
      },
    ],
  })
  class TestAppModule {}

  // NestFactory (như main.ts): ServeStaticModule chọn loader theo HTTP adapter nên cần app thật mới phục vụ file tĩnh.
  const app = await NestFactory.create<INestApplication<App>>(TestAppModule, {
    logger: false,
  });
  configureApp(app);
  await app.init();

  const jwt = app.get(JwtService);
  const tokens = {} as Record<RoleName, string>;
  for (const [id, user] of Object.entries(fakeUsers)) {
    tokens[user.role] = jwt.sign(
      { sub: Number(id), role: user.role },
      { secret: ACCESS_SECRET },
    );
  }
  const server = () => app.getHttpServer();
  const upload = (
    path: '/uploads/products' | '/uploads/avatars',
    role: RoleName | undefined,
    file: Buffer,
    filename = 'a.png',
    contentType = 'image/png',
  ) => {
    const req = request(server()).post(path);
    return (
      role ? req.set('Authorization', `Bearer ${tokens[role]}`) : req
    ).attach('file', file, { filename, contentType });
  };
  return { app, assets, prisma, tokens, server, upload };
}

const listFiles = (dir: string, prefix = ''): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? listFiles(join(dir, entry.name), `${prefix}${entry.name}/`)
      : [`${prefix}${entry.name}`],
  );

// Chế độ Cloudinary với SDK giả
describe('Uploads API (e2e, driver Cloudinary với SDK giả)', () => {
  let ctx: Awaited<ReturnType<typeof buildApp>>;
  let uploadDir: string;
  const env = () => ({
    STORAGE_DRIVER: 'cloudinary',
    CLOUDINARY_CLOUD_NAME: 'demo',
    CLOUDINARY_API_KEY: 'KEY-123',
    CLOUDINARY_API_SECRET: 'SECRET-456',
    CLOUDINARY_FOLDER_PREFIX: 'mono/test',
    UPLOAD_DIR: uploadDir,
    APP_PUBLIC_URL: 'http://localhost:3000',
    MEDIA_QUOTA_AVATARS_PER_DAY: '3',
  });

  beforeAll(async () => {
    uploadDir = mkdtempSync(join(tmpdir(), 'uploads-e2e-cld-'));
    ctx = await buildApp(env());
  });
  afterAll(async () => {
    await ctx.app.close();
    rmSync(uploadDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    ctx.assets.length = 0;
    sdk.uploader.upload_stream.mockReset();
    sdk.uploader.destroy.mockReset();
    sdk.uploader.destroy.mockResolvedValue({ result: 'ok' });
    // Mặc định upload thành công: trả metadata theo public_id nhận được
    sdk.uploader.upload_stream.mockImplementation(
      (
        options: { public_id: string },
        cb: (e: undefined, r: Record<string, unknown>) => void,
      ) => ({
        end: () =>
          cb(undefined, {
            public_id: options.public_id,
            secure_url: `https://res.cloudinary.com/demo/image/upload/v1/${options.public_id}.png`,
            width: 40,
            height: 30,
            format: 'png',
            bytes: 80,
          }),
      }),
    );
  });

  it('SDK được cấu hình từ biến môi trường (secure:true) và không ghi gì ra ổ đĩa', async () => {
    expect(sdk.config).toHaveBeenCalledWith({
      cloud_name: 'demo',
      api_key: 'KEY-123',
      api_secret: 'SECRET-456',
      secure: true,
    });
    await ctx.upload('/uploads/products', 'ADMIN', png()).expect(201);
    // Không thư mục tạm, không file nào: ảnh đi thẳng bằng stream
    expect(listFiles(uploadDir)).toEqual([]);
  });

  describe('phân quyền', () => {
    it.each(['/uploads/products', '/uploads/avatars'] as const)(
      'không token -> 401: POST %s, không gọi Cloudinary',
      async (path) => {
        const res = await ctx.upload(path, undefined, png());
        expect(res.status).toBe(401);
        expect(sdk.uploader.upload_stream).not.toHaveBeenCalled();
      },
    );

    it('CUSTOMER gọi /uploads/products -> 403, không gọi Cloudinary', async () => {
      const res = await ctx.upload('/uploads/products', 'CUSTOMER', png());
      expect(res.status).toBe(403);
      expect(res.body.message).toBe(
        'Bạn không có quyền thực hiện thao tác này',
      );
      expect(sdk.uploader.upload_stream).not.toHaveBeenCalled();
    });

    it.each(['ADMIN', 'STAFF'] as const)(
      '%s tải ảnh sản phẩm -> 201',
      async (role) => {
        expect(
          (await ctx.upload('/uploads/products', role, png())).status,
        ).toBe(201);
      },
    );

    it.each(['ADMIN', 'STAFF', 'CUSTOMER'] as const)(
      '%s tải avatar -> 201',
      async (role) => {
        expect((await ctx.upload('/uploads/avatars', role, png())).status).toBe(
          201,
        );
      },
    );
  });

  describe('thành công', () => {
    it('trả { assetId, url, publicId, width, height, format, bytes } và ghi media_assets với người tải', async () => {
      const file = png(40, 30, 200);
      const res = await ctx.upload('/uploads/products', 'STAFF', file);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({
        assetId: 1,
        url: expect.stringMatching(
          /^https:\/\/res\.cloudinary\.com\/demo\/image\/upload\/v1\/mono\/test\/products\/[0-9a-f-]{36}\.png$/,
        ),
        publicId: expect.stringMatching(
          /^mono\/test\/products\/[0-9a-f-]{36}$/,
        ),
        width: 40,
        height: 30,
        format: 'png',
        bytes: 80,
      });
      expect(ctx.assets[0]).toMatchObject({
        kind: 'PRODUCT',
        uploadedById: 2,
        publicId: res.body.data.publicId,
      });
      // Đẩy đúng buffer, không ghi đè, chỉ định dạng cho phép
      const [options] = sdk.uploader.upload_stream.mock.calls[0];
      expect(options).toMatchObject({
        overwrite: false,
        resource_type: 'image',
        allowed_formats: ['jpg', 'png', 'webp'],
      });
    });

    it('avatar vào thư mục avatars; thư mục theo CLOUDINARY_FOLDER_PREFIX', async () => {
      const res = await ctx.upload(
        '/uploads/avatars',
        'CUSTOMER',
        jpeg(),
        'a.jpg',
        'image/jpeg',
      );
      expect(res.status).toBe(201);
      expect(res.body.data.publicId).toMatch(/^mono\/test\/avatars\//);
      expect(ctx.assets[0].kind).toBe('AVATAR');
    });

    it('cho phép đúng giới hạn dung lượng (5 MB / 2 MB)', async () => {
      expect(
        (await ctx.upload('/uploads/products', 'STAFF', png(40, 30, 5 * MB)))
          .status,
      ).toBe(201);
      expect(
        (await ctx.upload('/uploads/avatars', 'STAFF', png(40, 30, 2 * MB)))
          .status,
      ).toBe(201);
    });
  });

  describe('lỗi (không gọi Cloudinary, không ghi DB)', () => {
    const expectNothing = () => {
      expect(sdk.uploader.upload_stream).not.toHaveBeenCalled();
      expect(ctx.assets).toEqual([]);
    };

    it('không gửi file -> 400', async () => {
      const res = await request(ctx.server())
        .post('/uploads/products')
        .set('Authorization', `Bearer ${ctx.tokens.ADMIN}`);
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Vui lòng chọn file ảnh (trường "file")');
      expectNothing();
    });

    it('có trường text kèm theo / sai tên trường -> 400', async () => {
      const auth = { Authorization: `Bearer ${ctx.tokens.ADMIN}` };
      const withField = await request(ctx.server())
        .post('/uploads/products')
        .set(auth)
        .field('name', 'abc')
        .attach('file', png(), { filename: 'a.png', contentType: 'image/png' });
      expect(withField.status).toBe(400);
      const wrongName = await request(ctx.server())
        .post('/uploads/products')
        .set(auth)
        .attach('image', png(), {
          filename: 'a.png',
          contentType: 'image/png',
        });
      expect(wrongName.status).toBe(400);
      expectNothing();
    });

    it('products vượt 5 MB -> 413; avatars vượt 2 MB -> 413', async () => {
      const big = await ctx.upload(
        '/uploads/products',
        'ADMIN',
        png(40, 30, 5 * MB + 1),
      );
      expect(big.status).toBe(413);
      expect(big.body.message).toBe(
        'File vượt quá dung lượng cho phép (tối đa 5 MB)',
      );
      const bigAvatar = await ctx.upload(
        '/uploads/avatars',
        'CUSTOMER',
        png(40, 30, 2 * MB + 1),
      );
      expect(bigAvatar.status).toBe(413);
      expect(bigAvatar.body.message).toBe(
        'File vượt quá dung lượng cho phép (tối đa 2 MB)',
      );
      expectNothing();
    });

    it.each([
      ['PDF', Buffer.from('%PDF-1.4'), 'a.pdf', 'application/pdf'],
      ['GIF', Buffer.from('GIF89a......'), 'a.gif', 'image/gif'],
      ['SVG', Buffer.from('<svg/>'), 'a.svg', 'image/svg+xml'],
    ])('sai loại (%s) -> 415', async (_n, file, name, mime) => {
      const res = await ctx.upload(
        '/uploads/products',
        'ADMIN',
        file,
        name,
        mime,
      );
      expect(res.status).toBe(415);
      expect(res.body.message).toBe('Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP');
      expectNothing();
    });

    it.each([
      ['văn bản', Buffer.from('<?php echo 1; ?>')],
      ['HTML', Buffer.from('<html><script>alert(1)</script></html>')],
      ['file rỗng', Buffer.alloc(0)],
      [
        'RIFF nhưng là WAV',
        Buffer.concat([
          Buffer.from('RIFF'),
          Buffer.alloc(4),
          Buffer.from('WAVE'),
        ]),
      ],
    ])(
      'file giả mạo (%s, đuôi .png, khai image/png) -> 415',
      async (_n, fake) => {
        const res = await ctx.upload(
          '/uploads/products',
          'ADMIN',
          fake,
          'avatar.png',
        );
        expect(res.status).toBe(415);
        expectNothing();
      },
    );

    it('chữ ký đúng nhưng ảnh cắt cụt (không đọc được kích thước) -> 415', async () => {
      const res = await ctx.upload(
        '/uploads/products',
        'ADMIN',
        png().subarray(0, 14),
      );
      expect(res.status).toBe(415);
      expectNothing();
    });

    it('quá nhiều điểm ảnh (vd 8000x8000 = 64 MP) -> 413', async () => {
      const res = await ctx.upload(
        '/uploads/products',
        'ADMIN',
        png(8000, 8000),
      );
      expect(res.status).toBe(413);
      expect(res.body.message).toMatch(/điểm ảnh/);
      expectNothing();
    });
  });

  describe('hạn mức theo người dùng', () => {
    it('vượt MEDIA_QUOTA_AVATARS_PER_DAY (=3) -> 429 UPLOAD_QUOTA_EXCEEDED; người khác không bị ảnh hưởng', async () => {
      for (let i = 0; i < 3; i++) {
        expect(
          (await ctx.upload('/uploads/avatars', 'CUSTOMER', png())).status,
        ).toBe(201);
      }
      const res = await ctx.upload('/uploads/avatars', 'CUSTOMER', png());
      expect(res.status).toBe(429);
      expect(res.body).toMatchObject({ code: 'UPLOAD_QUOTA_EXCEEDED' });
      expect(sdk.uploader.upload_stream).toHaveBeenCalledTimes(3);

      expect(
        (await ctx.upload('/uploads/avatars', 'STAFF', png())).status,
      ).toBe(201);
    });
  });

  describe('lỗi phía Cloudinary / DB', () => {
    it('Cloudinary lỗi -> 502 STORAGE_UPLOAD_FAILED, không ghi media_assets, không lộ chi tiết', async () => {
      sdk.uploader.upload_stream.mockImplementation(
        (_o: unknown, cb: (e: object) => void) => ({
          end: () =>
            cb({ message: 'Invalid Signature SECRET-456', http_code: 401 }),
        }),
      );
      const res = await ctx.upload('/uploads/products', 'ADMIN', png());
      expect(res.status).toBe(502);
      expect(res.body.code).toBe('STORAGE_UPLOAD_FAILED');
      expect(JSON.stringify(res.body)).not.toContain('SECRET-456');
      expect(ctx.assets).toEqual([]);
    });

    it('ghi DB lỗi sau khi đã tải lên -> xóa ngay ảnh vừa tải (destroy) và trả 500 chung', async () => {
      ctx.prisma.mediaAsset.create.mockRejectedValueOnce(new Error('db down'));
      const res = await ctx.upload('/uploads/products', 'ADMIN', png());
      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Lỗi hệ thống, vui lòng thử lại sau');
      expect(sdk.uploader.destroy).toHaveBeenCalledTimes(1);
      expect(sdk.uploader.destroy.mock.calls[0][0]).toMatch(
        /^mono\/test\/products\//,
      );
    });
  });

  describe('ServeStatic vẫn phục vụ ảnh cũ trên đĩa cho tới khi chuyển xong', () => {
    it('GET /uploads/<file cũ> -> 200; không có file -> 404 theo format lỗi chung', async () => {
      mkdirSync(join(uploadDir, 'products'), { recursive: true });
      writeFileSync(join(uploadDir, 'products', 'old.png'), png());
      expect(
        (await request(ctx.server()).get('/uploads/products/old.png')).status,
      ).toBe(200);
      const missing = await request(ctx.server()).get(
        '/uploads/products/khong-co.png',
      );
      expect(missing.status).toBe(404);
      expect(missing.body.success).toBe(false);
    });
  });
});

// Thiếu cấu hình: app vẫn chạy
describe('Uploads API (e2e, thiếu cấu hình Cloudinary)', () => {
  let ctx: Awaited<ReturnType<typeof buildApp>>;
  beforeAll(async () => {
    sdk.uploader.upload_stream.mockReset();
    ctx = await buildApp({
      STORAGE_DRIVER: 'cloudinary',
      CLOUDINARY_CLOUD_NAME: 'demo',
    });
  });
  afterAll(() => ctx.app.close());

  it('app khởi động được; tải ảnh -> 503 STORAGE_NOT_CONFIGURED, không gọi SDK, không lộ giá trị cấu hình', async () => {
    const res = await ctx.upload('/uploads/products', 'ADMIN', png());
    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      success: false,
      statusCode: 503,
      code: 'STORAGE_NOT_CONFIGURED',
      message:
        'Chức năng tải ảnh chưa được cấu hình trên máy chủ, vui lòng liên hệ quản trị viên',
    });
    expect(sdk.uploader.upload_stream).not.toHaveBeenCalled();
  });

  it('quyền vẫn được kiểm trước: không token -> 401, CUSTOMER tải ảnh sản phẩm -> 403', async () => {
    expect(
      (await ctx.upload('/uploads/products', undefined, png())).status,
    ).toBe(401);
    expect(
      (await ctx.upload('/uploads/products', 'CUSTOMER', png())).status,
    ).toBe(403);
  });
});

// Driver local: chỉ cho test/CI/dev offline
describe('Uploads API (e2e, driver local)', () => {
  let ctx: Awaited<ReturnType<typeof buildApp>>;
  let uploadDir: string;

  beforeAll(async () => {
    uploadDir = mkdtempSync(join(tmpdir(), 'uploads-e2e-local-'));
    ctx = await buildApp({
      STORAGE_DRIVER: 'local',
      UPLOAD_DIR: uploadDir,
      APP_PUBLIC_URL: 'http://localhost:3000',
    });
  });
  afterAll(async () => {
    await ctx.app.close();
    rmSync(uploadDir, { recursive: true, force: true });
  });
  beforeEach(() => {
    ctx.assets.length = 0;
    sdk.uploader.upload_stream.mockReset();
    // Mỗi test bắt đầu với thư mục upload trống
    rmSync(uploadDir, { recursive: true, force: true });
    mkdirSync(uploadDir, { recursive: true });
  });

  it('ghi file <thư mục>/<uuid>.<đuôi> (đuôi theo nội dung thật), trả URL cục bộ, không đụng Cloudinary', async () => {
    const res = await ctx.upload(
      '/uploads/avatars',
      'CUSTOMER',
      webp(),
      '../../x.exe',
      'image/webp',
    );

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      assetId: 1,
      url: expect.stringMatching(
        /^http:\/\/localhost:3000\/uploads\/avatars\/[0-9a-f-]{36}\.webp$/,
      ),
      publicId: expect.stringMatching(/^avatars\/[0-9a-f-]{36}$/),
      width: 40,
      height: 30,
      format: 'webp',
    });
    expect(listFiles(uploadDir)).toEqual([
      `avatars/${new URL(res.body.data.url as string).pathname.split('/').pop()}`,
    ]);
    expect(sdk.uploader.upload_stream).not.toHaveBeenCalled();
  });

  it('mở URL trả về (không cần token): đúng nội dung và header cho <img> khác origin', async () => {
    const body = png(40, 30, 200);
    const up = await ctx.upload('/uploads/products', 'ADMIN', body);
    const res = await request(ctx.server()).get(
      new URL(up.body.data.url as string).pathname,
    );
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/png');
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['cache-control']).toContain('immutable');
    expect(Buffer.compare(res.body as Buffer, body)).toBe(0);
  });

  it('kiểm chữ ký byte như driver Cloudinary: file giả mạo -> 415 và không để lại file', async () => {
    const res = await ctx.upload(
      '/uploads/products',
      'ADMIN',
      Buffer.from('<?php ?>'),
      'a.png',
    );
    expect(res.status).toBe(415);
    expect(listFiles(uploadDir)).toEqual([]);
  });

  it('thư mục upload bị xóa khi server đang chạy: upload vẫn thành công', async () => {
    rmSync(uploadDir, { recursive: true, force: true });
    const res = await ctx.upload(
      '/uploads/products',
      'STAFF',
      jpeg(),
      'a.jpg',
      'image/jpeg',
    );
    expect(res.status).toBe(201);
    expect(listFiles(uploadDir)).toHaveLength(1);
  });

  it.each([
    '/uploads/products/khong-co.png',
    '/uploads/',
    '/uploads/products',
    '/uploads/.tmp/abc',
  ])('GET %s -> 404 theo format lỗi chung', async (path) => {
    const res = await request(ctx.server()).get(path);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('từ chối dotfiles và không đọc được file ngoài thư mục upload bằng ../', async () => {
    mkdirSync(join(uploadDir, 'products'), { recursive: true });
    writeFileSync(join(uploadDir, 'products', '.secret.png'), 'x');
    expect(
      (await request(ctx.server()).get('/uploads/products/.secret.png')).status,
    ).toBe(404);

    const outside = join(uploadDir, '..', 'uploads-e2e-outside.txt');
    writeFileSync(outside, 'secret');
    try {
      for (const path of [
        '/uploads/../uploads-e2e-outside.txt',
        '/uploads/products/..%2f..%2fuploads-e2e-outside.txt',
        '/uploads/%2e%2e/uploads-e2e-outside.txt',
      ]) {
        const res = await request(ctx.server()).get(path);
        expect(res.status).not.toBe(200);
        expect(res.text ?? '').not.toContain('secret');
      }
    } finally {
      rmSync(outside, { force: true });
    }
  });
});
