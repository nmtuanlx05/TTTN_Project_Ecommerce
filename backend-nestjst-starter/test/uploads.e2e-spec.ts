// res.body của supertest có kiểu any; test chỉ đọc để so sánh nên tắt các rule unsafe-* cho file này.
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Global, INestApplication, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD, NestFactory } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from '../src/app.setup';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { UploadModule } from '../src/uploads/upload.module';
import { UsersService } from '../src/users/users.service';

// @nestjs/config chỉ có bản ESM nên Jest không nạp được; spec mock lại. Prisma cũng mock vì không dùng DB.
jest.mock('@nestjs/config', () => ({ ConfigService: class {} }));
jest.mock('../src/prisma/prisma.service', () => ({ PrismaService: class {} }));

const ACCESS_SECRET = 'test-access-secret';
const MB = 1024 * 1024;
type RoleName = 'ADMIN' | 'STAFF' | 'CUSTOMER';

const PNG_HEAD = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_HEAD = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
const WEBP_HEAD = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([0x24, 0, 0, 0]),
  Buffer.from('WEBP'),
]);

// Ảnh giả: chữ ký hợp lệ + phần thân tùy ý (chỉ cần header để vượt kiểm tra)
const image = (head: Buffer, size = 64) =>
  Buffer.concat([head, Buffer.alloc(Math.max(0, size - head.length), 1)]);

