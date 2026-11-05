import {
  BadRequestException,
  ConflictException,
  NotFoundException,
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
