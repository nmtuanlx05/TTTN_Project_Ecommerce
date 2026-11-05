import {
  BadRequestException,
  INestApplication,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import type { FieldError } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

// Ràng buộc tùy biến (tên constraint của class-validator) → mã lỗi máy đọc được ở từng trường.
// Chỉ các ràng buộc mới ở module đơn hàng có mã; ràng buộc cũ không đổi response.
export const CONSTRAINT_ERROR_CODES: Record<string, string> = {
  isVnMobilePhone: 'PHONE_INVALID',
  isLocationCode: 'LOCATION_REQUIRED',
};

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
        ...(CONSTRAINT_ERROR_CODES[constraint] && {
          code: CONSTRAINT_ERROR_CODES[constraint],
        }),
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
