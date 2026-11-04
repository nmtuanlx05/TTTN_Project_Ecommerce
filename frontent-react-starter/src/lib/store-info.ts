import type { InfoPageSlug } from "@/lib/info-pages"

/**
 * Nội dung cửa hàng: MỘT file duy nhất. Header, footer, tiêu đề tab, logo chữ đều đọc từ đây,
 * không viết lại tên hay khẩu hiệu ở nơi khác. Nội dung riêng của trang chủ (slide hero, khối, cam kết, đường dẫn ảnh) ở `lib/home-content.ts`.
 */

interface StoreContact {
  email: string | null
  phone: string | null
  address: string | null
  /** Giờ làm việc, vd. "8:00 – 21:00 hằng ngày". */
  hours: string | null
}

/**
 * Mục điều hướng của header và ngăn kéo, theo thứ tự hiển thị. Hoặc là liên kết thường (`href`), hoặc gắn với một danh mục
 * bằng `categorySlug`: mục danh mục chỉ hiện khi slug đó có trong cây danh mục (không tạo liên kết chết), nhãn luôn lấy từ `label`.
 */
export type StoreNavItem = { label: string; href: string } | { label: string; categorySlug: string }

/** Một cửa hàng ở trang /dia-chi. Không bịa dữ liệu: chưa có thì để thiếu hoặc để mảng `stores` rỗng. */
export interface StoreLocation {
  name: string
  address: string
  phone?: string
  /** Giờ làm việc, vd. "8:00 – 21:00 hằng ngày". */
  hours?: string
  /** Liên kết bản đồ (http/https), vd. đường dẫn chia sẻ của Google Maps. */
  mapUrl?: string
}

/** Liên kết "Trang chủ" đứng đầu cột đường dẫn nhanh (header không có mục này vì logo đã về trang chủ). */
interface StoreFooterLink {
  label: string
  href: string
}

/** Liên kết nhỏ ở dòng cuối chân trang: nhãn riêng, trỏ tới một trang thông tin. */
interface StoreLegalLink {
  label: string
  slug: InfoPageSlug
}

/** Nội dung chân trang. Các cột đường dẫn nhanh lấy từ `navItems`; cột chính sách lấy tiêu đề từ `lib/info-pages.ts`. */
interface StoreFooter {
  /** NỘI DUNG MẪU, chờ xác nhận — có cam kết về chất liệu và form (xem bảng cam kết ở docs/storefront-design.md mục 13). */
  description: string
  quickLinksTitle: string
  quickLinksLead: StoreFooterLink
  policiesTitle: string
  /** Slug các trang chính sách ở cột 3, theo thứ tự hiển thị. */
  policySlugs: InfoPageSlug[]
  legalLinks: StoreLegalLink[]
}

/** Chữ của form đăng ký nhận tin ở chân trang. Thông báo "đang hoàn thiện" nằm cạnh hàm gửi, ở `features/newsletter/constants.ts`. */
interface StoreNewsletter {
  title: string
  /** NỘI DUNG MẪU, chờ xác nhận — có cam kết ưu đãi 10% đơn đầu. */
  description: string
  /** Nhãn của ô nhập (ẩn bằng chữ cho trình đọc màn hình) và cũng là placeholder. */
  emailLabel: string
  submitLabel: string
}

/** Thông báo (toast, tone info) của các điểm tương tác GIẢ chưa có tính năng thật; cùng giọng với "Giỏ hàng sẽ sớm có mặt" (docs/storefront-design.md mục 13). */
interface StoreComingSoon {
  /** Nút trái tim ở header và trên thẻ sản phẩm. */
  wishlist: string
  /** Nút "Thêm nhanh" trên thẻ sản phẩm. */
  quickAdd: string
  /** Link "Hướng dẫn chọn size" ở trang chi tiết sản phẩm. */
  sizeGuide: string
}

interface StoreInfo {
  name: string
  /** NỘI DUNG MẪU, dùng tạm — chờ chủ cửa hàng xác nhận. */
  tagline: string
  /**
   * NỘI DUNG MẪU, chờ xác nhận — thanh thông báo chạy chữ phía trên header; mỗi phần tử là một thông điệp. Có cam kết kinh doanh
   * (miễn phí vận chuyển, đổi trả): chỉ giữ khi hệ thống làm thật, xem bảng cam kết ở docs/storefront-design.md mục 13.
   */
  announcements: string[]
  footer: StoreFooter
  newsletter: StoreNewsletter
  comingSoon: StoreComingSoon
  /** Thứ tự và nội dung thanh điều hướng (header từ `xl`, ngăn kéo dưới `xl`). */
  navItems: StoreNavItem[]
  /** Danh sách cửa hàng cho trang /dia-chi. ĐỂ RỖNG cho tới khi chủ cửa hàng cung cấp thông tin thật. */
  stores: StoreLocation[]
  /** Chưa có thông tin thật: để `null`, footer hiện `contactPending`. Điền vào đây khi có. */
  contact: StoreContact
  contactPending: string
}

export const STORE: StoreInfo = {
  name: "MONO STUDIO",
  tagline: "Thời trang tối giản cho mọi ngày",
  announcements: ["MIỄN PHÍ VẬN CHUYỂN CHO ĐƠN HÀNG TỪ 500.000₫", "ĐỔI TRẢ TRONG 30 NGÀY"],
  footer: {
    description: "Thời trang tối giản cho mọi ngày. Chất liệu thoáng mát, form chuẩn, dễ phối.",
    quickLinksTitle: "Đường dẫn nhanh",
    quickLinksLead: { label: "Trang chủ", href: "/" },
    policiesTitle: "Chính sách khách hàng",
    policySlugs: ["doi-tra", "van-chuyen", "huong-dan-chon-size", "bao-mat"],
    legalLinks: [
      { label: "Điều khoản", slug: "dieu-khoan" },
      { label: "Bảo mật", slug: "bao-mat" },
    ],
  },
  newsletter: {
    title: "Đăng ký nhận tin",
    description: "Nhận ngay ưu đãi 10% cho đơn hàng đầu tiên và cập nhật bộ sưu tập mới.",
    emailLabel: "Email của bạn",
    submitLabel: "ĐĂNG KÝ",
  },
  comingSoon: { wishlist: "Yêu thích sẽ sớm có mặt", quickAdd: "Thêm nhanh sẽ sớm có mặt", sizeGuide: "Hướng dẫn chọn size sẽ sớm có mặt" },
  // Slug "phu-kien" và "qua-tang" là slug mà backend sẽ sinh từ tên danh mục; mục chỉ hiện khi danh mục đó có trong GET /categories.
  navItems: [
    { label: "Tất cả sản phẩm", href: "/products" },
    { label: "Áo", categorySlug: "ao" },
    { label: "Quần", categorySlug: "quan" },
    { label: "Phụ kiện", categorySlug: "phu-kien" },
    { label: "Quà tặng", categorySlug: "qua-tang" },
    { label: "Địa chỉ", href: "/dia-chi" },
  ],
  stores: [],
  contact: { email: null, phone: null, address: null, hours: null },
  contactPending: "Thông tin liên hệ đang được cập nhật",
}
