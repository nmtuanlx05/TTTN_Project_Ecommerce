# Thiết kế storefront (MONO STUDIO)

Tài liệu này là nguồn tham chiếu khi làm tiếp storefront (trang chủ, giỏ hàng, thanh toán...). Hệ thống token chung nằm ở
`CLAUDE.md` và `src/global.css`; ở đây ghi **cách áp dụng cho khu khách hàng** và những quy tắc đã chốt khi làm khung chung,
danh sách và chi tiết sản phẩm.

## 1. Ý tưởng

Cửa hàng như **phòng trưng bày tối giản**: giao diện lùi lại, ảnh sản phẩm là nhân vật chính. Đen trắng, nhiều khoảng trắng, hiện đại,
mượt nhưng tiết chế. Nhấn mạnh bằng **tương phản, cỡ chữ, độ đậm và khoảng trắng**, không bằng màu. Làm tốt cả light và dark; di động trước
(thiết kế từ 375px lên).

## 2. Màu: chỉ dùng token, không thêm màu

Cấm mã màu viết cứng và class màu dựng sẵn của Tailwind. Thêm token màu mới phải hỏi trước. Vai trò đã dùng:

| Vai trò | Token |
|---|---|
| Nền trang, header lúc ở đầu trang | `canvas` |
| Header khi đã cuộn | `canvas/80` + `backdrop-blur-md` + viền `border-subtle` |
| Khung ảnh, ảnh dự phòng | `surface-sunken`; chữ cái "M" dự phòng dùng `ink-subtle` |
| Ngăn kéo (menu, bộ lọc), khung tìm kiếm | nền đặc `surface-raised` + viền `border-default` (thấy rõ mép ở cả hai chế độ) |
| Lớp phủ sau ngăn kéo | `canvas/70` + `backdrop-blur-xs` (sáng ở light, tối ở dark, không cần màu riêng) |
| Chữ chính / phụ / metadata | `ink` / `ink-muted` / `ink-subtle` (không dùng `ink-subtle` trên `surface-sunken` hoặc nền hover) |
| Đường kẻ trang trí | `border-subtle` (header, footer, đường phân mô tả); `border-default` cho ngăn kéo |
| Viền điều khiển (chip, ô nhập, nút lọc) | `border-control` (đạt tương phản 3:1) |
| Chip đang chọn, nút chính | `primary` / `primary-fg` (đảo màu ở dark) |
| Skeleton + vệt sáng lướt | `skeleton` + `surface-hover` |
| Lỗi / cảnh báo | `danger-*`, `warning-*` chỉ cho trạng thái thật (hiện chỉ có toast `info`) |

Không dựa vào màu để truyền thông tin: hết hàng ghi bằng chữ, mục đang chọn có vạch + chữ đậm + `aria-current`.

## 3. Chữ

Font: Archivo (tiêu đề, logo, khung tìm kiếm) và Be Vietnam Pro (thân bài), không đổi. Giá dùng Be Vietnam Pro
**không** `tabular-nums` và không dùng Geist Mono ở storefront (Geist Mono dành cho admin). Mỗi màn hình chỉ 2 đến 3 cỡ nội dung:

| Màn hình | Cỡ dùng (token) |
|---|---|
| Danh sách | `text-h1` hoa (tiêu đề trang) · `text-body-sm` (tên, giá, bộ lọc, chip, breadcrumb) · `text-overline` hoa giãn chữ (tên nhóm lọc, chân trang) |
| Chi tiết | `text-h2` (tên, tiêu đề khối liên quan) · `text-body` (giá, mô tả) · `text-body-sm` (chip, nhãn, trạng thái) · `text-overline` (nhãn "Màu sắc", "Kích thước") |
| Khung chung | `text-body-sm` hoa giãn chữ (mục điều hướng, dòng trong bảng; danh mục cháu `text-caption`), `text-body-sm` (liên kết chân trang) · `text-h3` (khung tìm kiếm, tiêu đề ngăn kéo) |
| Trang chủ | `text-display` hoa (hero) · `text-body-lg` (mô tả hero) · `text-h2` (tiêu đề khối, tên ô danh mục) · `text-h1` (dải tuyên bố) · `text-body-sm` (thẻ sản phẩm, liên kết "Xem tất cả") |

