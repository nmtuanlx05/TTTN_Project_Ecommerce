import { OrderStatus } from '../generated/prisma/enums';
import { getTransitionActors, isValidTransition } from './orders.rules';

const S = OrderStatus;

describe('bảng chuyển trạng thái đơn', () => {
  it.each([
    [S.PENDING, S.CONFIRMED],
    [S.CONFIRMED, S.PACKING],
    [S.PACKING, S.SHIPPING],
    [S.SHIPPING, S.COMPLETED],
    [S.PENDING, S.CANCELLED],
    [S.CONFIRMED, S.CANCELLED],
    [S.PACKING, S.CANCELLED],
  ])('%s → %s hợp lệ', (from, to) => {
    expect(isValidTransition(from, to)).toBe(true);
  });

  it.each([
    [S.PENDING, S.PACKING],
    [S.PENDING, S.SHIPPING],
    [S.PENDING, S.COMPLETED],
    [S.CONFIRMED, S.SHIPPING],
    [S.CONFIRMED, S.PENDING],
    [S.PACKING, S.CONFIRMED],
    [S.SHIPPING, S.CANCELLED],
    [S.SHIPPING, S.PACKING],
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
    expect(getTransitionActors(S.PACKING, S.CANCELLED)).not.toContain(
      'CUSTOMER',
    );
  });

  it('khách không được xác nhận hay giao đơn', () => {
    expect(getTransitionActors(S.PENDING, S.CONFIRMED)).toEqual([
      'STAFF',
      'ADMIN',
    ]);
    expect(getTransitionActors(S.PACKING, S.SHIPPING)).not.toContain(
      'CUSTOMER',
    );
  });
});
