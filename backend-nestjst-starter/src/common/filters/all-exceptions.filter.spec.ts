// Mock của Jest có kiểu any nên test đọc calls cần tắt các rule unsafe-* cho file này.
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  Logger,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

function run(exception: unknown) {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;
  new AllExceptionsFilter().catch(exception, host);
  return { status: status.mock.calls[0][0], body: json.mock.calls[0][0] };
}

describe('AllExceptionsFilter: trường code', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('lỗi có code → response có code', () => {
    const { status, body } = run(
      new ConflictException({ message: 'Giỏ hàng trống', code: 'CART_EMPTY' }),
    );
    expect(status).toBe(409);
    expect(body).toEqual({
      success: false,
      statusCode: 409,
      message: 'Giỏ hàng trống',
      code: 'CART_EMPTY',
    });
  });

  it('lỗi có code kèm errors theo dòng → giữ cả hai', () => {
    const { body } = run(
      new ConflictException({
        message: 'x',
        code: 'CART_ITEMS_UNAVAILABLE',
        errors: [{ field: 'items.1', message: 'hết hàng' }],
      }),
    );
    expect(body.code).toBe('CART_ITEMS_UNAVAILABLE');
    expect(body.errors).toEqual([{ field: 'items.1', message: 'hết hàng' }]);
  });

  it('lỗi cũ không có code → response KHÔNG đổi (không có khóa code)', () => {
    const notFound = run(new NotFoundException('Không tìm thấy sản phẩm'));
    expect(notFound.body).toEqual({
      success: false,
      statusCode: 404,
      message: 'Không tìm thấy sản phẩm',
    });
    expect('code' in notFound.body).toBe(false);

    const validation = run(
      new BadRequestException({
        message: 'Dữ liệu không hợp lệ',
        errors: [{ field: 'a', message: 'sai' }],
      }),
    );
    expect(validation.body).toEqual({
      success: false,
      statusCode: 400,
      message: 'Dữ liệu không hợp lệ',
      errors: [{ field: 'a', message: 'sai' }],
    });
  });

  it('lỗi không lường trước vẫn là 500 chung, không có code', () => {
    const { status, body } = run(new Error('chi tiết nội bộ'));
    expect(status).toBe(500);
    expect(body.message).toBe('Lỗi hệ thống, vui lòng thử lại sau');
    expect('code' in body).toBe(false);
  });
});
