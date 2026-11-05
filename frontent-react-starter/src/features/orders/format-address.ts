import type { ShippingAddress } from "./types"

/** Ghép địa chỉ giao từ từng cấp (địa chỉ cụ thể, phường/xã nếu có, quận/huyện, tỉnh/thành); đơn cũ chưa có từng cấp thì dùng `fullAddress`. */
export function formatAddress(address: ShippingAddress): string {
  if (!address.province || !address.district) return address.fullAddress
  return [address.addressLine, address.ward?.name, address.district.name, address.province.name]
    .filter(Boolean)
    .join(", ")
}
