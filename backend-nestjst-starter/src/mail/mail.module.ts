import { Module } from '@nestjs/common';
import { MailService } from './mail.service';

// Gửi mail qua SMTP (nodemailer). ConfigModule phải là global (AppModule) hoặc được nạp cùng: MailService đọc MAIL_* qua ConfigService.
// Chặng này chưa có ai gọi MailService trong app; chặng sau EmailProcessor mới dùng (và tự nạp module này).
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
