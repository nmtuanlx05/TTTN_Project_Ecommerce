import type { Prisma } from '../generated/prisma/client';

// Mỗi `select` là danh sách trường được phép trả ra. Không có stock/reserved, không có password.
// Truy vấn lồng một lượt (đơn → dòng, lịch sử → người thao tác) nên không N+1.

const itemSelect = {
  productName: true,
  sku: true,
  size: true,
  color: true,
  colorHex: true,
  imageUrl: true,
  quantity: true,
  price: true,
} as const;

const orderBaseSelect = {
  id: true,
  code: true,
  status: true,
  paymentMethod: true,
  paymentStatus: true,
  paidAt: true,
  subtotal: true,
  discountAmount: true,
  voucherCode: true,
  shippingFee: true,
  totalAmount: true,
  customerName: true,
  customerPhone: true,
  shippingAddress: true,
  provinceCode: true,
  provinceName: true,
  districtCode: true,
  districtName: true,
  wardCode: true,
  wardName: true,
  addressLine: true,
  note: true,
  cancelReason: true,
  createdAt: true,
  updatedAt: true,
  items: { select: itemSelect, orderBy: { id: 'asc' } },
  statusHistories: {
    select: {
      fromStatus: true,
      toStatus: true,
      reason: true,
      createdAt: true,
      actor: { select: { id: true, name: true, role: true } },
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
} as const satisfies Prisma.OrderSelect;

export const customerOrderSelect = orderBaseSelect;

export const adminOrderSelect = {
  ...orderBaseSelect,
  customerEmail: true,
  user: { select: { id: true, email: true, name: true } },
  handledBy: { select: { id: true, name: true } },
} as const satisfies Prisma.OrderSelect;

// Danh sách: không kèm lịch sử, dòng hàng chỉ gồm trường để hiển thị
export const orderListSelect = {
  id: true,
  code: true,
  status: true,
  paymentMethod: true,
  paymentStatus: true,
  subtotal: true,
  discountAmount: true,
  voucherCode: true,
  shippingFee: true,
  totalAmount: true,
  customerName: true,
  customerPhone: true,
  createdAt: true,
  items: { select: itemSelect, orderBy: { id: 'asc' } },
} as const satisfies Prisma.OrderSelect;

type OrderRow = Prisma.OrderGetPayload<{ select: typeof orderBaseSelect }>;
type AdminOrderRow = Prisma.OrderGetPayload<{
  select: typeof adminOrderSelect;
}>;
type OrderListRow = Prisma.OrderGetPayload<{ select: typeof orderListSelect }>;

const toItems = (items: OrderRow['items']) =>
  items.map((item) => ({ ...item, lineTotal: item.price * item.quantity }));

function toShippingAddress(row: OrderRow) {
  const level = (code: string | null, name: string | null) =>
    code && name ? { code, name } : null;
  return {
    receiverName: row.customerName,
    phone: row.customerPhone,
    province: level(row.provinceCode, row.provinceName),
    district: level(row.districtCode, row.districtName),
    // null khi quận/huyện không có phường/xã
    ward: level(row.wardCode, row.wardName),
    addressLine: row.addressLine,
    // Chuỗi ghép đầy đủ; đơn cũ (trước khi có 3 cấp) chỉ có chuỗi này
    fullAddress: row.shippingAddress,
    note: row.note,
  };
}

// Khách chỉ thấy vai trò người đổi trạng thái, không thấy tên/id nhân viên
export function toCustomerOrder(row: OrderRow) {
  return {
    ...toOrderCommon(row),
    history: row.statusHistories.map((h) => ({
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      reason: h.reason,
      createdAt: h.createdAt,
      byRole: h.actor?.role ?? 'SYSTEM',
    })),
  };
}

export function toAdminOrder(row: AdminOrderRow) {
  return {
    ...toOrderCommon(row),
    customer: row.user,
    customerEmail: row.customerEmail,
    handledBy: row.handledBy,
    history: row.statusHistories.map((h) => ({
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      reason: h.reason,
      createdAt: h.createdAt,
      actor: h.actor,
    })),
  };
}

function toOrderCommon(row: OrderRow) {
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    paymentMethod: row.paymentMethod,
    paymentStatus: row.paymentStatus,
    paidAt: row.paidAt,
    items: toItems(row.items),
    subtotal: row.subtotal,
    discountAmount: row.discountAmount,
    voucherCode: row.voucherCode,
    shippingFee: row.shippingFee,
    totalAmount: row.totalAmount,
    shippingAddress: toShippingAddress(row),
    cancelReason: row.cancelReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toOrderListItem(row: OrderListRow) {
  return { ...row, items: toItems(row.items) };
}

// Danh sách "Đơn hàng của tôi": chỉ đủ để vẽ thẻ đơn. Không có địa chỉ, SĐT, giá từng dòng hay trường nội bộ.
export const myOrderListSelect = {
  id: true,
  code: true,
  status: true,
  paymentMethod: true,
  paymentStatus: true,
  totalAmount: true,
  createdAt: true,
  items: {
    select: {
      productName: true,
      imageUrl: true,
      quantity: true,
      size: true,
      color: true,
    },
    orderBy: { id: 'asc' },
  },
} as const satisfies Prisma.OrderSelect;

type MyOrderListRow = Prisma.OrderGetPayload<{
  select: typeof myOrderListSelect;
}>;

export function toMyOrderListItem(row: MyOrderListRow) {
  return {
    ...row,
    // Tổng số lượng (không phải số dòng)
    itemCount: row.items.reduce((sum, item) => sum + item.quantity, 0),
  };
}
