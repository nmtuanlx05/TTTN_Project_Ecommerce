import { format } from "date-fns"
import { vi } from "date-fns/locale"

/** Tiền tệ là VND, kiểu Int — không có phần thập phân. */
const vnd = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
})

export function formatVnd(amount: number): string {
  return vnd.format(amount)
}

const decimal = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 })
const integer = new Intl.NumberFormat("vi-VN")

export function formatNumber(value: number): string {
  return integer.format(value)
}

/**
 * Rút gọn số tiền cho nhãn trục và thẻ số liệu: 12.400.000 → "12,4 triệu".
 * `short` dùng "tr" thay "triệu" cho màn hẹp, nơi trục Y không có chỗ.
 */
export function formatCompactVnd(amount: number, short = false): string {
  const billionUnit = short ? " tỷ" : " tỷ"
  const millionUnit = short ? " tr" : " triệu"
  const thousandUnit = short ? "k" : " nghìn"

  if (Math.abs(amount) >= 1_000_000_000) {
    return decimal.format(amount / 1_000_000_000) + billionUnit
  }
  if (Math.abs(amount) >= 1_000_000) {
    return decimal.format(amount / 1_000_000) + millionUnit
  }
  if (Math.abs(amount) >= 1_000) {
    return decimal.format(amount / 1_000) + thousandUnit
  }
  return integer.format(amount)
}

/** Tỉ lệ phần trăm có dấu: 0.124 → "+12,4%". */
export function formatSignedPercent(ratio: number): string {
  const sign = ratio > 0 ? "+" : ratio < 0 ? "−" : ""
  return `${sign}${decimal.format(Math.abs(ratio) * 100)}%`
}

/* --------------------------- Ngày giờ (GMT+7) ---------------------------- */

const TIME_ZONE = "Asia/Ho_Chi_Minh"

/** Ngày giờ đầy đủ theo GMT+7, bất kể máy người dùng đặt múi nào. */
const dateTime = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIME_ZONE,
})

export function formatDateTime(value: Date | string): string {
  return dateTime.format(typeof value === "string" ? new Date(value) : value)
}

const timeOnly = new Intl.DateTimeFormat("vi-VN", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIME_ZONE,
})

export function formatTime(value: Date | string): string {
  return timeOnly.format(typeof value === "string" ? new Date(value) : value)
}

/** Nhãn trục X: "05/10". */
export function formatDayMonth(value: Date | string): string {
  return format(toDate(value), "dd/MM", { locale: vi })
}

/** Tooltip và tiêu đề khoảng: "Thứ hai, 05/10/2026". */
export function formatFullDate(value: Date | string): string {
  return format(toDate(value), "EEEE, dd/MM/yyyy", { locale: vi })
}

/** Khoảng ngày gọn: "06/09 – 05/10/2026". */
export function formatDateRange(from: Date, to: Date): string {
  return `${format(from, "dd/MM", { locale: vi })} – ${format(to, "dd/MM/yyyy", { locale: vi })}`
}

function toDate(value: Date | string): Date {
  return typeof value === "string" ? new Date(value) : value
}