// Dùng UploadModule thật (Multer thật, ServeStatic thật, ghi file thật vào thư mục tạm của test); không DB, không migration.
// ConfigService và UsersService là bản giả, JwtStrategy/JwtAuthGuard/RolesGuard là bản thật.
describe('Uploads API (e2e)', () => {
  let app: INestApplication<App>;
  let uploadDir: string;
  const tokens = {} as Record<RoleName, string>;

  const server = () => app.getHttpServer();
  const as = (role?: RoleName) => (req: request.Test) =>
    role ? req.set('Authorization', `Bearer ${tokens[role]}`) : req;

  // Mọi file thường còn lại dưới thư mục upload (kể cả .tmp), dạng đường dẫn tương đối
  const listFiles = (dir = uploadDir, prefix = ''): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory()
        ? listFiles(join(dir, entry.name), `${prefix}${entry.name}/`)
        : [`${prefix}${entry.name}`],
    );

  const upload = (
    path: '/uploads/products' | '/uploads/avatars',
    role: RoleName | undefined,
    file: Buffer,
    filename = 'a.png',
    contentType = 'image/png',
  ) =>
    as(role)(request(server()).post(path)).attach('file', file, {
      filename,
      contentType,
    });

  beforeAll(async () => {
    uploadDir = mkdtempSync(join(tmpdir(), 'uploads-e2e-'));

    const env: Record<string, string> = {
      UPLOAD_DIR: uploadDir,
      APP_PUBLIC_URL: 'http://localhost:3000',
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
      ],
      exports: [ConfigService],
    })
    class FakeConfigModule {}

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

    @Module({
      imports: [
        FakeConfigModule,
        PassportModule,
        JwtModule.register({}),
        UploadModule,
      ],
      providers: [
        JwtStrategy,
        // Giống AppModule: JwtAuthGuard bật toàn cục
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: UsersService, useValue: usersService },
      ],
    })
    class TestAppModule {}

    // Dùng NestFactory (như main.ts) thay vì Test.createTestingModule: ServeStaticModule chọn loader theo HTTP adapter
    // nên cần app thật thì mới thực sự phục vụ file tĩnh.
    app = await NestFactory.create<INestApplication<App>>(TestAppModule, {
      logger: false,
    });
    configureApp(app);
    await app.init();

    const jwt = app.get(JwtService);
    for (const [id, user] of Object.entries(fakeUsers)) {
      tokens[user.role] = jwt.sign(
        { sub: Number(id), role: user.role },
        { secret: ACCESS_SECRET },
      );
    }
  });

  afterAll(async () => {
    await app.close();
    rmSync(uploadDir, { recursive: true, force: true });
  });

  // Dọn file của test trước, giữ nguyên các thư mục
  beforeEach(() => {
    for (const file of listFiles()) {
      rmSync(join(uploadDir, file));
    }
  });

  describe('phân quyền', () => {
    it.each(['/uploads/products', '/uploads/avatars'] as const)(
      'không token -> 401: POST %s',
      async (path) => {
        const res = await upload(path, undefined, image(PNG_HEAD));
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(listFiles()).toEqual([]);
      },
    );

    it('CUSTOMER gọi /uploads/products -> 403 và không ghi file', async () => {
      const res = await upload(
        '/uploads/products',
        'CUSTOMER',
        image(PNG_HEAD),
      );
      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        success: false,
        statusCode: 403,
        message: 'Bạn không có quyền thực hiện thao tác này',
      });
      expect(listFiles()).toEqual([]);
    });

    it.each(['ADMIN', 'STAFF'] as const)(
      '%s gọi /uploads/products -> 201',
      async (role) => {
        const res = await upload('/uploads/products', role, image(PNG_HEAD));
        expect(res.status).toBe(201);
      },
    );

    it.each(['ADMIN', 'STAFF', 'CUSTOMER'] as const)(
      '%s gọi /uploads/avatars -> 201',
      async (role) => {
        const res = await upload('/uploads/avatars', role, image(PNG_HEAD));
        expect(res.status).toBe(201);
      },
    );
  });

  describe('thành công', () => {
    it('trả { success, data: { url } } và lưu file đúng chỗ', async () => {
      const res = await upload('/uploads/products', 'ADMIN', image(PNG_HEAD));

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(Object.keys(res.body.data as object)).toEqual(['url']);
      expect(res.body.data.url).toMatch(
        /^http:\/\/localhost:3000\/uploads\/products\/[0-9a-f-]{36}\.png$/,
      );
      expect(res.body.data.url.length).toBeLessThanOrEqual(191);

      const files = listFiles();
      expect(files).toHaveLength(1);
      expect(res.body.data.url).toBe(
        `http://localhost:3000/uploads/${files[0]}`,
      );
    });

    it.each([
      ['jpg', JPEG_HEAD, 'image/jpeg'],
      ['png', PNG_HEAD, 'image/png'],
      ['webp', WEBP_HEAD, 'image/webp'],
    ] as const)(
      'đuôi file lấy theo nội dung thật (%s)',
      async (ext, head, mime) => {
        // Tên gốc cố tình khác: không được dùng làm tên/đuôi file lưu
        const res = await upload(
          '/uploads/avatars',
          'CUSTOMER',
          image(head),
          '../../x.exe',
          mime,
        );
        expect(res.status).toBe(201);
        expect(res.body.data.url).toMatch(new RegExp(`\\.${ext}$`));
        expect(res.body.data.url).not.toContain('exe');
      },
    );

    it('cho phép đúng giới hạn dung lượng', async () => {
      const res = await upload(
        '/uploads/products',
        'STAFF',
        image(PNG_HEAD, 5 * MB),
      );
      expect(res.status).toBe(201);
    });
  });

  describe('phục vụ file tĩnh (không cần token)', () => {
    it('mở URL trả về: đúng nội dung, content-type và header cho <img> khác origin', async () => {
      const body = image(PNG_HEAD, 200);
      const up = await upload('/uploads/products', 'ADMIN', body);
      const path = new URL(up.body.data.url as string).pathname;

      const res = await request(server()).get(path);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('image/png');
      expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['cache-control']).toContain('immutable');
      expect(Buffer.compare(res.body as Buffer, body)).toBe(0);
    });

    it.each([
      '/uploads/products/khong-co.png',
      '/uploads/',
      '/uploads/products',
      '/uploads/products/',
      '/uploads/.tmp/abc',
    ])('GET %s -> 404 theo format lỗi chung', async (path) => {
      const res = await request(server()).get(path);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(404);
    });

    it('từ chối file bắt đầu bằng dấu chấm (dotfiles)', async () => {
      writeFileSync(join(uploadDir, 'products', '.secret.png'), 'x');
      const res = await request(server()).get('/uploads/products/.secret.png');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('không đọc được file ngoài thư mục upload bằng ../', async () => {
      const outside = join(uploadDir, '..', 'uploads-e2e-outside.txt');
      writeFileSync(outside, 'secret');
      try {
        for (const path of [
          '/uploads/../uploads-e2e-outside.txt',
          '/uploads/products/..%2f..%2fuploads-e2e-outside.txt',
          '/uploads/%2e%2e/uploads-e2e-outside.txt',
        ]) {
          const res = await request(server()).get(path);
          expect(res.status).not.toBe(200);
          expect(res.text ?? '').not.toContain('secret');
        }
      } finally {
        rmSync(outside, { force: true });
      }
    });

    it('chỉ phục vụ dưới /uploads', async () => {
      writeFileSync(join(uploadDir, 'products', 'a.png'), 'x');
      const res = await request(server()).get('/products/a.png');
      expect(res.status).toBe(404);
    });
  });

  describe('lỗi', () => {
    it('thiếu file (không gửi multipart) -> 400', async () => {
      const res = await as('ADMIN')(
        request(server()).post('/uploads/products'),
      );
      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        success: false,
        statusCode: 400,
        message: 'Vui lòng chọn file ảnh (trường "file")',
      });
    });

    it('multipart nhưng không có file -> 400', async () => {
      // Có field text thì Multer từ chối (fields: 0), tức là không thể "lách" bằng trường text
      const res = await as('ADMIN')(
        request(server()).post('/uploads/products'),
      ).field('name', 'abc');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('gửi file kèm trường text -> 400, không để lại file', async () => {
      const res = await as('ADMIN')(request(server()).post('/uploads/products'))
        .field('name', 'abc')
        .attach('file', image(PNG_HEAD), {
          filename: 'a.png',
          contentType: 'image/png',
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('đúng 1 file');
      expect(listFiles()).toEqual([]);
    });

    it('sai tên field -> 400, không để lại file', async () => {
      const res = await as('ADMIN')(
        request(server()).post('/uploads/products'),
      ).attach('image', image(PNG_HEAD), {
        filename: 'a.png',
        contentType: 'image/png',
      });
      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        success: false,
        statusCode: 400,
        message:
          'Chỉ được gửi đúng 1 file ở trường "file", không kèm trường khác',
      });
      expect(listFiles()).toEqual([]);
    });

    it('gửi nhiều file -> 400, không để lại file', async () => {
      const res = await as('ADMIN')(request(server()).post('/uploads/products'))
        .attach('file', image(PNG_HEAD), {
          filename: 'a.png',
          contentType: 'image/png',
        })
        .attach('file', image(PNG_HEAD), {
          filename: 'b.png',
          contentType: 'image/png',
        });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(listFiles()).toEqual([]);
    });

    it('products vượt 5 MB -> 413, không để lại file', async () => {
      const res = await upload(
        '/uploads/products',
        'ADMIN',
        image(PNG_HEAD, 5 * MB + 1),
      );
      expect(res.status).toBe(413);
      expect(res.body).toEqual({
        success: false,
        statusCode: 413,
        message: 'File vượt quá dung lượng cho phép (tối đa 5 MB)',
      });
      expect(listFiles()).toEqual([]);
    });

    it('avatars vượt 2 MB -> 413 (giới hạn riêng theo loại)', async () => {
      const res = await upload(
        '/uploads/avatars',
        'CUSTOMER',
        image(PNG_HEAD, 2 * MB + 1),
      );
      expect(res.status).toBe(413);
      expect(res.body.message).toBe(
        'File vượt quá dung lượng cho phép (tối đa 2 MB)',
      );
      expect(listFiles()).toEqual([]);
    });

    it('ảnh 3 MB: qua products (5 MB) nhưng bị avatars (2 MB) từ chối', async () => {
      const file = image(PNG_HEAD, 3 * MB);
      expect((await upload('/uploads/products', 'ADMIN', file)).status).toBe(
        201,
      );
      expect((await upload('/uploads/avatars', 'ADMIN', file)).status).toBe(
        413,
      );
    });

    it.each([
      ['PDF', Buffer.from('%PDF-1.4'), 'a.pdf', 'application/pdf'],
      ['GIF', Buffer.from('GIF89a......'), 'a.gif', 'image/gif'],
      ['SVG', Buffer.from('<svg/>'), 'a.svg', 'image/svg+xml'],
      [
        'văn bản khai là text/plain',
        Buffer.from('hello'),
        'a.txt',
        'text/plain',
      ],
    ])(
      'sai loại (%s) -> 415, không để lại file',
      async (_n, file, name, mime) => {
        const res = await upload(
          '/uploads/products',
          'ADMIN',
          file,
          name,
          mime,
        );
        expect(res.status).toBe(415);
        expect(res.body).toEqual({
          success: false,
          statusCode: 415,
          message: 'Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP',
        });
        expect(listFiles()).toEqual([]);
      },
    );

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
      'file giả mạo (%s, đuôi .png, khai image/png) -> 415 và không để lại file',
      async (_n, fake) => {
        const res = await upload(
          '/uploads/products',
          'ADMIN',
          fake,
          'avatar.png',
        );
        expect(res.status).toBe(415);
        expect(res.body.message).toBe('Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP');
        // Cả thư mục tạm lẫn thư mục công khai đều không còn file nào
        expect(listFiles()).toEqual([]);
        expect(existsSync(join(uploadDir, '.tmp'))).toBe(true);
      },
    );
  });

  // Thư mục upload có thể bị xóa khi server đang chạy (dọn thư mục, mount lại volume...): upload vẫn phải thành công.
  describe('thư mục upload bị xóa khi server đang chạy', () => {
    const SUBDIRS = ['.tmp', 'products', 'avatars'];
    const removeDirs = (...names: string[]) => {
      for (const name of names) {
        rmSync(join(uploadDir, name), { recursive: true, force: true });
      }
    };

    // Trả lại thư mục cho các test khác, kể cả khi test ở đây thất bại
    afterEach(() => {
      for (const name of SUBDIRS) {
        mkdirSync(join(uploadDir, name), { recursive: true });
      }
    });

    it('mất cả .tmp, products, avatars -> upload vẫn 201 và file nằm đúng chỗ', async () => {
      removeDirs(...SUBDIRS);

      const products = await upload(
        '/uploads/products',
        'ADMIN',
        image(PNG_HEAD),
      );
      const avatars = await upload(
        '/uploads/avatars',
        'CUSTOMER',
        image(PNG_HEAD),
      );

      expect(products.status).toBe(201);
      expect(avatars.status).toBe(201);
      expect(listFiles().sort()).toEqual(
        [products.body.data.url, avatars.body.data.url]
          .map((url: string) => new URL(url).pathname.replace('/uploads/', ''))
          .sort(),
      );
    });

    it('chỉ mất .tmp (nơi Multer ghi tạm) -> 201', async () => {
      removeDirs('.tmp');
      const res = await upload('/uploads/products', 'STAFF', image(JPEG_HEAD));
      expect(res.status).toBe(201);
    });

    it('chỉ mất thư mục đích products (bước rename) -> 201 và không để lại file tạm', async () => {
      removeDirs('products');
      const res = await upload('/uploads/products', 'STAFF', image(WEBP_HEAD));
      expect(res.status).toBe(201);
      expect(listFiles().filter((f) => f.startsWith('.tmp/'))).toEqual([]);
    });

    it('mất .tmp mà gửi file giả mạo -> vẫn 415 (không rơi vào 500)', async () => {
      removeDirs('.tmp');
      const res = await upload(
        '/uploads/products',
        'ADMIN',
        Buffer.from('khong phai anh'),
      );
      expect(res.status).toBe(415);
    });
  });
});
