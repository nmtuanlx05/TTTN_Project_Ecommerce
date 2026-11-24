import cookieParser from 'cookie-parser';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Validation, format response thành công và lỗi dùng chung toàn app
  configureApp(app);
  // Đọc cookie refresh token (req.cookies)
  app.use(cookieParser());
  // Cho phép frontend (Vite dev server) gọi API từ origin khác; credentials để trình duyệt gửi/nhận cookie
  app.enableCors({ origin: 'http://localhost:5173', credentials: true });
  // Khi nhận SIGTERM/SIGINT (Ctrl+C, deploy) Nest gọi onModuleDestroy/onApplicationShutdown để đóng kết nối DB, Redis sạch.
  // Cố ý đặt ở đây, KHÔNG đặt trong configureApp: hàm đó dùng chung với các e2e, mỗi lần dựng app trong Jest sẽ thêm
  // listener tín hiệu vào process (cảnh báo MaxListeners, giữ tiến trình sống).
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
