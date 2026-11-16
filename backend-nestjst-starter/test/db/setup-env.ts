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
});
