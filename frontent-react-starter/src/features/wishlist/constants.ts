import type { WishlistItemStatus } from "./types"

/** Số thẻ mỗi trang của ngăn kéo (backend cho 1–48, mặc định 12). */
export const WISHLIST_PAGE_SIZE = 12

/** Trần của backend (`WISHLIST_MAX_ITEMS`); chỉ dùng cho thông báo, backend vẫn là nơi quyết định. */
export const WISHLIST_MAX_ITEMS = 100

/** Mã lỗi duy nhất của module (409), có trong docs/api/wishlist.md. */
export const WISHLIST_FULL_CODE = "WISHLIST_FULL"

/** Huy hiệu số lượng ở header: "99+" khi quá ngưỡng này. */
export const WISHLIST_BADGE_MAX = 99

/**
 * Thẻ đang mở vùng chọn size có chiếm cả hàng (`col-span-2`) không. Mặc định `false`: thử vùng chọn gọn trong chiều rộng thẻ (~12rem) trước;
 * nếu xem bằng mắt thấy chật thì đổi thành `true` (một dòng).
 */
export const WISHLIST_EXPANDED_FULL_ROW = false

export const WISHLIST_MESSAGES = {
  guest: "Đăng nhập để lưu sản phẩm yêu thích",
  admin: "Tài khoản quản trị không dùng danh sách yêu thích",
  full: `Danh sách yêu thích đã đầy (tối đa ${WISHLIST_MAX_ITEMS} sản phẩm)`,
  notFound: "Sản phẩm không còn bán nên không thể thêm vào yêu thích",
  failed: "Không cập nhật được danh sách yêu thích. Hãy thử lại.",
} as const

/** Nhãn hiện trên thẻ không bán được; `available` không có nhãn. */
export const WISHLIST_STATUS_LABEL: Record<WishlistItemStatus, string | null> = {
  available: null,
  "sold-out": "Hết hàng",
  discontinued: "Ngừng kinh doanh",
}
