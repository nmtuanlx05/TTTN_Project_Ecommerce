import { parseInteger } from "./parse-int"
import type { DiscountType } from "./types"

export const EXAMPLE_SUBTOTAL = 1_000_000

export type DiscountPreview =
  | { kind: "ok"; amount: number }
  | { kind: "below-min"; minOrderValue: number }

/**
 * Ví dụ minh họa trên form. ĐÂY LÀ BẢN SAO quy tắc giảm giá của backend (`orders.pricing.ts`):
 * PERCENT làm tròn xuống rồi không vượt `maxDiscount`; mọi loại không vượt tổng đơn. Backend vẫn là nơi tính thật.
 * Đổi quy tắc ở backend thì phải đổi cả ở đây (đã ghi vào "Việc tồn đọng" của docs/cau-truc-thu-muc.md).
 * Trả `null` khi giá trị nhập chưa hợp lệ (chưa đủ để minh họa).
 */
export function previewDiscount(input: {
  discountType: DiscountType
  discountValue: string
  maxDiscount: string
  minOrderValue: string
}): DiscountPreview | null {
  const value = parseInteger(input.discountValue)
  if (!Number.isFinite(value) || value <= 0) return null

  const minOrderValue = Number.isFinite(parseInteger(input.minOrderValue))
    ? parseInteger(input.minOrderValue)
    : 0
  if (EXAMPLE_SUBTOTAL < minOrderValue) return { kind: "below-min", minOrderValue }

  let amount = value
  if (input.discountType === "PERCENT") {
    if (value > 100) return null
    amount = Math.floor((EXAMPLE_SUBTOTAL * value) / 100)
    const max = parseInteger(input.maxDiscount)
    if (Number.isFinite(max) && max > 0) amount = Math.min(amount, max)
  }
  return { kind: "ok", amount: Math.min(amount, EXAMPLE_SUBTOTAL) }
}
