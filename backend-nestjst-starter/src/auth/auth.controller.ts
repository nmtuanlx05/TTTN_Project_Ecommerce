import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { CookieOptions, Response } from 'express';
import { AuthService, IssuedTokens } from './auth.service';
import { REFRESH_COOKIE_NAME, REFRESH_COOKIE_PATH } from './auth.constants';
import type { AuthUser } from './auth.types';
import { CurrentUser } from './decorators/current-user.decorator';
import { RegisterDto } from './dto/register.dto';
// import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Public } from './decorators/public.decorator';

// Tùy chọn cookie dùng chung cho set và clear (clear phải trùng path/sameSite thì trình duyệt mới xóa)
function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: REFRESH_COOKIE_PATH,
  };
}

function setRefreshCookie(res: Response, tokens: IssuedTokens) {
  res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, {
    ...baseCookieOptions(),
    expires: tokens.refreshExpiresAt,
  });
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Chỉ trả user, không tự đăng nhập
  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  async login(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.issueTokens(user);
    setRefreshCookie(res, tokens);
    return { accessToken: tokens.accessToken, user };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshGuard)
  async refresh(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.issueTokens(user);
    setRefreshCookie(res, tokens);
    return { accessToken: tokens.accessToken };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(REFRESH_COOKIE_NAME, baseCookieOptions());
    return { message: 'Đăng xuất thành công' };
  }

  @Get('me')
  // @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}
