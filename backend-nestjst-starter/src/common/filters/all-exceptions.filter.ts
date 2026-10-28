import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../../generated/prisma/client';

export interface FieldError {
  field: string;
  message: string;
}

interface ErrorResult {
  statusCode: number;
  message: string;
  errors?: FieldError[];
}

const INTERNAL_ERROR_MESSAGE = 'Lỗi hệ thống, vui lòng thử lại sau';

// Lỗi Prisma không đưa chi tiết (bảng, câu SQL) ra ngoài, chỉ ánh xạ sang thông điệp thân thiện.
function mapPrismaError(
  error: Prisma.PrismaClientKnownRequestError,
): ErrorResult | null {
  switch (error.code) {
    case 'P2002': {
      // Chỉ khẳng định tên trường khi lỗi thật sự nhắc tới nó; ràng buộc unique khác dùng thông điệp chung.
      const detail = JSON.stringify(error.meta ?? {}).toLowerCase();
      const message = detail.includes('email')
        ? 'Email đã được sử dụng'
        : detail.includes('slug')
          ? 'Slug đã được sử dụng'
          : detail.includes('sku')
            ? 'SKU đã được sử dụng'
            : 'Dữ liệu đã tồn tại';
      return { statusCode: HttpStatus.CONFLICT, message };
    }
    // Vi phạm khóa ngoại: tham chiếu tới bản ghi không tồn tại, hoặc xóa bản ghi đang được dùng
    case 'P2003':
      return {
        statusCode: HttpStatus.CONFLICT,
        message: 'Dữ liệu liên quan không hợp lệ hoặc đang được sử dụng',
      };
    case 'P2025':
      return {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Không tìm thấy dữ liệu',
      };
    default:
      return null;
  }
}

function mapHttpException(exception: HttpException): ErrorResult {
  const statusCode = exception.getStatus();
  const body = exception.getResponse();

  if (typeof body === 'string') {
    return { statusCode, message: body };
  }

  const { message, errors } = body as {
    message?: string | string[];
    errors?: FieldError[];
  };

  // Lỗi validate (do exceptionFactory của ValidationPipe tạo ra)
  if (Array.isArray(errors)) {
    return {
      statusCode,
      message: typeof message === 'string' ? message : 'Dữ liệu không hợp lệ',
      errors,
    };
  }

  return {
    statusCode,
    message: Array.isArray(message)
      ? message.join('; ')
      : (message ?? exception.message),
  };
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    let result: ErrorResult | null = null;

    if (exception instanceof HttpException) {
      result = mapHttpException(exception);
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      result = mapPrismaError(exception);
    }

    if (!result) {
      // Chi tiết nội bộ chỉ ghi log phía server, không trả cho client.
      this.logger.error(
        exception instanceof Error ? exception.message : String(exception),
        exception instanceof Error ? exception.stack : undefined,
      );
      result = {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: INTERNAL_ERROR_MESSAGE,
      };
    }

    response.status(result.statusCode).json({
      success: false,
      statusCode: result.statusCode,
      message: result.message,
      ...(result.errors && { errors: result.errors }),
    });
  }
}
