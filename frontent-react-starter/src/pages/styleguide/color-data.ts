/**
 * Dữ liệu bảng màu để trình bày trên /styleguide.
 * Tỉ lệ tương phản tính sẵn bằng công thức WCAG 2.x trên đúng các mã hex này.
 */

export type Swatch = {
  token: string
  light: string
  dark: string
  note?: string
}

export const BASE_SWATCHES: Swatch[] = [
  { token: "--color-canvas", light: "#F2F1EE", dark: "#11100E", note: "Nền trang" },
  { token: "--color-surface", light: "#FAF9F7", dark: "#1C1B19", note: "Card, panel" },
  {
    token: "--color-surface-raised",
    light: "#FFFFFF",
    dark: "#262422",
    note: "Dialog, popover",
  },
  {
    token: "--color-surface-sunken",
    light: "#E5E4E0",
    dark: "#090907",
    note: "Header bảng, sidebar",
  },
  { token: "--color-ink", light: "#171614", dark: "#EEEDE9", note: "Chữ chính" },
  { token: "--color-ink-muted", light: "#5D5A58", dark: "#AEACA8", note: "Chữ phụ" },
  {
    token: "--color-ink-subtle",
    light: "#6C6A67",
    dark: "#959390",
    note: "Caption, placeholder",
  },
  {
    token: "--color-border-subtle",
    light: "#E0DEDB",
    dark: "#2C2B28",
    note: "Hairline trong card",
  },
  {
    token: "--color-border-default",
    light: "#CFCDC9",
    dark: "#3B3A37",
    note: "Viền mặc định",
  },
  {
    token: "--color-border-strong",
    light: "#A09E9A",
    dark: "#5F5D59",
    note: "Nút secondary",
  },
  {
    token: "--color-border-control",
    light: "#7C7A77",
    dark: "#767370",
    note: "Input, checkbox",
  },
  { token: "--color-primary", light: "#171614", dark: "#EEEDE9", note: "Nút chính" },
]

export type ContrastRow = {
  pair: string
  light: number | null
  dark: number | null
  note?: string
}

export const BASE_CONTRAST: ContrastRow[] = [
  { pair: "ink trên canvas", light: 16.01, dark: 16.23 },
  { pair: "ink trên surface", light: 17.19, dark: 14.69 },
  { pair: "ink trên surface-sunken", light: 14.21, dark: 17.01 },
  { pair: "ink-muted trên canvas", light: 6.06, dark: 8.39 },
  { pair: "ink-muted trên surface-sunken", light: 5.38, dark: null },
  { pair: "ink-subtle trên canvas", light: 4.77, dark: 6.21 },
  { pair: "ink-subtle trên surface", light: 5.12, dark: 5.62 },
  {
    pair: "ink-subtle trên surface-sunken",
    light: 4.24,
    dark: null,
    note: "Dưới 4.5 — cấm dùng, phải thay bằng ink-muted",
  },
  { pair: "primary-fg trên primary", light: 17.19, dark: 16.23 },
  {
    pair: "border-control trên canvas",
    light: 3.79,
    dark: 4.04,
    note: "Phi văn bản, ngưỡng 3.0",
  },
]

export type StatusSwatch = {
  status: string
  label: string
  lightBg: string
  lightFg: string
  darkBg: string
  darkFg: string
  lightRatio: number
  darkRatio: number
  outlined?: boolean
}

export const ORDER_SWATCHES: StatusSwatch[] = [
  {
    status: "PENDING",
    label: "Chờ xác nhận",
    lightBg: "#F3ECDB",
    lightFg: "#403416",
    darkBg: "#423D2F",
    darkFg: "#DED3BA",
    lightRatio: 10.36,
    darkRatio: 7.28,
  },
  {
    status: "CONFIRMED",
    label: "Đã xác nhận",
    lightBg: "#CCD9E5",
    lightFg: "#1F3548",
    darkBg: "#2D3741",
    darkFg: "#C0D4E6",
    lightRatio: 8.8,
    darkRatio: 7.96,
  },
  {
    status: "PACKING",
    label: "Đang đóng gói",
    lightBg: "#C3BDCB",
    lightFg: "#352B41",
    darkBg: "#332E39",
    darkFg: "#D4CBE0",
    lightRatio: 7.29,
    darkRatio: 8.44,
  },
  {
    status: "SHIPPING",
    label: "Đang giao",
    lightBg: "#97ACAE",
    lightFg: "#083439",
    darkBg: "#1E2F31",
    darkFg: "#B4D4D8",
    lightRatio: 5.66,
    darkRatio: 8.86,
  },
  {
    status: "RETURNED",
    label: "Trả hàng",
    lightBg: "#7F6761",
    lightFg: "#FEF7F5",
    darkBg: "#34201B",
    darkFg: "#E8C0B6",
    lightRatio: 4.94,
    darkRatio: 9.24,
  },
  {
    status: "COMPLETED",
    label: "Đã giao",
    lightBg: "#3E4C41",
    lightFg: "#F5FAF6",
    darkBg: "#18241A",
    darkFg: "#B8D0BC",
    lightRatio: 8.59,
    darkRatio: 9.79,
  },
  {
    status: "CANCELLED",
    label: "Đã hủy",
    lightBg: "transparent",
    lightFg: "#5D5A58",
    darkBg: "transparent",
    darkFg: "#AEACA8",
    lightRatio: 6.06,
    darkRatio: 8.39,
    outlined: true,
  },
]

