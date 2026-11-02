import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminInventoryController } from './admin-inventory.controller';
import { InventoryService } from './inventory.service';

@Module({
  controllers: [AdminInventoryController],
  providers: [InventoryService, RolesGuard],
  // Module đơn hàng sau này dùng lại InventoryService để đổi tồn trong transaction của nó
  exports: [InventoryService],
})
export class InventoryModule {}
