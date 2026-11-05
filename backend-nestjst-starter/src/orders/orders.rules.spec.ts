import { OrderStatus } from '../generated/prisma/enums';
import { getTransitionActors, isValidTransition } from './orders.rules';

const S = OrderStatus;

describe('bảng chuyển trạng thái đơn', () => {
  it.each([
    [S.PENDING, S.CONFIRMED],
    [S.CONFIRMED, S.SHIPPING],
    [S.SHIPPING, S.COMPLETED],
    [S.PENDING, S.CANCELLED],
    [S.CONFIRMED, S.CANCELLED],
  ])('%s → %s hợp lệ', (from, to) => {
    expect(isValidTransition(from, to)).toBe(true);
  });

  it.each([
    [S.PENDING, S.SHIPPING],
    [S.PENDING, S.COMPLETED],
    [S.CONFIRMED, S.COMPLETED],
    [S.CONFIRMED, S.PENDING],
    [S.SHIPPING, S.CANCELLED],
    [S.SHIPPING, S.CONFIRMED],
    [S.SHIPPING, S.RETURNED],
    [S.COMPLETED, S.CANCELLED],
    [S.COMPLETED, S.SHIPPING],
    [S.CANCELLED, S.PENDING],
    [S.CANCELLED, S.CONFIRMED],
    [S.PENDING, S.PENDING_PAYMENT],
    [S.PENDING_PAYMENT, S.CANCELLED],
  ])('%s → %s không hợp lệ', (from, to) => {
    expect(isValidTransition(from, to)).toBe(false);
  });

  it('COMPLETED là trạng thái cuối (không có bước đi tiếp)', () => {
    for (const to of Object.values(S)) {
      expect(isValidTransition(S.COMPLETED, to)).toBe(false);
    }
  });

  it('khách chỉ hủy được khi PENDING', () => {
    expect(getTransitionActors(S.PENDING, S.CANCELLED)).toContain('CUSTOMER');
    expect(getTransitionActors(S.CONFIRMED, S.CANCELLED)).not.toContain(
      'CUSTOMER',
    );
    expect(getTransitionActors(S.CONFIRMED, S.CANCELLED)).toEqual([
      'STAFF',
      'ADMIN',
    ]);
    expect(getTransitionActors(S.SHIPPING, S.CANCELLED)).toBeUndefined();
  });

  it('enum OrderStatus không còn PACKING', () => {
    expect(Object.values(S)).not.toContain('PACKING');
    expect(Object.values(S)).toEqual([
      'PENDING',
      'CONFIRMED',
      'SHIPPING',
      'COMPLETED',
      'CANCELLED',
      'RETURNED',
      'PENDING_PAYMENT',
    ]);
  });

  it('chuỗi chính chỉ có một bước đi tới từ mỗi trạng thái (trừ nhánh hủy)', () => {
    const forward = (from: OrderStatus) =>
      Object.values(S).filter(
        (to) => to !== S.CANCELLED && isValidTransition(from, to),
      );
    expect(forward(S.PENDING)).toEqual([S.CONFIRMED]);
    expect(forward(S.CONFIRMED)).toEqual([S.SHIPPING]);
    expect(forward(S.SHIPPING)).toEqual([S.COMPLETED]);
    expect(forward(S.COMPLETED)).toEqual([]);
  });

  it('khách không được xác nhận hay giao đơn', () => {
    expect(getTransitionActors(S.PENDING, S.CONFIRMED)).toEqual([
      'STAFF',
      'ADMIN',
    ]);
    expect(getTransitionActors(S.CONFIRMED, S.SHIPPING)).toEqual([
      'STAFF',
      'ADMIN',
    ]);
  });
});
