import { formatNumber, formatVnd } from "@/lib/format"
import { formatYmd } from "@/lib/ymd"
import type { Voucher, VoucherStatus } from "./types"

/** "Giảm 10%, tối đa 50.000 ₫" / "Giảm 30.000 ₫". */
export function discountText(
  voucher: Pick<Voucher, "discountType" | "discountValue" | "maxDiscount">,
): string {
  if (voucher.discountType === "FIXED") return `Giảm ${formatVnd(voucher.discountValue)}`
  const base = `Giảm ${voucher.discountValue}%`
  return voucher.maxDiscount ? `${base}, tối đa ${formatVnd(voucher.maxDiscount)}` : base
}

/** "01/11/2026 – 30/06/2027", dựng từ ngày YYYY-MM-DD giờ VN của backend (không parse Date). */
export function periodText(voucher: Pick<Voucher, "startsAtDate" | "expiresAtDate">): string {
  return `${formatYmd(voucher.startsAtDate)} – ${formatYmd(voucher.expiresAtDate)}`
}

/** "3 / 100" hoặc "3 / ∞". */
export function usageText(voucher: Pick<Voucher, "usedCount" | "usageLimit">): string {
  const limit = voucher.usageLimit === null ? "∞" : formatNumber(voucher.usageLimit)
  return `${formatNumber(voucher.usedCount)} / ${limit}`
}

/** Phần trăm đã dùng (0–100) để vẽ thanh tiến độ; `null` khi không giới hạn. */
export function usagePercent(voucher: Pick<Voucher, "usedCount" | "usageLimit">): number | null {
  if (voucher.usageLimit === null || voucher.usageLimit <= 0) return null
  return Math.min(100, Math.round((voucher.usedCount / voucher.usageLimit) * 100))
}

/** Lời nhắc sau khi BẬT: voucher bật rồi vẫn có thể chưa dùng được vì trạng thái suy ra. */
export function enabledNote(status: VoucherStatus, startsAtDate: string): string {
  if (status === "EXPIRED") return "Mã đã hết hạn nên khách chưa dùng được."
  if (status === "EXHAUSTED") return "Mã đã hết lượt dùng nên khách chưa dùng được."
  if (status === "SCHEDULED") return `Mã có hiệu lực từ ${formatYmd(startsAtDate)}.`
  return "Khách có thể dùng mã này ngay."
}
