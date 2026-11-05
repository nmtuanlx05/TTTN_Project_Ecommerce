import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';

@Module({
  controllers: [WishlistController],
  providers: [WishlistService, RolesGuard],
})
export class WishlistModule {}
