/**
 * Nội dung trang chủ: MỘT file, tách khỏi giao diện (chữ, liên kết, đường dẫn ảnh). Tên cửa hàng, khẩu hiệu, thanh thông báo, chân trang
 * vẫn ở `lib/store-info.ts`. Toàn bộ chữ ở đây là NỘI DUNG MẪU lấy y thiết kế, chờ chủ cửa hàng xác nhận; những câu là cam kết kinh doanh
 * hoặc lời quảng cáo hệ thống chưa làm thật được đánh dấu riêng và có trong bảng ở docs/storefront-design.md mục 13.
 *
 * Ảnh là ảnh TĨNH đặt trong `public/home/` (đường dẫn bắt đầu bằng "/"). Thiếu file hoặc lỗi tải thì giao diện hiện khung trung tính kèm chữ
 * cái đầu thương hiệu. `objectPosition` là vùng ảnh được giữ khi bị cắt cho vừa khung (giá trị CSS `object-position`, vd. "center 30%"):
 * chỉnh ở đây để đổi vùng giữ lại mà không sửa code.
 */

/** Ảnh tĩnh trong `public/home/`. */
export interface HomeImage {
  src: string
  alt: string
  /** Giá trị CSS `object-position`; bỏ trống thì "center". */
  objectPosition?: string
}

/** Một nút/liên kết có thể gắn danh mục: có `categorySlug` và danh mục tồn tại thì tới `/products?category=<slug>`, không thì tới `/products`. */
export interface HomeLink {
  label: string
  categorySlug?: string
}

export interface HeroSlideContent {
  /** Tiêu đề (hiển thị hoa). */
  title: string
  subtitle: string
  /** Có cam kết về chất liệu và form (bảng cam kết, docs mục 13). */
  description: string
  primary: HomeLink
  secondary: HomeLink
  /** Ảnh NGANG 4:3 (cột ảnh ở desktop gần nằm ngang; di động 1:1, tablet 3:2 đều cắt từ ảnh này). */
  image: HomeImage
}

export interface HomeCategoryCard {
  label: string
  /** Thẻ chỉ hiện khi slug này có trong GET /categories. */
  categorySlug: string
  /** Ảnh dọc 3:4. */
  image: HomeImage
}

export interface HomeTab {
  id: string
  label: string
  /** Không có slug = tab "Tất cả". Tab có slug chỉ hiện khi danh mục tồn tại. */
  categorySlug?: string
}

export type AssuranceIcon = "truck" | "return" | "headset" | "shield"

export interface HomeAssurance {
  icon: AssuranceIcon
  title: string
  description: string
}

/** Nhãn chung của một khối có tiêu đề. */
interface SectionCopy {
  eyebrow: string
  title: string
}

/** Nhãn nhỏ phía trên tiêu đề của mọi slide (cùng một dòng, chữ y mẫu). */
const HERO_EYEBROW = "MONO STUDIO · AW26"

const HERO_SLIDES: readonly HeroSlideContent[] = [
  {
    title: "THE MINIMALIST EDIT",
    subtitle: "Bộ sưu tập Thu Đông 2026",
    description: "Những thiết kế gọn gàng, chất liệu thoáng mát và form chuẩn — dễ phối cho mọi ngày.",
    primary: { label: "KHÁM PHÁ NGAY" },
    secondary: { label: "XEM BỘ SƯU TẬP" },
    image: { src: "/home/hero-1.webp", alt: "Bộ sưu tập Thu Đông 2026 của MONO STUDIO", objectPosition: "center" },
  },
  {
    title: "EVERYDAY DENIM",
    subtitle: "Quần jean & quần short",
    description: "Từ jean ống đứng đến short kaki — những chiếc quần cơ bản cho tủ đồ tối giản.",
    primary: { label: "MUA QUẦN", categorySlug: "quan" },
    secondary: { label: "XEM BỘ SƯU TẬP" },
    image: { src: "/home/hero-2.webp", alt: "Quần jean và quần short của MONO STUDIO", objectPosition: "center" },
  },
  {
    title: "LIGHT LAYERS",
    subtitle: "Áo sơ mi & áo thun",
    description: "Áo sơ mi kẻ sọc, áo thun basic — chất liệu thoáng mát, phối lớp dễ dàng.",
    primary: { label: "MUA ÁO", categorySlug: "ao" },
    secondary: { label: "XEM BỘ SƯU TẬP" },
    image: { src: "/home/hero-3.webp", alt: "Áo sơ mi và áo thun của MONO STUDIO", objectPosition: "center" },
  },
]

