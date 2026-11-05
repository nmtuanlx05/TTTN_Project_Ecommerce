import { todayVn } from "@/lib/format"

export type RangePreset = "7d" | "30d" | "month" | "custom"

/** Khoảng ngày theo GMT+7, mỗi đầu mút là chuỗi YYYY-MM-DD (đúng dạng backend nhận). */
export type DateRange = {
  from: string
  to: string
}

/** Khớp backend `MAX_RANGE_DAYS` và `MIN_DATE` (src/dashboard/dashboard.constants.ts). */
export const MAX_RANGE_DAYS = 366
export const MIN_DATE = "2000-01-01"

export const PRESET_OPTIONS: { value: RangePreset; label: string }[] = [
  { value: "7d", label: "7 ngày" },
  { value: "30d", label: "30 ngày" },
  { value: "month", label: "Tháng này" },
  { value: "custom", label: "Tùy chọn" },
]

export function isRangePreset(value: string | null): value is RangePreset {
  return value === "7d" || value === "30d" || value === "month" || value === "custom"
}

const DAY_MS = 24 * 60 * 60 * 1000
const YMD_REGEX = /^\d{4}-\d{2}-\d{2}$/

function toUtcMs(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number)
  return Date.UTC(y, m - 1, d)
}

/** Cộng/trừ ngày trên chuỗi YYYY-MM-DD bằng số học UTC thuần, không phụ thuộc múi giờ máy. */
export function addDays(ymd: string, days: number): string {
  return new Date(toUtcMs(ymd) + days * DAY_MS).toISOString().slice(0, 10)
}

/** Chuỗi phải đúng dạng và là ngày có thật (2026-02-31 bị loại). */
export function isValidYmd(value: string | null): value is string {
  if (!value || !YMD_REGEX.test(value)) return false
  return new Date(toUtcMs(value)).toISOString().slice(0, 10) === value
}

export function dayCount(range: DateRange): number {
  return Math.round((toUtcMs(range.to) - toUtcMs(range.from)) / DAY_MS) + 1
}

function isAllowedRange(range: DateRange): boolean {
  return (
    range.from >= MIN_DATE &&
    range.to <= todayVn() &&
    range.from <= range.to &&
    dayCount(range) <= MAX_RANGE_DAYS
  )
}

/** Đọc khoảng tùy chọn từ URL; không hợp lệ (sai dạng, ngược, quá dài, tương lai) thì null. */
export function parseCustomRange(from: string | null, to: string | null): DateRange | null {
  if (!isValidYmd(from) || !isValidYmd(to)) return null
  const range = { from, to }
  return isAllowedRange(range) ? range : null
}

/** Quy đổi preset thành khoảng ngày cụ thể (hôm nay theo giờ VN). `custom` rơi về 30 ngày nếu thiếu `custom`. */
export function resolveRange(preset: RangePreset, custom?: DateRange): DateRange {
  const today = todayVn()
  switch (preset) {
    case "7d":
      return { from: addDays(today, -6), to: today }
    case "30d":
      return { from: addDays(today, -29), to: today }
    case "month":
      return { from: `${today.slice(0, 8)}01`, to: today }
    case "custom":
      return custom ?? { from: addDays(today, -29), to: today }
  }
}

/**
 * Áp một đầu mút mới do người dùng chọn rồi kéo đầu mút kia cho khoảng luôn hợp lệ:
 * chặn tương lai và trước MIN_DATE, `from` ≤ `to`, tối đa MAX_RANGE_DAYS ngày.
 */
export function adjustCustomRange(
  range: DateRange,
  field: "from" | "to",
  value: string,
): DateRange {
  const today = todayVn()
  // So sánh chuỗi YYYY-MM-DD theo thứ tự từ điển cũng là thứ tự thời gian
  const picked = value < MIN_DATE ? MIN_DATE : value > today ? today : value
  if (field === "from") {
    const to = picked > range.to ? picked : range.to
    const limit = addDays(picked, MAX_RANGE_DAYS - 1)
    return { from: picked, to: to > limit ? limit : to }
  }
  const from = picked < range.from ? picked : range.from
  const limit = addDays(picked, -(MAX_RANGE_DAYS - 1))
  return { from: from < limit ? limit : from, to: picked }
}
