import {
  BadRequestException,
  INestApplication,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import type { FieldError } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

// Làm phẳng lỗi lồng nhau của class-validator thành danh sách { field, message }.
export function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): FieldError[] {
  return errors.flatMap((error) => {
    const field = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;
    const own = Object.entries(error.constraints ?? {}).map(
      ([constraint, message]) => ({
        field,
        // forbidNonWhitelisted: thông báo mặc định là tiếng Anh nên thay bằng tiếng Việt
        message:
          constraint === 'whitelistValidation'
            ? `Trường ${field} không được phép gửi lên`
            : message,
      }),
    );
    const nested = flattenValidationErrors(error.children ?? [], field);
    return [...own, ...nested];
  });
}

// Cấu hình dùng chung cho main.ts và e2e test, để test chạy đúng cấu hình thật.
export function configureApp(app: INestApplication) {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new BadRequestException({
          message: 'Dữ liệu không hợp lệ',
          errors: flattenValidationErrors(errors),
        }),
    }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());
}
