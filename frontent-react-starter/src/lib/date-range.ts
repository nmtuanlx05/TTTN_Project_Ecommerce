import {
  differenceInCalendarDays,
  endOfDay,
  startOfDay,
  startOfMonth,
  subDays,
} from "date-fns"

export type RangePreset = "7d" | "30d" | "month" | "custom"

export type DateRange = {
  from: Date
  to: Date
}

export const PRESET_OPTIONS: { value: RangePreset; label: string }[] = [
  { value: "7d", label: "7 ngày" },
  { value: "30d", label: "30 ngày" },
  { value: "month", label: "Tháng này" },
  { value: "custom", label: "Tùy chọn" },
]

export function isRangePreset(value: string | null): value is RangePreset {
  return value === "7d" || value === "30d" || value === "month" || value === "custom"
}

/** Quy đổi preset thành khoảng ngày cụ thể. `custom` cần `fallback`. */
export function resolveRange(preset: RangePreset, custom?: DateRange): DateRange {
  const today = endOfDay(new Date())

  switch (preset) {
    case "7d":
      return { from: startOfDay(subDays(today, 6)), to: today }
    case "30d":
      return { from: startOfDay(subDays(today, 29)), to: today }
    case "month":
      return { from: startOfMonth(today), to: today }
    case "custom":
      return custom ?? { from: startOfDay(subDays(today, 29)), to: today }
  }
}

/**
 * Kỳ liền trước, dài đúng bằng kỳ hiện tại, để tính phần trăm tăng giảm.
 * Ví dụ: 06/09–05/10 (30 ngày) → kỳ trước là 07/08–05/09.
 */
export function previousRange(range: DateRange): DateRange {
  const days = dayCount(range)
  const to = endOfDay(subDays(range.from, 1))
  return { from: startOfDay(subDays(to, days - 1)), to }
}

export function dayCount(range: DateRange): number {
  return differenceInCalendarDays(range.to, range.from) + 1
}

/** Dùng cho <input type="date"> — luôn là yyyy-MM-dd theo giờ địa phương. */
export function toDateInputValue(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

export function fromDateInputValue(value: string): Date | null {
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}
