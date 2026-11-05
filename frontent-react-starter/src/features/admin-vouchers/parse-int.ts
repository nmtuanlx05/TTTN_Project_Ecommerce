/** Số nguyên không âm từ ô nhập (chỉ chữ số). Trống hoặc có ký tự khác thì `NaN`. */
export function parseInteger(text: string): number {
  const trimmed = text.trim()
  return /^\d+$/.test(trimmed) ? Number(trimmed) : Number.NaN
}
