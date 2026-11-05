/** Kiểu đối tượng đơn của API (docs/api/orders.md, mục "Đối tượng đơn"). Tiền là VND, số nguyên. */

export interface OrderItem {
  productName: string
  sku: string
  size: string
  color: string
  colorHex: string | null
  imageUrl: string | null
  quantity: number
  price: number
  lineTotal: number
}

interface NamedCode {
  code: string
  name: string
}

export interface ShippingAddress {
  receiverName: string
  phone: string
  /** Ba cấp là `null` với đơn cũ (trước khi có địa chỉ 3 cấp); khi đó chỉ có `fullAddress`. `ward` còn `null` khi quận/huyện không có phường/xã. */
  province: NamedCode | null
  district: NamedCode | null
  ward: NamedCode | null
  addressLine: string
  fullAddress: string
  note: string | null
}

export type OrderPaymentMethod = "COD" | "ONLINE"

export interface Order {
  id: number
  code: string
  status: string
  paymentMethod: OrderPaymentMethod
  paymentStatus: string
  items: OrderItem[]
  subtotal: number
  discountAmount: number
  voucherCode: string | null
  shippingFee: number
  totalAmount: number
  shippingAddress: ShippingAddress
  createdAt: string
}
