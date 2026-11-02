/**
 * Số lượng nhập tay là chuỗi chỉ gồm chữ số (không nhận dấu chấm: "1.5" hay "1.000" dễ bị hiểu sai
 * giữa phần thập phân và dấu ngăn nghìn). Trả `null` nếu rỗng hoặc có ký tự khác.
 */
export function parseQuantityInput(text: string): number | null {
  const trimmed = text.trim()
  if (!/^\d+$/.test(trimmed)) return null
  const value = Number(trimmed)
  return Number.isSafeInteger(value) ? value : null
}

/** Bỏ mọi ký tự không phải chữ số khi gõ hoặc dán, để ô chỉ nhận số nguyên không âm. */
export function sanitizeQuantityInput(text: string): string {
  return text.replace(/\D/g, "")
}