`text-display` chỉ dùng cho hero trang chủ. Nhãn `overline` chỉ ở chỗ phụ (tên nhóm lọc, nhãn nhóm chip), không đặt trên mọi tiêu đề.
Tiêu đề trang viết hoa (cùng kiểu hero và đăng nhập); tên sản phẩm viết thường như dữ liệu. Mỗi trang đúng một `h1`.

## 4. Khoảng cách và lưới

- **Quy tắc khoảng cách**: nền **4px** cho chi tiết nhỏ (từ 16px trở xuống: khoảng cách trong thẻ, giữa icon và chữ, giữa hai dòng chữ), nền **8px** cho bố cục
  (giữa các khối, lề, lưới). Ưu tiên token có sẵn (`gap-inline` 12px, `py-row`/`gap-stack` 16px, `p-card` 24px, `px-gutter` 24px, `--sp-block`). Chỉ coi là lệch
  khi dùng giá trị ngoài nền 4px (10, 14, 18, 20px...) hoặc giá trị tùy ý dạng `[..px]`; **không** đổi hàng loạt 4px/12px sang 8px.
- Container `max-w-7xl` (1280px), lề `px-gutter` (24px).
- Khoảng cách giữa các khối lớn: token `--sp-block` (`pb-block`, `mt-block`, `py-block`): **56px di động, 96px từ `lg`**. `--sp-section` (80px) không đổi
  vì trang đăng nhập và trang chủ cũ đang dùng.
- Chiều cao header: `--header-h` (64px, 80px từ `md`) → `h-header`, `scroll-mt-header` (đích "bỏ qua tới nội dung" và đầu danh sách không bị header dính che).
- Lưới sản phẩm (`ProductGrid`): **2 cột** (di động), **3 cột** từ `md` (768px), **4 cột** từ `xl` (1280px) khi có cột lọc bên trái (`layout="beside-filters"`);
  nơi không có cột lọc (khối liên quan, trang chủ) dùng `layout="full"`: 4 cột từ `lg`. Khoảng cách `gap-x-4 md:gap-x-6`, `gap-y-10 lg:gap-y-12`.
- Cột lọc 15rem, sticky dưới header, từ `lg`. Chi tiết: 6/6 từ `md`, **7/5 từ `lg`** (ảnh lớn hơn thông tin).

## 5. Hình khối

Ảnh không bo góc (cảm giác biên tập). **Cỡ nút**: mọi nút, chip, ô nhập là 44px (`h-control`). **Ngoại lệ có chủ đích** là nút hành động chính cỡ `lg` (50px): nút hero
"Khám phá cửa hàng", "Thêm vào giỏ" và nút trong thanh mua dính đáy; không dùng `lg` cho nút nào khác. Nút, chip biến thể, ô nhập theo `radius-control` (2px); chip bộ lọc đang áp dụng dạng pill (`rounded-4xl`
= `radius-pill`). Đường kẻ 1px thay cho đổ bóng; không có bóng đổ nào.

## 6. Chuyển động