export const PAYMENT_SWATCHES: StatusSwatch[] = [
  {
    status: "UNPAID",
    label: "Chưa thanh toán",
    lightBg: "transparent",
    lightFg: "#5D5A58",
    darkBg: "transparent",
    darkFg: "#AEACA8",
    lightRatio: 6.06,
    darkRatio: 8.39,
    outlined: true,
  },
  {
    status: "PAID",
    label: "Đã thanh toán",
    lightBg: "#CBD9CD",
    lightFg: "#243C29",
    darkBg: "#2E392F",
    darkFg: "#C3D7C6",
    lightRatio: 8.18,
    darkRatio: 7.95,
  },
  {
    status: "REFUNDED",
    label: "Đã hoàn tiền",
    lightBg: "#9A95A4",
    lightFg: "#312941",
    darkBg: "#2D2935",
    darkFg: "#D0C9E0",
    lightRatio: 4.73,
    darkRatio: 8.86,
  },
]

export const FEEDBACK_SWATCHES = [
  {
    name: "success",
    label: "Thành công",
    lightFg: "#37563D",
    lightTint: "#E6F2E8",
    darkFg: "#AAC9AF",
    darkTint: "#212C23",
    lightRatio: 7.26,
    darkRatio: 10.58,
  },
  {
    name: "warning",
    label: "Cảnh báo",
    lightFg: "#5A4B28",
    lightTint: "#F3EEE1",
    darkFg: "#CCBE9D",
    darkTint: "#2D281C",
    lightRatio: 7.52,
    darkRatio: 10.34,
  },
  {
    name: "danger",
    label: "Nguy hiểm",
    lightFg: "#684238",
    lightTint: "#FAEBE6",
    darkFg: "#DCB5AB",
    darkTint: "#322521",
    lightRatio: 7.67,
    darkRatio: 10.18,
  },
  {
    name: "info",
    label: "Thông tin",
    lightFg: "#335069",
    lightTint: "#E5F0FA",
    darkFg: "#A6C3DD",
    darkTint: "#1F2A33",
    lightRatio: 7.46,
    darkRatio: 10.39,
  },
] as const

export type TypeStep = {
  name: string
  storefront: string
  admin: string
  lineHeight: string
  letterSpacing: string
  weight: string
  sample: string
  className: string
  uppercase?: boolean
}

/** Chuỗi kiểm chứng dấu tiếng Việt do khách hàng chỉ định. */
export const DIACRITIC_PROBE =
  "ĐƠN HÀNG ĐÃ GIAO — ƯU ĐÃI — KIỂM KÊ KHO — TỔNG CỘNG"

export const TYPE_SCALE: TypeStep[] = [
  {
    name: "display",
    storefront: "44 → 80px",
    admin: "32px",
    lineHeight: "1.16",
    letterSpacing: "-0.01em",
    weight: "700",
    sample: "ƯU ĐÃI MÙA LỄ",
    className: "font-display text-display uppercase",
    uppercase: true,
  },
  {
    name: "h1",
    storefront: "32 → 44px",
    admin: "24px",
    lineHeight: "1.18",
    letterSpacing: "-0.008em",
    weight: "700",
    sample: "Đơn hàng đã giao",
    className: "font-display text-h1",
  },
  {
    name: "h2",
    storefront: "28px",
    admin: "18px",
    lineHeight: "1.22",
    letterSpacing: "-0.005em",
    weight: "600",
    sample: "Kiểm kê kho quý IV",
    className: "font-display text-h2",
  },
  {
    name: "h3",
    storefront: "20px",
    admin: "16px",
    lineHeight: "1.32",
    letterSpacing: "0",
    weight: "600",
    sample: "Biến thể sản phẩm",
    className: "font-display text-h3",
  },
  {
    name: "body-lg",
    storefront: "17px",
    admin: "15px",
    lineHeight: "1.62",
    letterSpacing: "0",
    weight: "400",
    sample:
      "Áo khoác dáng rộng, vải kaki dệt chéo, lót lưới thoáng. Đổi trả trong 30 ngày.",
    className: "text-body-lg",
  },
  {
    name: "body",
    storefront: "16px",
    admin: "14px",
    lineHeight: "1.6",
    letterSpacing: "0",
    weight: "400",
    sample:
      "Tồn khả dụng được tính bằng tồn kho trừ đi số lượng đang giữ cho các đơn chưa giao.",
    className: "text-body",
  },
  {
    name: "body-sm",
    storefront: "14px",
    admin: "13px",
    lineHeight: "1.55",
    letterSpacing: "0.002em",
    weight: "400",
    sample: "Đơn chưa thanh toán sẽ tự hủy sau 30 phút và nhả lại hàng giữ.",
    className: "text-body-sm",
  },
  {
    name: "caption",
    storefront: "13px",
    admin: "12px",
    lineHeight: "1.5",
    letterSpacing: "0.005em",
    weight: "400",
    sample: "Cập nhật 14:32 ngày 05/10/2026",
    className: "text-caption text-ink-muted",
  },
  {
    name: "overline",
    storefront: "12px",
    admin: "11px",
    lineHeight: "1.45",
    letterSpacing: "0.09em",
    weight: "600",
    sample: "TỔNG CỘNG",
    className: "text-overline uppercase text-ink-muted",
    uppercase: true,
  },
]
