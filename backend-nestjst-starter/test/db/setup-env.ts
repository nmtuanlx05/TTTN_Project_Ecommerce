// Chạy trước mỗi file test (jest `setupFiles`), TRƯỚC khi AppModule được nạp.
// Chỉ đặt biến JWT GIẢ để ConfigModule.forRoot(validate) không từ chối khởi động.
// KHÔNG đặt DATABASE_URL ở đây: URL do người chạy truyền vào và luôn đi qua chốt chặn an toàn.
// Không đặt CLOUDINARY_* / VIETQR_*: ảnh và thanh toán online tắt (đúng ý), test chỉ dùng COD.
export const DB_TEST_JWT_SECRET = 'db-test-access-secret';

Object.assign(process.env, {
  JWT_ACCESS_SECRET: DB_TEST_JWT_SECRET,
  JWT_ACCESS_EXPIRES_IN: '15m',
  JWT_REFRESH_SECRET: 'db-test-refresh-secret',
  JWT_REFRESH_EXPIRES_IN: '7d',
  // REDIS_URL bắt buộc để qua validateEnv; cổng 1 không ai nghe (KHÔNG dùng 6379 để lỡ nối nhầm Redis thật)
  REDIS_URL: 'redis://127.0.0.1:1',
  // Không chạy worker hàng đợi trong test
  QUEUE_WORKER_ENABLED: 'false',
  // Mail giả để qua validateEnv; cổng 1 không ai nghe nên không thể gửi mail thật
  MAIL_HOST: '127.0.0.1',
  MAIL_PORT: '1',
  MAIL_FROM: 'no-reply@example.com',
  FRONTEND_URL: 'http://localhost:5173',
});