Chỉ CSS và Tailwind, không thư viện animation. Token ở `global.css`:

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--motion-fast` | 150ms | đổi màu, gạch chân, nhấn |
| `--motion-base` | 250ms | vào trang (`animate-page-enter`), header đổi nền, lưới mờ khi tải lại |
| `--motion-slow` | 400ms | ngăn kéo, khung tìm kiếm, hiện dần khi cuộn |
| `--motion-image` | 500ms | ảnh mờ dần khi tải xong, phóng 1,03 khi rê chuột |
| `--motion-ease` (`ease-smooth`) | `cubic-bezier(0.22, 1, 0.36, 1)` | mọi chuyển động |

Tiện ích: `shimmer` (skeleton có vệt sáng lướt), `press` (thu nhỏ 0,98 khi nhấn, không áp dụng cho nút bị vô hiệu hóa), `animate-page-enter`.
Quy tắc:

- **Vào trang** gắn `key` theo **pathname**, không theo query: đổi bộ lọc/trang không làm cả trang nhấp nháy lại (`StorefrontLayout`).
- **`Reveal`** (hiện dần khi cuộn): một lần duy nhất, chỉ cho khối nằm dưới màn hình đầu ("Sản phẩm cùng danh mục", các khối trang chủ dưới hero). Khối mặc định HIỆN; lúc gắn vào DOM đo
  một lần, khối đã trong màn hình (kể cả màn 1080p) giữ nguyên, không bao giờ bị giấu hay chạy transition (không nháy). Chỉ khối dưới màn hình bị giấu, và giấu KHÔNG có transition; cuộn tới mới
  thêm transition rồi hiện. Hai bộ quan sát (vào màn hình, và `ABOVE_ONLY_MARGIN` cho khối đã nằm hẳn phía trên) để cuộn nhảy qua khối không làm nó ẩn mãi. Tải lại dữ liệu bên trong không chạy lại.
  **Không** dùng ở footer, danh sách, nội dung màn hình đầu.
- **Easing theo phạm vi storefront**: `StorefrontLayout` đặt `--default-transition-timing-function: var(--motion-ease)` trên phần tử gốc, nên mọi `transition-*` không nói rõ easing (kể cả của `ui/Button`,
  `ui/Select` nằm trong khung) dùng đường cong token mà không đụng `ui/` và không đổi admin. Popup render ở Portal (ngăn kéo, danh sách chọn) không thừa hưởng, tự khai báo easing riêng.
- Hiệu ứng "chỉ khi rê chuột" của Tailwind (`hover:`) chỉ áp dụng khi thiết bị có hover. Phần tử ẩn cho tới khi rê chuột (mũi tên ô danh mục) phải ẩn bằng `[@media(hover:hover)]:` để thiết bị cảm ứng luôn thấy nó.
- Giảm chuyển động (`prefers-reduced-motion`): `global.css` đã đưa mọi animation/transition về gần 0; riêng phần transform dùng `motion-safe:`.
- Cấm: parallax, carousel tự chạy, hiệu ứng nặng.

## 7. Ảnh

- Khung `aspect-[3/4]` cố định (`ProductImage`) nên không giật bố cục. Trong lúc tải: skeleton shimmer cùng tỉ lệ; xong thì mờ dần vào (500ms).
- Thiếu hoặc lỗi ảnh: chữ cái đầu thương hiệu ("M", màu `ink-muted`; không dùng `ink-subtle` trên `surface-sunken`) trên `surface-sunken`. `alt` luôn là tên sản phẩm.
- `loading`: **4 thẻ đầu của danh sách và ảnh chính trang chi tiết là `eager`** (ảnh chính thêm `fetchPriority="high"`); còn lại `lazy`. Mọi ảnh `decoding="async"`.
  Lưới nằm dưới màn hình đầu truyền `eagerCount={0}`.
- Ảnh chi tiết là nút `aria-label="Xem ảnh lớn"`, `cursor-zoom-in`, mở `ImageLightbox`. Chỉ có nút khi ảnh đã hiện ra.
- Hạn chế: ảnh gốc từ máy chủ, không có bản thu nhỏ (`srcset`) nên tải nặng trên di động. Cần endpoint resize phía backend.

## 8. Điều hướng, lịch sử và cuộn

- Trạng thái danh sách nằm trên URL: `?category=<slug>&q=&sort=&minPrice=&maxPrice=&page=`; mặc định không ghi lên URL; lọc whitelist; `minPrice > maxPrice` thì bỏ cả hai.
- **Đổi bộ lọc/sắp xếp dùng `replace`, đổi trang dùng `push`** (`use-catalog-search-params.ts`). Liên kết lọc phải là `<Link replace>`.
- `use-scroll-restoration.ts`: đổi **pathname** thì cuộn lên đầu; Back/Forward/F5 khôi phục đúng vị trí đã nhớ (theo `location.key`, đợi trang đủ cao). Đổi query không cuộn;
  đổi trang tự cuộn tới đầu danh sách và đưa focus vào vùng kết quả.
- Rê chuột hoặc focus vào thẻ sản phẩm → `prefetchQuery` chi tiết.
- `useDocumentTitle` đặt tiêu đề tab theo trang và trả lại khi rời trang.

## 9. Ngăn kéo, khung tìm kiếm và trả focus

Dựng trên Base UI Dialog (`StorefrontDrawer`), không dùng `ui/sheet`. Modal: khóa cuộn, giữ focus, Esc và bấm nền đóng, **trả focus về nút đã mở**.

| Thành phần | Đóng khi |
|---|---|
| Ngăn kéo menu (`useOpenUntilNavigation`) | pathname đổi, hoặc bấm liên kết bên trong (`onNavigate`), Esc, bấm nền |
| Khung tìm kiếm | gửi (Enter, kể cả khi chỉ query đổi), pathname đổi, Esc, bấm nền |
| Ngăn kéo bộ lọc (`useState` thường) | **chỉ** nút "Xem N sản phẩm", Esc, bấm nền. Query đổi KHÔNG làm đóng |

`FilterDrawer` luôn phải được dựng (không nằm sau nhánh loading/lỗi/rỗng) để không mất trạng thái mở.

## 9b. Điều hướng ở header (mega menu, từ `xl`)

**Điểm chuyển 1280px (`xl`)**, không phải `lg`. Đã đo: thanh điều hướng đủ 6 mục (Tất cả sản phẩm, Áo, Quần, Phụ kiện, Quà tặng, Địa chỉ) rộng ~613px; cộng logo 147px, khoảng cách 40px, nhóm biểu tượng 348px và lề 48px thì cần tối thiểu ~1195px, nên không vừa ở 1024px (iPad ngang dùng ngăn kéo) và 1280px là mốc Tailwind gần nhất vừa thoải mái. Đổi chữ nhãn hay thêm mục thì đo lại.

**Bố cục từ `xl`**: logo `BrandLogo` bên trái; thanh điều hướng và nhóm biểu tượng (tìm kiếm, đổi sáng/tối, giỏ hàng, đăng nhập hoặc `UserMenu`) gom về BÊN PHẢI, thanh điều hướng sát bên trái nhóm biểu tượng, cách đúng 40px (`xl:ml-10`; hàng flex `xl:gap-0`). Dưới `xl`: nút menu, wordmark, tìm kiếm, giỏ hàng, và ngăn kéo (mục 9b-2).

**Mục điều hướng** cấu hình ở `STORE.navItems` (`lib/store-info.ts`), theo thứ tự: Tất cả sản phẩm, Áo, Quần, Phụ kiện, Quà tặng, Địa chỉ. Không có "Trang chủ" (logo về trang chủ).
Mỗi mục là `{ label, href }` (liên kết thường) hoặc `{ label, categorySlug }` (gắn danh mục). Nhãn luôn lấy từ `label`, không từ tên danh mục. Mục danh mục chỉ hiện khi slug có trong cây danh mục
(`resolveNavItems` ở `lib/nav-items.ts`): danh mục thiếu thì ẩn mục, không tạo liên kết chết, không tạo dữ liệu. Mục có danh mục con mở bảng; không có con là liên kết thường. "Tất cả sản phẩm"
là liên kết thường tới `/products`, không có bảng. Không phụ thuộc việc danh mục có sản phẩm hay chưa.

**Kiểu chữ mục**: hoa, giãn 0.1em (`tracking-widest`), `text-body-sm` (14px), `font-medium`, màu `ink`, cách nhau 32px (`gap-8`). Hover, focus, đang mở (`aria-expanded`) và đang xem (`aria-current="page"`) đều gạch chân 1px
(`header-nav-styles.ts`), chuyển theo `--motion-fast`. Không đổi màu chữ. Đang xem: "Tất cả sản phẩm" chỉ khi ở `/products` KHÔNG có `?category=`; có `?category=<slug>` thì đánh dấu mục danh mục chứa slug đó (chính nó hoặc tổ tiên);
trang chi tiết sản phẩm không đánh dấu mục nào (`isNavItemActive`).

**Bảng toàn chiều rộng** (`HeaderNavPanel`): nằm ngay dưới header dính, rộng hết màn hình, nền `canvas` đặc, kẻ `border-subtle` ở trên và dưới, không đổ bóng, không lớp phủ làm tối trang; nội dung trong container `max-w-7xl`.
Cao tối đa `70dvh` rồi cuộn bên trong. Danh sách dọc: dòng đầu "Tất cả <mục>" → `/products?category=<slug>`, rồi danh mục con trực tiếp, cháu thụt vào ngay dưới cha và nhỏ hơn (`text-caption`); tối đa 3 cấp tính cả mục cha, sâu hơn bỏ qua (`panelRows`);
thứ tự theo API (theo tên), không tự đổi. Mỗi dòng cao ≥ 44px, hoa, giãn chữ, gạch chân khi hover/focus, `aria-current` cho danh mục đang xem.
- **Cột căn trái cố định**: danh sách căn theo mép trái của THANH ĐIỀU HƯỚNG, một vị trí duy nhất cho mọi mục, KHÔNG bám theo mép trái của từng mục cha, nên khi rê từ mục này sang mục khác danh sách không nhảy ngang. Vị trí đo bằng `useLayoutEffect`
  (đo lại khi đổi cỡ cửa sổ) rồi ghi vào biến `--nav-offset`; class căn lề nằm trong hằng `LIST_ALIGN` (`ml-(--nav-offset)`), muốn căn giữa sau này chỉ đổi thành `mx-auto`.
- Hiện bằng mờ dần + trượt xuống nhẹ (`--motion-base`), tắt khi giảm chuyển động. Chỉ có MỘT bảng dùng chung: đổi mục thì chỉ nội dung đổi (mờ dần nhanh, `--motion-fast`), bảng không đóng rồi mở lại nên không nháy.
  Hai lớp animate-in phải kèm `transition-none`: `duration-*` của animate-in còn đặt `transition-duration`, không tắt thì `margin-left` căn lề chạy transition và danh sách trượt ngang lúc hiện.

**Hành vi** (`useMegaMenu` + `HeaderNav`; tự dựng, không dùng Base UI NavigationMenu vì trigger của nó là nút, còn ở đây chữ phải là liên kết điều hướng, chạm lần đầu chỉ mở bảng, và bảng căn theo mép thanh điều hướng thay vì theo từng mục):
- **Chuột**: rê vào mục có bảng thì mở sau 100ms; rời khỏi vùng (mục + bảng) thì đóng sau 150ms; rê sang mục không có bảng thì đóng. Bảng là CON của `<nav>`, nav cao đúng bằng header và bảng dính liền dưới header nên rê chéo từ mục xuống bảng
  không có khe hở. `<nav>` không được đặt `position` (để bảng `absolute inset-x-0 top-full` tính theo header dính). Bấm mục thì điều hướng tới `/products?category=<slug>`.
- **Bàn phím**: Tab tới mục (liên kết), Enter điều hướng; ↓ mở bảng và đưa focus vào dòng đầu; ↑/↓/Home/End di chuyển giữa các dòng (↑ ở dòng đầu về mục cha, Shift+Tab ở dòng đầu cũng vậy); Esc đóng và trả focus về mục cha (Esc cũng đóng bảng mở bằng chuột);
  Tab ra khỏi menu hoặc sang mục khác thì đóng. `aria-haspopup`, `aria-expanded`, `aria-controls` trên mục có bảng; id bảng chỉ tồn tại khi bảng của mục đó đang mở.
- **Cảm ứng** (màn hình cảm ứng khổ lớn từ 1280px; nhận biết bằng `pointerType` của lần bấm, không bằng media query): chạm lần đầu vào mục có bảng thì MỞ bảng, không điều hướng; chạm lần hai hoặc chạm "Tất cả <mục>" mới đi; chạm mục khác thì chuyển bảng; chạm ra ngoài thì đóng.
- **Đóng khi**: chọn một liên kết, vị trí đổi (`location.key`: đổi đường dẫn lẫn `?category=`, kể cả Back/Forward), bấm ra ngoài (kể cả bấm nút tìm kiếm), Esc, mở khung tìm kiếm.
- **Đang tải / lỗi cây danh mục**: các mục danh mục chưa hiện, chỉ có "Tất cả sản phẩm" và "Địa chỉ"; chiều cao header không đổi (81px). Hạn chế đã biết: thanh điều hướng căn phải nên khi các mục danh mục xuất hiện lần đầu,
  "Tất cả sản phẩm" dịch sang trái (cây danh mục được cache nên chỉ ở lần tải đầu của phiên).

## 9b-2. Ngăn kéo menu (dưới `xl`)

`MobileNavDrawer` → `MobileNavList`: cùng `STORE.navItems`, cùng thứ tự: "Tất cả sản phẩm" ở hàng đầu, rồi Áo, Quần, Phụ kiện, Quà tặng (mục có con là accordion `MobileNavAccordion`: nút `aria-expanded`/`aria-controls`, mỗi lúc mở một mục,
vùng thu gọn `inert`; bên trong có "Tất cả <mục>" và danh mục con, cháu thụt vào), rồi "Địa chỉ"; dưới cùng là khối tài khoản và `ThemeToggle`. Kiểu chữ hàng cùng thanh điều hướng (hoa, giãn chữ). Dòng đang xem có `aria-current` + nền hover;
mục chứa danh mục đang xem tự mở sẵn và nhãn gạch chân. Chân trang có liên kết "Tất cả sản phẩm" và "Địa chỉ cửa hàng".

## 10. Trạng thái bắt buộc

Loading (skeleton cùng tỉ lệ, chỉ lần tải đầu; đổi bộ lọc/trang giữ lưới cũ mờ `opacity-60` + `aria-busy`), rỗng (danh mục chưa có sản phẩm; không khớp bộ lọc có
"Xóa bộ lọc"; chưa có sản phẩm nào), lỗi có "Thử lại", trang vượt tổng ("Về trang 1"), 404 danh mục (không gọi API sản phẩm), 404 sản phẩm, hết hàng,
biến thể không có tổ hợp. Dùng `StateMessage` (icon, tiêu đề, mô tả, hành động; không khung nét đứt): luôn nói chuyện gì xảy ra và làm gì tiếp. Trạng thái chiếm CẢ TRANG (404, không tìm thấy sản phẩm/danh mục,
lỗi tải chi tiết) dùng `titleAs="h1"` để trang vẫn có đúng một `h1`; trạng thái nằm trong trang đã có `h1` giữ `p`. URL lạ ngoài `/admin` hiện 404 TRONG khung storefront (`pages/storefront/not-found`).

Chip biến thể (`OptionChipGroup`): `radiogroup`, mũi tên/Home/End đổi lựa chọn, tab-index luân chuyển. Chip hết hàng **và** chip không có tổ hợp đều ghi chữ "Hết hàng";
chip hết hàng vẫn chọn được (để thấy trạng thái), chip không có tổ hợp thì viền nét đứt + `aria-disabled` (trừ ca ma trận thưa mà chip đó là đường duy nhất tới
tổ hợp: vẫn cho bấm và nhảy sang biến thể gần nhất). Mặc định chọn biến thể còn hàng đầu tiên. Số lượng 1 đến 99, giới hạn thật do server.

## 11. Truy cập

Liên kết "Bỏ qua tới nội dung" (`#main-content`); mỗi trang một `h1`; landmark (`header`, `nav` có nhãn, `main`, `footer`, `aside`, `section` có nhãn);
mọi icon có nhãn chữ; focus ring theo token (không bao giờ `outline: none` trần); điều khiển bằng bàn phím trọn vẹn, trả focus đúng nơi (ngăn kéo, tìm kiếm,
lightbox, bỏ chip, đổi trang); vùng chạm tối thiểu 44px (liên kết breadcrumb và chân trang có `min-w-control` ở di động); vùng live cho số kết quả và trạng thái còn hàng.

