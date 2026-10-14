import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Paginated } from '../paginated';

// Key không bao giờ được xuất hiện trong response, ở bất kỳ độ sâu nào.
const FORBIDDEN_KEYS = new Set(['password']);

// Bỏ các key cấm một cách đệ quy; chỉ duyệt array và plain object (giữ nguyên Date, Buffer...).
export function stripSensitiveKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripSensitiveKeys);
  }
  if (value !== null && typeof value === 'object') {
    const proto = Object.getPrototypeOf(value) as unknown;
    if (proto !== Object.prototype && proto !== null) {
      return value;
    }
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !FORBIDDEN_KEYS.has(key))
        .map(([key, val]) => [key, stripSensitiveKeys(val)]),
    );
  }
  return value;
}

// Bọc mọi response thành công thành { success: true, data, meta? }.
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((body: unknown) => {
        if (body instanceof Paginated) {
          return {
            success: true,
            data: stripSensitiveKeys(body.data),
            meta: body.meta,
          };
        }
        return { success: true, data: stripSensitiveKeys(body) };
      }),
    );
  }
}
