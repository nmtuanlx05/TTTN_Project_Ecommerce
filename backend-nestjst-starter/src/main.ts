import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Validation, format response thành công và lỗi dùng chung toàn app
  configureApp(app);
  // Cho phép frontend (Vite dev server) gọi API từ origin khác
  app.enableCors({ origin: 'http://localhost:5173' });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