## 12. Thanh mua dính đáy (di động)

`StickyBuyBar` được portal vào một ô `sticky bottom-0 h-0` ở cuối trang chi tiết (không dùng `fixed`) nên tự dừng ở cuối nội dung và không che chân trang.
Hiện khi nút "Thêm vào giỏ" chính đã cuộn lên trên khỏi màn hình (vùng quan sát chỉ có một biên, xem `purchase-panel.tsx`, để cuộn nhảy cũng đúng). Hiện giá và "Màu · Size"
đang chọn. Đệm dưới theo `env(safe-area-inset-bottom)`; chỉ có tác dụng khi `index.html` đặt `viewport-fit=cover` (chưa đặt).

## 13. Nội dung

`src/lib/store-info.ts` là nơi duy nhất cho tên, khẩu hiệu, mô tả, dải tuyên bố, nhãn khối trang chủ, ảnh hero tĩnh, mục điều hướng (`navItems`), danh sách cửa hàng (`stores`) và liên hệ. **Nội dung mẫu, chờ chủ cửa hàng xác nhận**: khẩu hiệu "Thời trang tối giản cho mọi ngày",
mô tả "Những thiết kế đơn sắc, dễ phối.", tuyên bố "Ít màu. Ít chi tiết. Nhiều chỗ cho chính bạn.", nhãn "Khám phá cửa hàng", "Mua theo danh mục", "Sản phẩm mới", "Xem tất cả". Liên hệ chưa có (footer ghi
"Thông tin liên hệ đang được cập nhật"). Không bịa cam kết kinh doanh (miễn phí vận chuyển, đổi trả, chất lượng...). Giọng ngắn gọn, tự tin, tiếng Việt.

