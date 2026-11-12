// Chốt chặn an toàn cho test chạy trên MySQL THẬT: từ chối nếu DATABASE_URL có vẻ trỏ vào DB đang dùng.
// Dùng ở 3 nơi: lệnh CLI này (trước `prisma migrate deploy`), globalSetup của Jest, và các helper test.
// Quy ước: KHÔNG bao giờ in mật khẩu hay nguyên chuỗi URL ra log/lỗi (chỉ in host, cổng, tên DB).

// Cổng bị cấm: 3307 = DB dev (docker-compose.yml), 3306 = MySQL cài sẵn trên máy dev.
export const FORBIDDEN_PORTS = [3306, 3307];

const LOOPBACK_HOSTS = ['127.0.0.1', 'localhost', '::1'];

// Tên DB test phải KẾT THÚC bằng "_test" (chữ thường).
const TEST_DB_NAME_REGEX = /_test$/;

export interface SafeTestDatabase {
  host: string;
  port: number;
  database: string;
}

// Ném Error (tiếng Việt) nếu URL không an toàn; trả về host/cổng/tên DB nếu an toàn.
export function assertSafeTestDatabaseUrl(
  rawUrl: string | undefined,
): SafeTestDatabase {
  if (rawUrl === undefined || rawUrl.trim() === '') {
    throw new Error(
      'Từ chối chạy: chưa đặt DATABASE_URL. Hãy đặt ngay trước lệnh, ví dụ ' +
        "DATABASE_URL='mysql://root:<mật-khẩu>@127.0.0.1:3308/ecommerce_test' npm run test:db " +
        '(không tự đọc file .env để tránh nhầm sang DB dev).',
    );
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    // Không in rawUrl vì có thể chứa mật khẩu
    throw new Error('Từ chối chạy: DATABASE_URL không phải URL hợp lệ.');
  }

  if (url.protocol !== 'mysql:') {
    throw new Error('Từ chối chạy: DATABASE_URL phải bắt đầu bằng mysql://');
  }

  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  // Không ghi cổng => MySQL mặc định 3306
  const port = url.port === '' ? 3306 : Number(url.port);
  const database = decodeURIComponent(url.pathname.replace(/^\//, ''));
  const where = `${host}:${port}/${database}`;

  if (!LOOPBACK_HOSTS.includes(host)) {
    throw new Error(
      `Từ chối chạy: host "${host}" không phải máy cục bộ (127.0.0.1/localhost). Đích: ${where}`,
    );
  }
  if (FORBIDDEN_PORTS.includes(port)) {
    throw new Error(
      `Từ chối chạy: cổng ${port} là của DB dev/MySQL cài sẵn. DB test dùng cổng 3308 (docker-compose.test.yml). Đích: ${where}`,
    );
  }
  if (!TEST_DB_NAME_REGEX.test(database)) {
    throw new Error(
      `Từ chối chạy: tên DB "${database}" phải kết thúc bằng "_test". Đích: ${where}`,
    );
  }

  return { host, port, database };
}

// Chạy như lệnh: `ts-node scripts/assert-test-db.ts` (thoát mã 1 nếu không an toàn)
if (require.main === module) {
  try {
    const { host, port, database } = assertSafeTestDatabaseUrl(
      process.env.DATABASE_URL,
    );
    console.log(`OK: DB test an toàn -> ${host}:${port}/${database}`);
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }
}
