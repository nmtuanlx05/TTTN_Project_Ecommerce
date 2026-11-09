import { OrderStatus } from '../generated/prisma/enums';

// Bảng chuyển trạng thái đơn (docs/02): PENDING → CONFIRMED → SHIPPING → COMPLETED, hủy khi PENDING/CONFIRMED.
// Đơn online: PENDING_PAYMENT → PENDING (chỉ SYSTEM: đã nhận chuyển khoản) hoặc → CANCELLED (khách/nhân viên hủy, hoặc SYSTEM khi hết hạn).
// RETURNED chưa triển khai. SYSTEM là tiến trình hệ thống (đối soát chuyển khoản, tác vụ hết hạn), không phải một user đăng nhập.
export type OrderActor = 'CUSTOMER' | 'STAFF' | 'ADMIN' | 'SYSTEM';

const OPERATORS: OrderActor[] = ['STAFF', 'ADMIN'];

export const ORDER_TRANSITIONS: Partial<
  Record<OrderStatus, Partial<Record<OrderStatus, OrderActor[]>>>
> = {
  [OrderStatus.PENDING_PAYMENT]: {
    [OrderStatus.PENDING]: ['SYSTEM'],
    [OrderStatus.CANCELLED]: ['CUSTOMER', ...OPERATORS, 'SYSTEM'],
  },
  [OrderStatus.PENDING]: {
    [OrderStatus.CONFIRMED]: OPERATORS,
    [OrderStatus.CANCELLED]: ['CUSTOMER', ...OPERATORS],
  },
  [OrderStatus.CONFIRMED]: {
    // Trừ kho thật ở bước này (OrderWorkflowService → InventoryService.shipOut)
    [OrderStatus.SHIPPING]: OPERATORS,
    [OrderStatus.CANCELLED]: OPERATORS,
  },
  [OrderStatus.SHIPPING]: {
    [OrderStatus.COMPLETED]: OPERATORS,
  },
};

// Người được phép thực hiện bước từ -> to; undefined = bước không hợp lệ
export const getTransitionActors = (from: OrderStatus, to: OrderStatus) =>
  ORDER_TRANSITIONS[from]?.[to];

// Bước đi từ `from` (không xét ai thực hiện)
export const isValidTransition = (from: OrderStatus, to: OrderStatus) =>
  getTransitionActors(from, to) !== undefined;
