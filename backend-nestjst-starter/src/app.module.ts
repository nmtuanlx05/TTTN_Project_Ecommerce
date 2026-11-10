import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { InventoryModule } from './inventory/inventory.module';
import { CartModule } from './cart/cart.module';
import { LocationsModule } from './locations/locations.module';
import { OrdersModule } from './orders/orders.module';
import { VouchersModule } from './vouchers/vouchers.module';
import { UploadModule } from './uploads/upload.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { PaymentsModule } from './payments/payments.module';
import { PaymentsSchedulerModule } from './payments/payments-scheduler.module';
import { MediaSchedulerModule } from './media/media-scheduler.module';
import { ENV_FILE } from './config/env-file';
import { validateEnv } from './config/env.validation';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    // Đọc .env.development hoặc .env.production theo NODE_ENV; biến đã có trong process.env được ưu tiên
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ENV_FILE,
      validate: validateEnv,
    }),
    // Một nơi duy nhất nạp bộ lập lịch cho mọi tác vụ định kỳ (thanh toán hết hạn, dọn ảnh)
    ScheduleModule.forRoot(),
    PrismaModule,
    UsersModule,
    AuthModule,
    CategoriesModule,
    ProductsModule,
    InventoryModule,
    CartModule,
    LocationsModule,
    OrdersModule,
    VouchersModule,
    UploadModule,
    DashboardModule,
    WishlistModule,
    PaymentsModule,
    PaymentsSchedulerModule,
    MediaSchedulerModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: 'APP_GUARD',
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
