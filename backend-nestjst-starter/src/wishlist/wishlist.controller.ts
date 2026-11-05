import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles, RolesMessage } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/auth.types';
import { parseIdPipe } from '../common/pipes/parse-id.pipe';
import { QueryWishlistDto } from './dto/query-wishlist.dto';
import { WishlistService } from './wishlist.service';

// Yêu thích chỉ của CUSTOMER; id luôn lấy từ token. Route cố định (ids) khai báo trước route có :productId.
@Controller('wishlist')
@UseGuards(RolesGuard)
@Roles('CUSTOMER')
@RolesMessage('Tài khoản quản trị không dùng danh sách yêu thích')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  list(@Query() query: QueryWishlistDto, @CurrentUser() user: AuthUser) {
    return this.wishlistService.list(user.id, query);
  }

  @Get('ids')
  listIds(@CurrentUser() user: AuthUser) {
    return this.wishlistService.listIds(user.id);
  }

  // POST mặc định 201; hợp đồng là 200 cho cả lần thêm đầu và lần thêm lại
  @Post(':productId')
  @HttpCode(200)
  add(
    @Param('productId', parseIdPipe) productId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.wishlistService.add(user.id, productId);
  }

  @Delete(':productId')
  remove(
    @Param('productId', parseIdPipe) productId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.wishlistService.remove(user.id, productId);
  }
}
