/**
 * Cấu hình các trang thông tin tạm (/thong-tin/:slug). Chưa có nội dung thật thì để trống `paragraphs`: trang hiện
 * "Nội dung đang được cập nhật" thay vì bịa chính sách. Muốn thêm nội dung chỉ cần điền `paragraphs`, không sửa giao diện.
 */
export interface InfoPage {
  slug: string
  title: string
  /** Mỗi phần tử là một đoạn văn. Bỏ trống hoặc để rỗng khi chưa có nội dung. */
  paragraphs?: string[]
}

export const INFO_PAGES = [
  { slug: "doi-tra", title: "Chính sách đổi trả" },
  { slug: "van-chuyen", title: "Chính sách vận chuyển" },
  { slug: "huong-dan-chon-size", title: "Hướng dẫn chọn size" },
  { slug: "bao-mat", title: "Chính sách bảo mật" },
  { slug: "dieu-khoan", title: "Điều khoản" },
] as const satisfies readonly InfoPage[]

export type InfoPageSlug = (typeof INFO_PAGES)[number]["slug"]

/** Tra trang theo slug trên URL; slug lạ trả `null` (trang hiện 404 trong khung). */
export function findInfoPage(slug: string | undefined): InfoPage | null {
  return INFO_PAGES.find((page) => page.slug === slug) ?? null
}

/** Đường dẫn tới một trang thông tin. Nhận slug đã khai báo nên không tạo được liên kết chết. */
export function infoPageHref(slug: InfoPageSlug): string {
  return `/thong-tin/${slug}`
}

/** Tiêu đề trang theo slug (dùng cho nhãn liên kết ở chân trang). */
export function infoPageTitle(slug: InfoPageSlug): string {
  return INFO_PAGES.find((page) => page.slug === slug)!.title
}
