import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminProductsController } from './admin-products.controller';
import { ProductsService } from './products.service';
import { PublicProductsController } from './public-products.controller';

@Module({
  imports: [MediaModule],
  controllers: [AdminProductsController, PublicProductsController],
  providers: [ProductsService, RolesGuard],
  exports: [ProductsService],
})
export class ProductsModule {}
