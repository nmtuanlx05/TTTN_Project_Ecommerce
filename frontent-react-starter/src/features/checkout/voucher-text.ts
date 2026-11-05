import { formatVnd } from "@/lib/format"
import type { PreviewVoucher } from "./types"

/** "Giảm 10%" / "Giảm 50.000 ₫", dựng từ loại và giá trị voucher. */
export function voucherTitle(voucher: Pick<PreviewVoucher, "discountType" | "discountValue">): string {
  return voucher.discountType === "PERCENT"
    ? `Giảm ${voucher.discountValue}%`
    : `Giảm ${formatVnd(voucher.discountValue)}`
}

/** "Tối đa X · cho đơn từ Y"; bỏ phần không có. */
export function voucherCondition(voucher: Pick<PreviewVoucher, "maxDiscount" | "minOrderValue">): string {
  const parts: string[] = []
  if (voucher.maxDiscount) parts.push(`Tối đa ${formatVnd(voucher.maxDiscount)}`)
  if (voucher.minOrderValue > 0) parts.push(`cho đơn từ ${formatVnd(voucher.minOrderValue)}`)
  return parts.join(" · ")
}
