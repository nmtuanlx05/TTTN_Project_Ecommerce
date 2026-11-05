import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { InventoryModule } from '../inventory/inventory.module';
import { LocationsModule } from '../locations/locations.module';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminOrdersService } from './admin-orders.service';
import { OrderWorkflowService } from './order-workflow.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [InventoryModule, LocationsModule],
  controllers: [OrdersController, AdminOrdersController],
  providers: [
    OrdersService,
    AdminOrdersService,
    OrderWorkflowService,
    RolesGuard,
  ],
})
export class OrdersModule {}
