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
  paymentMethod: "COD"
  voucherCode?: string
}

/** Kết quả đặt đơn: checkout chỉ cần mã đơn để chuyển trang (chi tiết đơn thuộc `features/orders`). */
export interface PlacedOrder {
  code: string
}
