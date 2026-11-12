import { assertSafeTestDatabaseUrl } from '../../scripts/assert-test-db';

// Kiểm thử chính chốt chặn an toàn (không cần thao tác gì lên DB).
describe('assertSafeTestDatabaseUrl (chốt chặn DB test)', () => {
  describe('chấp nhận URL an toàn', () => {
    it.each([
      ['mysql://root:pw@127.0.0.1:3308/ecommerce_test', 3308],
      ['mysql://root:pw@localhost:3308/shop_test', 3308],
      ['mysql://root:pw@[::1]:3309/a_test', 3309],
      ['mysql://u:p%40ss@127.0.0.1:13306/x_test', 13306],
    ])('%s', (url, port) => {
      const result = assertSafeTestDatabaseUrl(url);
      expect(result.port).toBe(port);
      expect(result.database.endsWith('_test')).toBe(true);
    });
  });

  describe('từ chối URL không an toàn', () => {
    it.each([
      ['chưa đặt (undefined)', undefined, 'chưa đặt DATABASE_URL'],
      ['rỗng', '   ', 'chưa đặt DATABASE_URL'],
      ['không phải URL', 'khong-phai-url', 'không phải URL hợp lệ'],
      ['sai giao thức', 'postgres://a:b@127.0.0.1:3308/x_test', 'mysql://'],
      [
        'cổng 3307 (DB dev)',
        'mysql://root:pw@127.0.0.1:3307/ecommerce_test',
        'cổng 3307',
      ],
      [
        'cổng 3306 (MySQL cài sẵn)',
        'mysql://root:pw@127.0.0.1:3306/ecommerce_test',
        'cổng 3306',
      ],
      [
        'không ghi cổng (mặc định 3306)',
        'mysql://root:pw@127.0.0.1/ecommerce_test',
        'cổng 3306',
      ],
      [
        'tên DB không kết thúc bằng _test',
        'mysql://root:pw@127.0.0.1:3308/ecommerce',
        'phải kết thúc bằng "_test"',
      ],
      [
        'tên DB chỉ chứa test ở giữa',
        'mysql://root:pw@127.0.0.1:3308/test_ecommerce',
        'phải kết thúc bằng "_test"',
      ],
      [
        'tên DB viết hoa _TEST',
        'mysql://root:pw@127.0.0.1:3308/ecommerce_TEST',
        'phải kết thúc bằng "_test"',
      ],
      [
        'không có tên DB',
        'mysql://root:pw@127.0.0.1:3308/',
        'phải kết thúc bằng "_test"',
      ],
      [
        'host không phải máy cục bộ',
        'mysql://root:pw@db.example.com:3308/ecommerce_test',
        'không phải máy cục bộ',
      ],
      [
        'IP LAN',
        'mysql://root:pw@192.168.1.10:3308/ecommerce_test',
        'không phải máy cục bộ',
      ],
    ])('%s', (_name, url, expectedFragment) => {
      expect(() => assertSafeTestDatabaseUrl(url)).toThrow(expectedFragment);
    });
  });

  it('không bao giờ lộ mật khẩu trong thông báo lỗi', () => {
    const urls = [
      'mysql://root:SECRET_PW_123@127.0.0.1:3307/ecommerce_test',
      'mysql://root:SECRET_PW_123@127.0.0.1:3308/ecommerce',
      'mysql://root:SECRET_PW_123@prod.example.com:3308/ecommerce_test',
    ];
    for (const url of urls) {
      let message = '';
      try {
        assertSafeTestDatabaseUrl(url);
      } catch (error) {
        message = (error as Error).message;
      }
      expect(message).not.toBe('');
      expect(message).not.toContain('SECRET_PW_123');
    }
  });
});
