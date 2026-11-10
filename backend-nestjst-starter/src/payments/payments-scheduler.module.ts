import { Module } from '@nestjs/common';
import { PaymentExpiryCron } from './payment-expiry.cron';
import { PaymentsModule } from './payments.module';

// Cần ScheduleModule.forRoot() đã nạp ở AppModule (dùng chung cho mọi tác vụ định kỳ).
// Tách riêng để chỉ AppModule nạp lập lịch; PaymentsModule (và test) không phụ thuộc @nestjs/schedule.
@Module({
  imports: [PaymentsModule],
  providers: [PaymentExpiryCron],
})
export class PaymentsSchedulerModule {}
