import { formatVnd } from "@/lib/format"
import { PRICE_RANGES } from "./constants"

/** Nhãn khoảng giá: khoảng nhanh thì dùng nhãn của nó, giá tùy ý trên URL thì tự ghép ("Từ …", "Đến …", "… – …"). */
export function priceRangeLabel(min: number | undefined, max: number | undefined): string {
  const preset = PRICE_RANGES.find((range) => range.min === min && range.max === max)
  if (preset) return preset.label
  if (min !== undefined && max !== undefined) return `${formatVnd(min)} – ${formatVnd(max)}`
  if (min !== undefined) return `Từ ${formatVnd(min)}`
  return `Đến ${formatVnd(max ?? 0)}`
}
