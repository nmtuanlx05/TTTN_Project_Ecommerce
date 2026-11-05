/**
 * Ngày lịch dạng chuỗi `YYYY-MM-DD` (không có giờ, không có múi giờ). Mọi hàm ở đây làm trên chuỗi và số,
 * KHÔNG dùng `Date`/`toISOString`, nên không bao giờ lệch ngày theo múi giờ của máy.
 */

const YMD_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/

function parse(ymd: string): [number, number, number] | null {
  const match = YMD_REGEX.exec(ymd)
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 29 : 28
  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

const pad = (value: number, length = 2) => String(value).padStart(length, "0")

/** "2026-11-05" → "05/11/2026". Chuỗi sai dạng được trả lại nguyên. */
export function formatYmd(ymd: string): string {
  const parts = parse(ymd)
  return parts ? `${pad(parts[2])}/${pad(parts[1])}/${parts[0]}` : ymd
}

/** Cộng (hoặc trừ, nếu âm) số ngày: "2026-11-05" + 30 → "2026-12-05". Chuỗi sai dạng được trả lại nguyên. */
export function addDaysYmd(ymd: string, days: number): string {
  const parts = parse(ymd)
  if (!parts) return ymd
  let [year, month, day] = parts
  for (let left = Math.abs(days); left > 0; left--) {
    if (days > 0) {
      day += 1
      if (day > daysInMonth(year, month)) {
        day = 1
        month += 1
        if (month > 12) {
          month = 1
          year += 1
        }
      }
    } else {
      day -= 1
      if (day < 1) {
        month -= 1
        if (month < 1) {
          month = 12
          year -= 1
        }
        day = daysInMonth(year, month)
      }
    }
  }
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`
}
