/** Kiểu của API xem trước/đặt đơn/voucher/địa chỉ (docs/api/orders.md, locations.md ở backend). Tiền là VND, số nguyên. */

export type DiscountType = "PERCENT" | "FIXED"

/** Dòng hàng của xem trước: cùng dạng dòng giỏ (`imageUrl`, `slug`, `colorHex` có trong code backend dù tài liệu chưa ghi). */
export interface PreviewItem {
  id: number
  variantId: number
  quantity: number
  name: string
  slug: string
  imageUrl: string | null
  size: string
  color: string
  colorHex: string | null
  unitPrice: number
  lineTotal: number
  purchasable: boolean
  inStock: boolean
}

export interface PreviewVoucher {
  code: string
  description: string | null
  discountType: DiscountType
  discountValue: number
  maxDiscount: number | null
  minOrderValue: number
}

export interface OrderPreview {
  items: PreviewItem[]
  warnings: { cartItemId: number; variantId: number; message: string }[]
  canCheckout: boolean
  subtotal: number
  discountAmount: number
  shippingFee: number
  totalAmount: number
  voucher: PreviewVoucher | null
  availablePaymentMethods: AvailablePaymentMethods
}

export type PaymentMethod = "COD" | "ONLINE"

/** `availablePaymentMethods` của xem trước. `reason` (tiếng Việt, do backend viết) có khi `enabled = false`: ONLINE chưa cấu hình hoặc tổng đơn 0đ. */
export interface PaymentMethodAvailability {
  enabled: boolean
  reason?: string
}

export interface AvailablePaymentMethods {
  cod: PaymentMethodAvailability
  online: PaymentMethodAvailability
}

export interface AvailableVoucher extends PreviewVoucher {
  expiresAt: string
}

export interface LocationItem {
  code: string
  name: string
}

export interface PlaceOrderInput {
  receiverName: string
  phone: string
  provinceCode: string
  districtCode: string
  /** Chỉ gửi khi quận/huyện có phường/xã (gửi khi không có sẽ bị 400). */
  wardCode?: string
  addressLine: string
  note?: string
  paymentMethod: PaymentMethod
  voucherCode?: string
}

/**
 * Kết quả đặt đơn: checkout chỉ cần mã đơn và cách thanh toán để chọn trang kế tiếp (chi tiết đơn thuộc `features/orders`).
 * `paymentMethod` tùy chọn vì tài liệu chỉ ghi "đối tượng đơn"; thiếu thì đi tới trang đặt hàng thành công (trang đó tự chuyển đơn chờ thanh toán sang trang QR).
 */
export interface PlacedOrder {
  code: string
  paymentMethod?: PaymentMethod
}
