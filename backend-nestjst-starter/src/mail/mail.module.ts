import { Module } from '@nestjs/common';
import { MailService } from './mail.service';

// Gửi mail qua SMTP (nodemailer). ConfigModule phải là global (AppModule) hoặc được nạp cùng: MailService đọc MAIL_* qua ConfigService.
// Chỉ QueueWorkerModule nạp module này (EmailProcessor gửi mail chào mừng); không nạp vào AppModule.
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
