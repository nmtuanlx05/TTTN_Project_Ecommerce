// Gửi MỘT thư thử qua cấu hình SMTP hiện tại (MAIL_* trong .env.development / .env.production). Chạy tay:
//   npm run mail:test -- someone@example.com
// Chỉ nạp ConfigModule + MailModule: không HTTP, không Prisma, không Redis, không worker.
// In: cấu hình KHÔNG bí mật (host:cổng, secure, requireTLS, có đăng nhập hay không), messageId, kết quả.
// KHÔNG in mật khẩu, MAIL_USER, MAIL_FROM hay địa chỉ người nhận. Mã thoát: 0 = gửi xong; 1 = lỗi hoặc tham số sai.
import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ENV_FILE } from '../src/config/env-file';
import { MailModule } from '../src/mail/mail.module';
import { MailService } from '../src/mail/mail.service';

// Kiểm rất cơ bản (có một @ và một dấu chấm ở phần tên miền, không khoảng trắng/xuống dòng); server SMTP mới là nơi kiểm thật
const BASIC_ADDRESS = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ENV_FILE }),
    MailModule,
  ],
})
class MailTestModule {}

async function main() {
  const to = process.argv[2]?.trim();
  if (!to || !BASIC_ADDRESS.test(to)) {
    throw new Error(
      'Thiếu hoặc sai địa chỉ nhận. Cách dùng: npm run mail:test -- someone@example.com',
    );
  }

  // Thiếu/sai MAIL_* thì MailService ném lỗi nêu tên biến ngay lúc dựng
  const app = await NestFactory.createApplicationContext(MailTestModule, {
    logger: ['warn', 'error'],
  });
  try {
    const mail = app.get(MailService);
    const info = mail.describe();
    console.log(
      `Cấu hình: ${info.host}:${info.port}, secure=${info.secure}, requireTLS=${info.requireTLS}, đăng nhập=${info.hasAuth ? 'có' : 'không'}`,
    );
    console.log('Đang gửi (tối đa 30 giây)...');

    const sentAt = new Date().toISOString();
    const { messageId } = await mail.send({
      to,
      subject: 'Thư thử từ hệ thống (mail:test)',
      text: `Đây là thư thử gửi lúc ${sentAt}.\nNếu bạn đọc được thư này thì cấu hình SMTP hoạt động.`,
      html: `<p>Đây là thư thử gửi lúc <b>${sentAt}</b>.</p><p>Nếu bạn đọc được thư này thì cấu hình SMTP hoạt động.</p>`,
    });

    console.log(`Đã gửi xong. messageId = ${messageId}`);
    console.log(
      info.host === '127.0.0.1' || info.host === 'localhost'
        ? 'Mailpit: mở http://127.0.0.1:8025 để xem thư.'
        : 'Kiểm tra hộp thư của địa chỉ nhận (có thể nằm trong mục Spam).',
    );
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  // MailSendError có message cố định (chi tiết kỹ thuật nằm ở dòng log "Gửi mail thất bại qua host:cổng (code=...)" phía trên);
  // lỗi cấu hình chỉ nêu tên biến. Cả hai đều an toàn để in.
  console.error(
    'mail:test thất bại: ' +
      (error instanceof Error ? error.message : String(error)),
  );
  process.exit(1);
});
