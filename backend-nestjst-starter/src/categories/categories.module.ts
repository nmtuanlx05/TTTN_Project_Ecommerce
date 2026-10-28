import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminCategoriesController } from './admin-categories.controller';
import { CategoriesService } from './categories.service';
import { PublicCategoriesController } from './public-categories.controller';

@Module({
  controllers: [AdminCategoriesController, PublicCategoriesController],
  providers: [CategoriesService, RolesGuard],
  exports: [CategoriesService],
})
export class CategoriesModule {}
