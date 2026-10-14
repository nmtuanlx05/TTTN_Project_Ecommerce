import { BadRequestException, ParseIntPipe } from '@nestjs/common';

// Pipe dùng cho param :id; id không phải số nguyên trả 400 "ID không hợp lệ".
export const parseIdPipe = new ParseIntPipe({
  exceptionFactory: () => new BadRequestException('ID không hợp lệ'),
});
