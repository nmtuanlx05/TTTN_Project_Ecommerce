import { formatNumber } from "@/lib/format"

/**
 * Giá nhập tay là chuỗi: nhận "199000" hoặc "199.000" (dấu chấm ngăn nghìn kiểu vi-VN, khoảng trắng
 * bị bỏ). Dấu phẩy và mọi ký tự khác là không hợp lệ vì giá là số nguyên VND. Trả `null` nếu sai.
 */
export function parsePriceInput(text: string): number | null {
  const digits = text.replace(/[.\s]/g, "")
  if (!/^\d+$/.test(digits)) return null
  const value = Number(digits)
  return Number.isSafeInteger(value) ? value : null
}

/** "199000" → "199.000" cho ô giá khi rời ô. Chuỗi không phân tích được thì giữ nguyên để báo lỗi. */
export function formatPriceInput(text: string): string {
  const value = parsePriceInput(text)
  return value === null ? text : formatNumber(value)
}