`STORE.stores` (`{ name, address, phone?, hours?, mapUrl? }`) cho trang `/dia-chi` (`pages/storefront/stores`): ĐỂ RỖNG cho tới khi chủ cửa hàng cung cấp thông tin thật; rỗng thì hiện `StateMessage` "Thông tin cửa hàng đang được cập nhật". Mỗi cửa hàng là một khối
(`StoreEntry`: tên `h2`, địa chỉ, điện thoại `tel:`, giờ mở cửa, "Xem bản đồ" mở tab mới và chỉ dựng khi `mapUrl` là http/https). Trang có một `h1` "Địa chỉ" và tiêu đề tab. Chân trang có liên kết "Địa chỉ cửa hàng" sang trang này.

## 14. Trang chủ

Thứ tự khối, đều trong container `max-w-7xl`, cách nhau `--sp-block` (khối dưới hero bọc `Reveal`):

1. **Hero** (`features/catalog/components/home-hero.tsx`): `h1` `text-display` hoa với `STORE.tagline` (`text-balance`; 3 dòng ở 360 đến 414px, không tràn), mô tả `STORE.description`, nút `lg` "Khám phá cửa hàng" → `/products`. Cột trái 6/12, cột phải 6/12 từ `lg`;
   dưới `lg` xếp dọc. Ảnh (`home-hero-images.tsx`): tối đa 3 khung 3:4 rộng 5/4/3 trên lưới 12 cột, lệch dọc 0/48/96px; dưới `md` chỉ 2 ảnh đầu. Số khung = số sản phẩm (1 đến 3); chưa có sản phẩm hoặc lỗi tải thì
   MỘT khung trung tính (chữ "M"), bố cục không vỡ. Mỗi ảnh là liên kết tới trang chi tiết, `aria-label` = tên sản phẩm, KHÔNG có caption. Ảnh đầu `eager` + `fetchPriority="high"`, ảnh sau `lazy`. Có `STORE.heroImages`
   (ảnh tĩnh đặt trong `public/`, vd. `/hero/1.jpg`) thì dùng chúng thay cho ảnh sản phẩm và không phải đợi dữ liệu.
