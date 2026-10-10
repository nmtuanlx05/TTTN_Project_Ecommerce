import { useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import {
  isRangePreset,
  resolveRange,
  type DateRange,
  type RangePreset,
} from "@/lib/date-range"

/**
 * Khoảng thời gian nằm trong query param (`?range=30d`), nên refresh hay chia
 * sẻ link đều giữ nguyên lựa chọn — không cần store toàn cục cho một mẩu state
 * sống trong đúng một trang.
 */
export function useRangeState() {
  const [searchParams, setSearchParams] = useSearchParams()
  const raw = searchParams.get("range")
  const preset: RangePreset = isRangePreset(raw) ? raw : "30d"

  const [customRange, setCustomRange] = useState<DateRange>(() =>
    resolveRange("30d"),
  )

  const setPreset = (next: RangePreset) => {
    const params = new URLSearchParams(searchParams)
    params.set("range", next)
    setSearchParams(params, { replace: true })
  }

  const range = useMemo(
    () => resolveRange(preset, customRange),
    [preset, customRange],
  )

  return { preset, setPreset, customRange, setCustomRange, range }
}
