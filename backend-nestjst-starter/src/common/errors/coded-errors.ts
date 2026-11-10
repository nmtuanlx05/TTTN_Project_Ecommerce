import {
  BadRequestException,
  BadGatewayException,
  ConflictException,
  HttpException,
  HttpStatus,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

// Lỗi kèm `code` máy đọc được (VD VOUCHER_EXPIRED) để giao diện hiển thị đúng thông báo.
// AllExceptionsFilter chép `code` (và `errors` nếu có) từ body ra response; lỗi cũ không có code nên không đổi.
export interface CodedErrorExtra {
  errors?: { field: string; message: string }[];
}

export const badRequest = (
  code: string,
  message: string,
  extra?: CodedErrorExtra,
) => new BadRequestException({ message, code, ...extra });

export const conflict = (
  code: string,
  message: string,
  extra?: CodedErrorExtra,
) => new ConflictException({ message, code, ...extra });

export const notFound = (code: string, message: string) =>
  new NotFoundException({ message, code });

export const serviceUnavailable = (code: string, message: string) =>
  new ServiceUnavailableException({ message, code });

export const badGateway = (code: string, message: string) =>
  new BadGatewayException({ message, code });

export const tooManyRequests = (code: string, message: string) =>
  new HttpException({ message, code }, HttpStatus.TOO_MANY_REQUESTS);