2. **Danh mục** (`components/storefront/category-tiles.tsx`): ô chữ cho danh mục cấp 1 (2 cột, 4 cột từ `md`), tên `text-h2`, mũi tên `ArrowUpRight` ẩn tới khi rê chuột/focus (chỉ ở thiết bị có hover). Dữ liệu từ `useCategoryTree` (chung cache với
   header); đang tải thì skeleton; lỗi hoặc rỗng thì ẩn khối.
3. **Sản phẩm mới** (`home-new-arrivals.tsx`): 8 thẻ `ProductCard` qua `ProductGrid layout="full"` (2 cột di động, 3 từ `md`, 4 từ `lg`), `eagerCount={0}`, liên kết "Xem tất cả" → `/products`. **Hero và khối này dùng chung MỘT request**
   `GET /products?limit=8` (cùng query key), nên 3 sản phẩm đầu xuất hiện ở cả hai nơi (chủ ý). Loading là skeleton 8 ô; chưa có sản phẩm hoặc lỗi (có "Thử lại") dùng `StateMessage`.
4. **Dải tuyên bố** (`brand-statement.tsx`): một câu `text-h1`, `max-w-4xl`, nhiều khoảng trắng, kẻ mảnh phía trên.

Không làm: carousel tự chạy, "bán chạy" (chưa có đơn hàng), khuyến mãi, bản tin email. Trang chủ gọi `useDocumentTitle(STORE.name)`.
