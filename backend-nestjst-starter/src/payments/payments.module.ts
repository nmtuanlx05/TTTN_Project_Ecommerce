import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { InventoryModule } from '../inventory/inventory.module';
import { OrderWorkflowService } from '../orders/order-workflow.service';
import { AdminPaymentsController } from './admin-payments.controller';
import { PaymentConfigService } from './payment-config.service';
import { PaymentExpiryService } from './payment-expiry.service';
import { PaymentsService } from './payments.service';
import { SepayWebhookController } from './sepay-webhook.controller';

// OrdersModule import module này (không ngược lại) để tránh vòng phụ thuộc; OrderWorkflowService không có trạng thái
// nên được cung cấp ở cả hai module.
@Module({
  imports: [InventoryModule],
  controllers: [SepayWebhookController, AdminPaymentsController],
  providers: [
    PaymentConfigService,
    PaymentsService,
    PaymentExpiryService,
    OrderWorkflowService,
    RolesGuard,
  ],
  exports: [PaymentConfigService, PaymentsService, PaymentExpiryService],
})
export class PaymentsModule {}
