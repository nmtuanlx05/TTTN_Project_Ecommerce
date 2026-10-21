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
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
