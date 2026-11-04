import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles, RolesMessage } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/auth.types';
import { parseIdPipe } from '../common/pipes/parse-id.pipe';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

// JwtAuthGuard đã bật toàn cục nên chỉ cần RolesGuard. Giỏ chỉ của CUSTOMER; id luôn lấy từ token.
@Controller('cart')
@UseGuards(RolesGuard)
@Roles('CUSTOMER')
@RolesMessage('Tài khoản quản trị không dùng để mua hàng')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@CurrentUser() user: AuthUser) {
    return this.cartService.getCart(user.id);
  }

  @Post('items')
  addItem(@Body() dto: AddCartItemDto, @CurrentUser() user: AuthUser) {
    return this.cartService.addItem(user.id, dto.variantId, dto.quantity);
  }

  @Patch('items/:id')
  updateItem(
    @Param('id', parseIdPipe) id: number,
    @Body() dto: UpdateCartItemDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.cartService.updateItem(user.id, id, dto.quantity);
  }

  @Delete('items/:id')
  removeItem(
    @Param('id', parseIdPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.cartService.removeItem(user.id, id);
  }

  @Delete()
  clear(@CurrentUser() user: AuthUser) {
    return this.cartService.clear(user.id);
  }
}
