// res.body của supertest có kiểu any; test chỉ đọc để so sánh nên tắt các rule unsafe-* cho file này.
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call */
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from '../src/app.setup';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { LOCATION_INDEX } from '../src/locations/locations.data';
import { LocationsController } from '../src/locations/locations.controller';
import { LocationsService } from '../src/locations/locations.service';
import { UsersService } from '../src/users/users.service';

jest.mock('@nestjs/config', () => ({ ConfigService: class {} }));
jest.mock('../src/prisma/prisma.service', () => ({ PrismaService: class {} }));

// Dùng LocationsService THẬT với dữ liệu thật (không DB), JwtAuthGuard bật toàn cục như app thật:
// chứng minh các route công khai không cần token.
describe('Locations API (e2e)', () => {
  let app: INestApplication<App>;
  const server = () => app.getHttpServer();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule, JwtModule.register({})],
      controllers: [LocationsController],
      providers: [
        JwtStrategy,
        LocationsService,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        {
          provide: UsersService,
          useValue: { findForAuth: () => Promise.resolve(null) },
        },
        { provide: ConfigService, useValue: { getOrThrow: () => 'secret' } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /locations/provinces: công khai (không token), 63 tỉnh, chỉ code + name, có cache header', async () => {
    const res = await request(server()).get('/locations/provinces').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(63);
    expect(Object.keys(res.body.data[0]).sort()).toEqual(['code', 'name']);
    expect(res.headers['cache-control']).toBe('public, max-age=86400');
    const names: string[] = res.body.data.map((p: { name: string }) => p.name);
    const collator = new Intl.Collator('vi', { numeric: true });
    expect(names).toEqual([...names].sort((a, b) => collator.compare(a, b)));
  });

  it('districts của một tỉnh: đúng thứ tự cha-con và số lượng khớp dữ liệu', async () => {
    const province = LOCATION_INDEX.provinces[10];
    const res = await request(server())
      .get(`/locations/provinces/${province.code}/districts`)
      .expect(200);
    expect(res.body.data).toHaveLength(province.districts.length);
    expect(res.headers['cache-control']).toBe('public, max-age=86400');
    for (const d of res.body.data) {
      expect(LOCATION_INDEX.districtByCode.get(d.code)!.provinceCode).toBe(
        province.code,
      );
    }
  });

  it('wards của một quận/huyện: số lượng khớp và thuộc đúng quận', async () => {
    const district = LOCATION_INDEX.provinces[10].districts.find(
      (d) => d.wards.length > 3,
    )!;
    const res = await request(server())
      .get(`/locations/districts/${district.code}/wards`)
      .expect(200);
    expect(res.body.data).toHaveLength(district.wards.length);
    for (const w of res.body.data) {
      expect(LOCATION_INDEX.wardByCode.get(w.code)!.districtCode).toBe(
        district.code,
      );
    }
  });

  it('huyện đảo không có phường/xã: 200 và mảng rỗng (không 404)', async () => {
    const res = await request(server())
      .get('/locations/districts/536/wards')
      .expect(200);
    expect(res.body).toEqual({ success: true, data: [] });
  });

  it('mã không tồn tại → 404 tiếng Việt kèm code', async () => {
    const a = await request(server())
      .get('/locations/provinces/99999/districts')
      .expect(404);
    expect(a.body).toEqual({
      success: false,
      statusCode: 404,
      message: 'Không tìm thấy tỉnh/thành phố',
      code: 'PROVINCE_NOT_FOUND',
    });
    const b = await request(server())
      .get('/locations/districts/99999/wards')
      .expect(404);
    expect(b.body).toEqual({
      success: false,
      statusCode: 404,
      message: 'Không tìm thấy quận/huyện',
      code: 'DISTRICT_NOT_FOUND',
    });
  });

  it('mã phường/xã không dùng làm tham số cha (mã cấp sai) → 404, không trả dữ liệu lẫn cấp', async () => {
    const wardCode = LOCATION_INDEX.provinces[0].districts.find(
      (d) => d.wards.length,
    )!.wards[0].code;
    await request(server())
      .get(`/locations/districts/${wardCode}/wards`)
      .expect(404);
  });
});
