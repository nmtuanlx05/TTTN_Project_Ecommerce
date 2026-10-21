import {
  BadRequestException,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { Request } from 'express';
import { flattenValidationErrors } from '../../app.setup';
import { MSG_INVALID_CREDENTIALS } from '../auth.constants';
import type { AuthUser } from '../auth.types';
import { LoginDto } from '../dto/login.dto';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  // Guard chạy trước ValidationPipe nên phải tự validate body ở đây, để lỗi thiếu/sai định dạng
  // trả 400 đúng dạng chung (thay vì 401 hoặc lỗi 500 khi password không phải chuỗi).
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const dto = plainToInstance(LoginDto, request.body ?? {});
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Dữ liệu không hợp lệ',
        errors: flattenValidationErrors(errors),
      });
    }
    // Ghi lại body đã chuẩn hóa (email trim + lowercase) cho LocalStrategy
    request.body = dto;
    return (await super.canActivate(context)) as boolean;
  }

  handleRequest<TUser = AuthUser>(err: unknown, user: TUser | false): TUser {
    // Giữ nguyên lỗi 401/403 do LocalStrategy ném ra
    if (err instanceof Error) {
      throw err;
    }
    if (!user) {
      throw new UnauthorizedException(MSG_INVALID_CREDENTIALS);
    }
    return user;
  }
}