const CATEGORIES_SECTION: SectionCopy & { viewAll: string } = {
  eyebrow: "MUA THEO DANH MỤC",
  title: "DANH MỤC NỔI BẬT",
  viewAll: "Xem tất cả sản phẩm",
}

const CATEGORY_CARDS: readonly HomeCategoryCard[] = [
  { label: "Áo sơ mi", categorySlug: "ao-so-mi", image: { src: "/home/category-ao-so-mi.webp", alt: "Áo sơ mi" } },
  { label: "Quần jean", categorySlug: "quan-jean", image: { src: "/home/category-quan-jean.webp", alt: "Quần jean" } },
  { label: "Áo khoác", categorySlug: "ao-khoac", image: { src: "/home/category-ao-khoac.webp", alt: "Áo khoác" } },
  { label: "Phụ kiện", categorySlug: "phu-kien", image: { src: "/home/category-phu-kien.webp", alt: "Phụ kiện" } },
]

/**
 * "Best sellers": "được yêu thích" là lời quảng cáo CHƯA có dữ liệu thật (hiện lấy tạm các sản phẩm tạo sớm nhất, xem
 * `useBestSellerProducts`); chờ có đơn hàng, xem bảng cam kết ở docs/storefront-design.md mục 13.
 */
const BEST_SELLERS_SECTION: SectionCopy & { description: string; viewAll: string } = {
  eyebrow: "BEST SELLERS",
  title: "XU HƯỚNG HIỆN TẠI",
  description: "Tuyển chọn những thiết kế tối giản, dễ phối và được yêu thích tại MONO STUDIO.",
  viewAll: "Xem tất cả",
}

const STORY: SectionCopy & { description: string; cta: string; image: HomeImage } = {
  eyebrow: "CÂU CHUYỆN THƯƠNG HIỆU",
  title: "Thời trang tối giản cho cuộc sống hiện đại.",
  // Có cam kết về chất liệu và form (bảng cam kết, docs mục 13).
  description: "MONO STUDIO theo đuổi những thiết kế gọn gàng: chất liệu thoáng mát, form chuẩn, dễ phối cho mọi ngày.",
  cta: "KHÁM PHÁ BỘ SƯU TẬP",
  image: { src: "/home/story.webp", alt: "", objectPosition: "center" },
}

const NEW_ARRIVALS_SECTION: SectionCopy = { eyebrow: "MỚI CẬP NHẬT", title: "SẢN PHẨM MỚI VỀ" }

const NEW_ARRIVALS_TABS: readonly HomeTab[] = [
  { id: "all", label: "Tất cả" },
  { id: "ao", label: "Áo mới", categorySlug: "ao" },
  { id: "quan", label: "Quần mới", categorySlug: "quan" },
]

/** NỘI DUNG MẪU, chờ xác nhận: cả bốn cam kết hệ thống CHƯA làm thật (bảng ở docs/storefront-design.md mục 13). */
const ASSURANCES: readonly HomeAssurance[] = [
  { icon: "truck", title: "Giao hàng nhanh toàn quốc", description: "Giao tận nơi trên mọi tỉnh thành." },
  { icon: "return", title: "Đổi trả dễ dàng trong 30 ngày", description: "Đổi size hoặc trả hàng không phiền hà." },
  { icon: "headset", title: "Hỗ trợ khách hàng 24/7", description: "Luôn sẵn sàng giải đáp mọi lúc bạn cần." },
  { icon: "shield", title: "Cam kết chất lượng chính hãng", description: "Sản phẩm chính hãng từ MONO STUDIO." },
]

export const HOME = {
  hero: { eyebrow: HERO_EYEBROW, slides: HERO_SLIDES },
  categories: { ...CATEGORIES_SECTION, cards: CATEGORY_CARDS },
  bestSellers: BEST_SELLERS_SECTION,
  story: STORY,
  newArrivals: { ...NEW_ARRIVALS_SECTION, tabs: NEW_ARRIVALS_TABS },
  assurances: ASSURANCES,
} as const
