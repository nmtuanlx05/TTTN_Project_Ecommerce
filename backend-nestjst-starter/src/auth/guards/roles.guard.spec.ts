import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Roles, RolesMessage } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

const contextFor = (controller: new () => object, role: string) =>
  ({
    getHandler: () => () => undefined,
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
  }) as unknown as ExecutionContext;

describe('RolesGuard', () => {
  const guard = new RolesGuard(new Reflector());

  @Roles('ADMIN')
  class Plain {}

  @Roles('CUSTOMER')
  @RolesMessage('Thông báo riêng')
  class WithMessage {}

  it('mặc định giữ nguyên câu 403 chung', () => {
    expect(() => guard.canActivate(contextFor(Plain, 'CUSTOMER'))).toThrow(
      new ForbiddenException('Bạn không có quyền thực hiện thao tác này'),
    );
  });

  it('có @RolesMessage thì dùng câu riêng', () => {
    expect(() => guard.canActivate(contextFor(WithMessage, 'ADMIN'))).toThrow(
      new ForbiddenException('Thông báo riêng'),
    );
  });

  it('đúng role thì qua', () => {
    expect(guard.canActivate(contextFor(WithMessage, 'CUSTOMER'))).toBe(true);
  });
});
