import { readdirSync } from 'fs';
import { join } from 'path';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../src/auth/decorators/public.decorator';
import { ROLES_KEY } from '../src/auth/decorators/roles.decorator';
import { RolesGuard } from '../src/auth/guards/roles.guard';

// @nestjs/config chỉ có bản ESM nên Jest không nạp được; spec mock lại. Prisma cũng mock vì chỉ đọc metadata.
jest.mock('@nestjs/config', () => ({ ConfigService: class {} }));
jest.mock('../src/prisma/prisma.service', () => ({ PrismaService: class {} }));

// JwtAuthGuard bật toàn cục nên route nào không @Public cũng cần đăng nhập, nhưng RolesGuard mặc định cho qua
// khi quên @Roles (mọi user đã đăng nhập đều vào được). Test này chặn lỗi đó: mọi route phải là @Public,
// có @Roles, hoặc nằm trong danh sách ngoại lệ dưới đây.
const ALLOWED_FOR_ANY_LOGGED_IN_USER: Record<string, string> = {
  // Thông tin của chính người đang đăng nhập (user lấy từ token)
  'GET /auth/me': 'Trả về chính user trong token, mọi role đều cần.',
  // Mọi role đều có ảnh đại diện; file lưu theo uuid, không gắn với route nhạy cảm nào
  'POST /uploads/avatars': 'Mọi role tự tải ảnh đại diện của mình lên.',
  // Id lấy từ token, không nhận id trong đường dẫn nên chỉ sửa được chính mình
  'PATCH /users/me/avatar':
    'Mọi role tự đổi ảnh đại diện; id lấy từ token. Hiện đã ghi rõ @Roles cả 3 role, liệt kê ở đây để thể hiện đây là ý định.',
  // Route scaffold mặc định của Nest ("Hello World"), chưa có dữ liệu nhạy cảm
  'GET /': 'Scaffold Hello World của Nest, không có dữ liệu nhạy cảm.',
};

interface RouteInfo {
  key: string;
  isPublic: boolean;
  roles: unknown[];
  hasRolesGuard: boolean;
  file: string;
}

function findControllerFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === 'generated' ? [] : findControllerFiles(path);
    }
    return entry.name.endsWith('.controller.ts') ? [path] : [];
  });
}

const joinPath = (...parts: string[]) =>
  '/' +
  parts
    .flatMap((part) => part.split('/'))
    .filter(Boolean)
    .join('/');

function collectRoutes(): RouteInfo[] {
  const srcDir = join(__dirname, '..', 'src');
  const routes: RouteInfo[] = [];

  for (const file of findControllerFiles(srcDir)) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const exported = require(file) as Record<string, unknown>;
    for (const value of Object.values(exported)) {
      if (typeof value !== 'function') continue;
      const controllerPath = Reflect.getMetadata(PATH_METADATA, value) as
        | string
        | string[]
        | undefined;
      // Chỉ lấy class có @Controller
      if (controllerPath === undefined) continue;
      const basePath = Array.isArray(controllerPath)
        ? controllerPath[0]
        : controllerPath;

      for (const name of Object.getOwnPropertyNames(value.prototype)) {
        const handler = (value.prototype as Record<string, unknown>)[name];
        if (typeof handler !== 'function') continue;
        const method = Reflect.getMetadata(METHOD_METADATA, handler) as
          | RequestMethod
          | undefined;
        if (method === undefined) continue;
        const handlerPath = Reflect.getMetadata(PATH_METADATA, handler) as
          | string
          | string[];
        const path = joinPath(
          basePath,
          Array.isArray(handlerPath) ? handlerPath[0] : handlerPath,
        );

        // Metadata ở method ghi đè class, giống Reflector.getAllAndOverride
        const meta = <T>(key: string) =>
          (Reflect.getMetadata(key, handler) ??
            Reflect.getMetadata(key, value)) as T | undefined;
        const guards = [
          ...((Reflect.getMetadata(GUARDS_METADATA, value) as
            | unknown[]
            | undefined) ?? []),
          ...((Reflect.getMetadata(GUARDS_METADATA, handler) as
            | unknown[]
            | undefined) ?? []),
        ];

        routes.push({
          key: `${RequestMethod[method]} ${path}`,
          isPublic: meta<boolean>(IS_PUBLIC_KEY) === true,
          roles: meta<unknown[]>(ROLES_KEY) ?? [],
          hasRolesGuard: guards.includes(RolesGuard),
          file: file.slice(srcDir.length + 1),
        });
      }
    }
  }
  return routes;
}

describe('Phân quyền của mọi route (quét metadata controller)', () => {
  const routes = collectRoutes();

  it('quét được controller (tránh test qua vì không tìm thấy route nào)', () => {
    expect(routes.length).toBeGreaterThan(20);
    expect(routes.map((r) => r.key)).toEqual(
      expect.arrayContaining(['GET /users', 'POST /auth/login', 'GET /']),
    );
  });

  it('mọi route không @Public đều có @Roles hoặc nằm trong danh sách ngoại lệ', () => {
    const violations = routes.filter(
      (r) =>
        !r.isPublic &&
        r.roles.length === 0 &&
        !(r.key in ALLOWED_FOR_ANY_LOGGED_IN_USER),
    );

    const message = violations
      .map(
        (r) =>
          `  - ${r.key} (${r.file}): không @Public, không @Roles và không có trong danh sách ngoại lệ.`,
      )
      .join('\n');
    expect({
      violations: violations.map((r) => r.key),
      huongDanSua: violations.length
        ? `Route sau đang mở cho MỌI user đã đăng nhập:\n${message}\n` +
          'Cách khắc phục: (1) thêm @Roles(...) cho route (kèm @UseGuards(RolesGuard) ở controller), ' +
          'hoặc (2) nếu đúng là dành cho mọi người đã đăng nhập thì thêm "METHOD /path" vào ' +
          'ALLOWED_FOR_ANY_LOGGED_IN_USER trong test/route-permissions.e2e-spec.ts kèm lý do.'
        : '',
    }).toEqual({ violations: [], huongDanSua: '' });
  });

  it('route có @Roles thì controller phải gắn RolesGuard (nếu không @Roles không có tác dụng)', () => {
    const violations = routes.filter(
      (r) => !r.isPublic && r.roles.length > 0 && !r.hasRolesGuard,
    );

    expect({
      violations: violations.map((r) => `${r.key} (${r.file})`),
      huongDanSua: violations.length
        ? 'Các route trên có @Roles nhưng thiếu @UseGuards(RolesGuard) nên ai đăng nhập cũng vào được. ' +
          'Cách khắc phục: thêm @UseGuards(RolesGuard) ở class controller.'
        : '',
    }).toEqual({ violations: [], huongDanSua: '' });
  });

  it('danh sách ngoại lệ không chứa route đã bị xóa hoặc đã đổi sang @Public/@Roles không cần thiết', () => {
    const known = new Map(routes.map((r) => [r.key, r]));
    const stale = Object.keys(ALLOWED_FOR_ANY_LOGGED_IN_USER).filter(
      (key) => !known.has(key) || known.get(key)!.isPublic,
    );

    expect({
      stale,
      huongDanSua: stale.length
        ? 'Xóa các mục này khỏi ALLOWED_FOR_ANY_LOGGED_IN_USER vì route không còn tồn tại hoặc đã @Public.'
        : '',
    }).toEqual({ stale: [], huongDanSua: '' });
  });
});
