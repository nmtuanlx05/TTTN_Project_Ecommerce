/**
 * Nội dung cửa hàng: MỘT file duy nhất. Header, footer, tiêu đề tab, logo chữ đều đọc từ đây,
 * không viết lại tên hay khẩu hiệu ở nơi khác.
 */

interface StoreContact {
  email: string | null
  phone: string | null
  address: string | null
  /** Giờ làm việc, vd. "8:00 – 21:00 hằng ngày". */
  hours: string | null
}

interface StoreInfo {
  name: string
  /** NỘI DUNG MẪU, dùng tạm — chờ chủ cửa hàng xác nhận. */
  tagline: string
  /** NỘI DUNG MẪU, dùng tạm — chờ chủ cửa hàng xác nhận. */
  description: string
  /** Chưa có thông tin thật: để `null`, footer hiện `contactPending`. Điền vào đây khi có. */
  contact: StoreContact
  contactPending: string
}

export const STORE: StoreInfo = {
  name: "MONO STUDIO",
  tagline: "Thời trang tối giản cho mọi ngày",
  description: "Những thiết kế đơn sắc, dễ phối, may để mặc lâu.",
  contact: { email: null, phone: null, address: null, hours: null },
  contactPending: "Thông tin liên hệ đang được cập nhật",
}
