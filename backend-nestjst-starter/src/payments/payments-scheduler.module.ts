import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PaymentExpiryCron } from './payment-expiry.cron';
import { PaymentsModule } from './payments.module';

// Tách riêng để chỉ AppModule nạp lập lịch; PaymentsModule (và test) không phụ thuộc @nestjs/schedule.
@Module({
  imports: [ScheduleModule.forRoot(), PaymentsModule],
  providers: [PaymentExpiryCron],
})
export class PaymentsSchedulerModule {}
