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

interface StoreHeroImage {
  /** Đường dẫn ảnh tĩnh đặt trong `public/`, vd. "/hero/1.jpg" (khung 3:4). */
  src: string
  alt: string
}

/** Nhãn các khối trang chủ. */
interface StoreHomeLabels {
  cta: string
  categoriesTitle: string
  newArrivalsTitle: string
  viewAll: string
}

interface StoreInfo {
  name: string
  /** NỘI DUNG MẪU, dùng tạm — chờ chủ cửa hàng xác nhận. */
  tagline: string
  /** NỘI DUNG MẪU, dùng tạm — chờ chủ cửa hàng xác nhận. */
  description: string
  /** NỘI DUNG MẪU, dùng tạm — câu tuyên bố ở cuối trang chủ, chờ chủ cửa hàng xác nhận. Không viết cam kết kinh doanh vào đây. */
  statement: string
  /** NỘI DUNG MẪU — nhãn các khối trang chủ, chờ chủ cửa hàng xác nhận. */
  home: StoreHomeLabels
  /**
   * Ảnh tĩnh cho hero (tối đa 3, khung 3:4). Để rỗng thì hero dùng ảnh của tối đa 3 sản phẩm mới nhất.
   * Có ảnh thì hero dùng đúng các ảnh này và không phải đợi dữ liệu sản phẩm.
   */
  heroImages: StoreHeroImage[]
  /** Chưa có thông tin thật: để `null`, footer hiện `contactPending`. Điền vào đây khi có. */
  contact: StoreContact
  contactPending: string
}

export const STORE: StoreInfo = {
  name: "MONO STUDIO",
  tagline: "Thời trang tối giản cho mọi ngày",
  description: "Những thiết kế đơn sắc, dễ phối.",
  statement: "Ít màu. Ít chi tiết. Nhiều chỗ cho chính bạn.",
  home: {
    cta: "Khám phá cửa hàng",
    categoriesTitle: "Mua theo danh mục",
    newArrivalsTitle: "Sản phẩm mới",
    viewAll: "Xem tất cả",
  },
  heroImages: [],
  contact: { email: null, phone: null, address: null, hours: null },
  contactPending: "Thông tin liên hệ đang được cập nhật",
}
