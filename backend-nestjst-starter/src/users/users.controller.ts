import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateAvatarDto } from './dto/update-avatar.dto';
import { AvatarUrlPipe } from './avatar-url.pipe';
import { parseIdPipe } from '../common/pipes/parse-id.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/auth.types';

// JwtAuthGuard đã bật toàn cục nên chỉ cần RolesGuard. Mặc định chỉ ADMIN: route mới quên khai báo @Roles
// cũng không bị mở cho mọi user đã đăng nhập. Endpoint cho nhiều role hơn phải ghi đè @Roles ở cấp method.
@Controller('users')
@UseGuards(RolesGuard)
@Roles('ADMIN')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  // Phải khai báo trước các route ':id'. Mọi user đã đăng nhập đều dùng được (ghi đè @Roles của class), chỉ sửa chính mình.
  @Patch('me/avatar')
  @Roles('ADMIN', 'STAFF', 'CUSTOMER')
  updateMyAvatar(
    @CurrentUser() user: AuthUser,
    @Body(AvatarUrlPipe) updateAvatarDto: UpdateAvatarDto,
  ) {
    return this.usersService.updateAvatar(user.id, updateAvatarDto);
  }

  @Get(':id')
  findOne(@Param('id', parseIdPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', parseIdPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.usersService.update(id, updateUserDto, actor.id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', parseIdPipe) id: number,
    @Body() updateUserStatusDto: UpdateUserStatusDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.usersService.updateStatus(id, updateUserStatusDto, actor.id);
  }
}
