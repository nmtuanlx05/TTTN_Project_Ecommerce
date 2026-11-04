import { COLOR_HEX_REGEX } from "./constants"
import { foldKey } from "./schema-checks"

interface Row {
  color: string
  colorHex: string
}

/** Chỉ số các hàng KHÁC `index` cùng tên màu (không phân biệt dấu/hoa thường); tên màu trống thì không khớp hàng nào. */
export function sameColorRows(rows: Row[], index: number): number[] {
  const key = foldKey(rows[index]?.color ?? "")
  if (key === "") return []
  return rows.flatMap((row, position) => (position !== index && foldKey(row.color) === key ? [position] : []))
}

/** Mã màu cần tự điền cho hàng `index` (đang trống) từ một hàng cùng tên màu đã có mã hợp lệ; không có thì `undefined`. */
export function inheritedHex(rows: Row[], index: number): string | undefined {
  if (rows[index]?.colorHex.trim() !== "") return undefined
  const source = sameColorRows(rows, index).find((position) => COLOR_HEX_REGEX.test(rows[position].colorHex.trim()))
  return source === undefined ? undefined : rows[source].colorHex.trim().toUpperCase()
}

/** Giá trị đủ để áp cho các hàng cùng màu: rỗng (xóa mã) hoặc `#RRGGBB`. Đang gõ dở thì không áp. */
export const isSyncableHex = (value: string) => value === "" || COLOR_HEX_REGEX.test(value)
