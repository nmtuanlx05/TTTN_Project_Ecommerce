import { createCn } from "cn/config"
// `?raw` đọc nguyên văn global.css để lấy danh sách cỡ chữ từ chính token của theme.
import themeCss from "../global.css?raw"

/**
 * Tên các cỡ chữ tùy biến: mọi `--text-<tên>` trong `@theme` của global.css
 * (`display`, `h1`, `body-sm`, `caption`…). Biến phụ như `--text-h1--line-height`
 * có `--` trong tên nên bị loại.
 */
function readFontSizeTokens(css: string): string[] {
  const names = new Set<string>()
  for (const match of css.matchAll(/(?:^|[\s{;])--text-([a-z0-9]+(?:-[a-z0-9]+)*)\s*:/g)) {
    names.add(match[1])
  }
  return [...names]
}

const FONT_SIZE_TOKENS = readFontSizeTokens(themeCss)

// Không có token thì cn() sẽ lại coi `text-body-sm` là class màu và xóa nhầm
// `text-ink`, `text-primary-fg`… mà không báo gì. Dừng hẳn để lỗi lộ ra ngay.
if (FONT_SIZE_TOKENS.length === 0) {
  throw new Error(
    "Không đọc được cỡ chữ nào (--text-*) từ src/global.css. Nếu đã đổi tên token thì cập nhật regex trong src/lib/utils.ts.",
  )
}

/**
 * Gộp class Tailwind. Khai báo các cỡ chữ tùy biến thuộc nhóm `font-size` để
 * `text-body-sm` + `text-ink` giữ được cả hai (cỡ chữ và màu chữ), còn
 * `text-sm` + `text-body-sm` thì cái sau thắng.
 */
export const cn = createCn({
  extend: { classGroups: { "font-size": [{ text: FONT_SIZE_TOKENS }] } },
})
