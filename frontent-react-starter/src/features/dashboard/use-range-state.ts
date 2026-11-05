import { useSearchParams } from "react-router-dom"
import {
  isRangePreset,
  parseCustomRange,
  resolveRange,
  type DateRange,
  type RangePreset,
} from "@/lib/date-range"

/**
 * Khoảng thời gian nằm trên URL (`?range=30d`, hoặc `?range=custom&from=YYYY-MM-DD&to=YYYY-MM-DD`)
 * nên F5 và gửi link đều giữ lựa chọn. Giá trị URL không đáng tin: sai dạng, ngược, quá 366 ngày
 * hoặc ở tương lai thì rơi về khoảng mặc định (30 ngày).
 */
export function useRangeState() {
  const [searchParams, setSearchParams] = useSearchParams()
  const raw = searchParams.get("range")
  const preset: RangePreset = isRangePreset(raw) ? raw : "30d"
  const custom = parseCustomRange(searchParams.get("from"), searchParams.get("to"))
  const range = resolveRange(preset, custom ?? undefined)

  const write = (next: RangePreset, dates?: DateRange) => {
    const params = new URLSearchParams(searchParams)
    params.set("range", next)
    if (dates) {
      params.set("from", dates.from)
      params.set("to", dates.to)
    } else {
      params.delete("from")
      params.delete("to")
    }
    setSearchParams(params, { replace: true })
  }

  return {
    preset,
    range,
    /** Chuyển sang "Tùy chọn" thì giữ nguyên khoảng đang xem làm điểm xuất phát. */
    setPreset: (next: RangePreset) => write(next, next === "custom" ? range : undefined),
    setCustomRange: (next: DateRange) => write("custom", next),
  }
}
