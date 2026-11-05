import { OrderStatus } from '../generated/prisma/enums';

// Bảng chuyển trạng thái đơn (docs/02): PENDING → CONFIRMED → SHIPPING → COMPLETED, hủy khi PENDING/CONFIRMED. Bản này RETURNED chưa triển khai và PENDING_PAYMENT chỉ do hệ thống
// (cổng thanh toán, chưa làm) nên không có bước nào dẫn tới/ đi từ chúng cho người dùng.
export type OrderActor = 'CUSTOMER' | 'STAFF' | 'ADMIN';

const OPERATORS: OrderActor[] = ['STAFF', 'ADMIN'];

export const ORDER_TRANSITIONS: Partial<
  Record<OrderStatus, Partial<Record<OrderStatus, OrderActor[]>>>
> = {
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
