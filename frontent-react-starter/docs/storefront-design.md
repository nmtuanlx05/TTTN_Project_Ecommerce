# Thiết kế storefront (MONO STUDIO)

Tài liệu này là nguồn tham chiếu khi làm tiếp storefront (trang chủ, giỏ hàng, thanh toán...; giỏ hàng đã làm, mục 19). Hệ thống token chung nằm ở
`CLAUDE.md` và `src/global.css`; ở đây ghi **cách áp dụng cho khu khách hàng** và những quy tắc đã chốt khi làm khung chung,
danh sách và chi tiết sản phẩm.

## 1. Ý tưởng

Cửa hàng như **phòng trưng bày tối giản**: giao diện lùi lại, ảnh sản phẩm là nhân vật chính. Đen trắng, nhiều khoảng trắng, hiện đại,
mượt nhưng tiết chế. Nhấn mạnh bằng **tương phản, cỡ chữ, độ đậm và khoảng trắng**, không bằng màu. Chỉ có giao diện sáng (cộng một số vùng tối cố định, mục 2); di động trước
(thiết kế từ 375px lên).

## 2. Màu: chỉ dùng token, không thêm màu

Cấm mã màu viết cứng và class màu dựng sẵn của Tailwind. Thêm token màu mới phải hỏi trước. Vai trò đã dùng:

| Vai trò | Token |
|---|---|
| Nền trang, header lúc ở đầu trang | `canvas` |
| Header khi đã cuộn | `canvas/80` + `backdrop-blur-md` + viền `border-subtle` |
| Khung ảnh, ảnh dự phòng | `surface-sunken`; chữ cái "M" dự phòng dùng `ink-subtle` |
| Ngăn kéo (menu, bộ lọc), khung tìm kiếm | nền đặc `surface-raised` + viền `border-default` (thấy rõ mép) |
| Lớp phủ sau ngăn kéo | `canvas/70` + `backdrop-blur-xs` (không cần màu riêng) |
| Chữ chính / phụ / metadata | `ink` / `ink-muted` / `ink-subtle` (không dùng `ink-subtle` trên `surface-sunken` hoặc nền hover) |
| Đường kẻ trang trí | `border-subtle` (header, footer, đường phân mô tả); `border-default` cho ngăn kéo |
| Viền điều khiển (chip, ô nhập, nút lọc) | `border-control` (đạt tương phản 3:1) |
| Chip đang chọn, nút chính | `primary` / `primary-fg` |
| Skeleton + vệt sáng lướt | `skeleton` + `surface-hover` |
| Lỗi / cảnh báo | `danger-*`, `warning-*` chỉ cho trạng thái thật (hiện chỉ có toast `info`) |
| Thanh thông báo, chân trang (vùng tối cố định) | class `dark` trên phần tử + `bg-surface-sunken` + chữ `ink` / `ink-muted`; xem mục 15 và 17 |
| Huy hiệu tồn kho trên ảnh | dạng viên thuốc: `bg-canvas/80` + `backdrop-blur-sm` + viền `border-default` + chữ `ink`; chấm "Sắp hết" `warning-dot` (hổ phách `#e0a21b`, lấy từ thiết kế mẫu; token CHỈ dùng cho chấm trang trí này vì chữ "Sắp hết" đã truyền đạt, không dùng cho chữ hay nền) |
| Thông báo trung tính của form (vd. "đang hoàn thiện") | `info-fg` (không dùng màu lỗi cho thứ không phải lỗi) |
| Lớp tối phủ trên ảnh (thẻ danh mục, dải câu chuyện) | `scrim` + độ mờ; chữ trong phạm vi `dark` |
| Dải câu chuyện, thẻ danh mục (vùng tối cố định) | phạm vi `dark` + `bg-surface-sunken` (nền khi chưa có ảnh) |
| Lightbox xem ảnh (vùng tối cố định thứ 5) | lớp `dark` trên Popup + `bg-surface-sunken/90`; xem `components/shared/image-lightbox.tsx` |
| Dải cam kết (thẻ bo góc) | `surface-sunken/50` (sậm hơn nền trang một bậc như thiết kế mẫu: 1,06 so với nền; đã đo `ink` 15,09, `ink-muted` 5,71 trên nền đã trộn) |
| Thẻ thông tin trang chi tiết | `surface-sunken/50` (cùng thẻ cam kết); huy hiệu bên trong `bg-canvas`; chấm "Còn hàng" `success-fg` (không thêm token mới) |
| Chấm màu sản phẩm (thẻ và nút chọn màu) | Mã hex lấy từ API (`colorHex` của biến thể, `colors[].hex` ở danh sách), là dữ liệu sản phẩm chứ không phải token giao diện, nên không viết cứng bảng màu ở frontend. MỌI chấm đều có viền rất mảnh, nhạt `border-ink/15` (không đo độ sáng, vì admin chọn được bất kỳ hex nào, kể cả trắng ngà) |
| Thanh cuộn ngang mảnh | tiện ích `scrollbar-thin` (thumb `ink`, track `border-subtle`) |

**Giao diện chỉ có chế độ sáng; `dark` là vùng tối cố định.** Website không có chuyển sáng/tối và không theo cài đặt của hệ điều hành. Class `dark` (khối `.dark` trong `global.css`) nay nghĩa là **vùng tối cố định** (inverse scope), không còn là "chế độ tối của cả trang": đặt lên một phần tử thì mọi token bên trong (kể cả `ui/Input`, `ui/Button`, `color-scheme: dark` cho ô nhập và thanh cuộn) dùng bộ màu tối, mà không thêm token. Có đúng **5 vùng**: thanh thông báo (`announcement-bar`), chân trang (`storefront-footer`), dải câu chuyện thương hiệu (`brand-story`), thẻ danh mục nổi bật (`category-card`) và lightbox xem ảnh (`image-lightbox`). Trong vùng này nền là `surface-sunken` của bộ token tối (đen ngà), tách khỏi trang sáng bằng viền `border-strong`. Chữ phụ chỉ dùng `ink-muted` (không dùng `ink-subtle` trên `surface-sunken`).
**Lớp tối phủ trên ảnh** (thẻ danh mục, dải câu chuyện): token `scrim` (`#11100E`, luôn tối, không khai báo lại trong `.dark`), dùng với độ mờ (`bg-scrim/70`, `from-scrim/85 via-scrim/50 to-transparent`). Chữ đặt trên ảnh dùng phạm vi `dark` (chữ `ink` luôn sáng) và vòng focus của thẻ vẽ BÊN TRONG (`-outline-offset-4`) vì vòng ngoài của phạm vi `dark` là màu sáng, sẽ biến mất trên nền trang sáng.
**Giới hạn của ngoại lệ gradient**: quy ước "không gradient" vẫn nguyên; `scrim` là ngoại lệ DUY NHẤT và chỉ được dùng làm lớp phủ trên ảnh (gradient đáy thẻ danh mục, lớp phủ phẳng của dải câu chuyện). Không dùng gradient làm nền, viền, nút hay trang trí khác; không thêm token gradient khác.
Đã đo (ảnh nền trắng là trường hợp xấu nhất): chữ `ink` trên `scrim/70` đạt 6,10:1; chữ thẻ danh mục trên gradient (alpha ~0,69 tại đỉnh chữ) đạt 5,80:1. Chữ phụ `ink-muted` trên `scrim/70` KHÔNG đạt trên ảnh trắng (≈3,1:1) nên dải câu chuyện chỉ dùng `ink`.
**Viền điều khiển**: nút viền ở trang chủ (mũi tên hero, nút "XEM BỘ SƯU TẬP", tab chưa chọn) dùng `border-control` (3,79:1) thay cho `border-strong` (2,37:1) của `Button secondary`; đoạn thanh tiến trình chưa chọn cũng `border-control`.

Không dựa vào màu để truyền thông tin: hết hàng ghi bằng chữ, mục đang chọn có vạch + chữ đậm + `aria-current`.

## 3. Chữ

Font: Archivo (tiêu đề, logo, khung tìm kiếm) và Be Vietnam Pro (thân bài), không đổi. Giá dùng Be Vietnam Pro
**không** `tabular-nums` và không dùng Geist Mono ở storefront (Geist Mono dành cho admin). Mỗi màn hình chỉ 2 đến 3 cỡ nội dung:

| Màn hình | Cỡ dùng (token) |
|---|---|
| Danh sách | `text-h1` hoa (tiêu đề trang) · `text-body-sm` (tên, giá, bộ lọc, chip, breadcrumb) · `text-overline` hoa giãn chữ (tên nhóm lọc, chân trang) |
| Chi tiết | `text-h2` (tên) · `text-h1` hoa (tiêu đề khối gợi ý) · `text-body` (giá) · `text-body-sm` (mô tả, pill size, dòng cam kết) · `text-caption` (huy hiệu, breadcrumb, link hướng dẫn size) · `text-overline` (nhãn "Màu sắc", "Kích thước") |
| Khung chung | `text-body-sm` hoa giãn chữ (mục điều hướng, dòng trong bảng; danh mục cháu `text-caption`), `text-body-sm` (liên kết chân trang) · `text-h3` (khung tìm kiếm, tiêu đề ngăn kéo) |
| Trang chủ | hero: `text-h1` (dưới `md` và ở `lg`), `text-display` (`md` và từ `xl`), hoa; `text-body-lg` (phụ đề), `text-body-sm`/`text-body` (mô tả) · đầu khối: `text-overline` (nhãn) + `text-h1` hoa (tiêu đề) · tên thẻ danh mục `text-body` · dải câu chuyện `text-display` serif nghiêng · `text-body-sm` (thẻ sản phẩm, liên kết "Xem tất cả") |

`text-display` chỉ dùng cho hero trang chủ và tiêu đề dải câu chuyện.
**Font serif nghiêng (trang chủ: nhãn đầu khối, phụ đề hero, dải câu chuyện)**: Newsreader Variable, kiểu italic THẬT (không nghiêng giả), giấy phép OFL-1.1, gói `@fontsource-variable/newsreader` ghim đúng `5.3.0` trong `package.json`. Chỉ nạp hai tập ký tự cần cho tiếng Việt (latin 64,5 kB + vietnamese 12,1 kB, khai báo `@font-face` tay ở `global.css`, không `@import` cả `wght-italic.css` để khỏi kéo latin-ext). Đã đọc bảng cmap: đủ 134/134 chữ có dấu tiếng Việt (hoa và thường) và đủ mọi chữ của tiêu đề; đã chụp màn hình dải câu chuyện, dấu hiển thị đúng. Dùng bằng `font-serif font-normal italic` (token `--font-serif`): nhãn nhỏ đầu khối (`SectionHeading`, nhãn dải câu chuyện; `text-h3`, viết thường như dữ liệu trong `lib/home-content.ts`, không đổi hoa/thường bằng CSS), phụ đề hero (`text-h3`/`md:text-h2`) và tiêu đề dải câu chuyện; không dùng cho chỗ khác. Hai tệp woff2 (latin + vietnamese, ~77 kB) được preload trong `index.html` vì phụ đề hero nằm trên màn hình đầu (Vite tự đổi sang tên băm khi build; chưa đo CLS/thời điểm hiện hero trên mạng chậm, xem mục 18). Chưa tải xong thì `font-display: swap` rơi về serif hệ thống. Nhãn `overline` chỉ ở chỗ phụ (tên nhóm lọc, nhãn nhóm chip), không đặt trên mọi tiêu đề.
Tiêu đề trang viết hoa (cùng kiểu hero và đăng nhập); tên sản phẩm viết thường như dữ liệu. Mỗi trang đúng một `h1`.

## 4. Khoảng cách và lưới

- **Quy tắc khoảng cách**: nền **4px** cho chi tiết nhỏ (từ 16px trở xuống: khoảng cách trong thẻ, giữa icon và chữ, giữa hai dòng chữ), nền **8px** cho bố cục
  (giữa các khối, lề, lưới). Ưu tiên token có sẵn (`gap-inline` 12px, `py-row`/`gap-stack` 16px, `p-card` 24px, `px-gutter` 24px, `--sp-block`). Chỉ coi là lệch
  khi dùng giá trị ngoài nền 4px (10, 14, 18, 20px...) hoặc giá trị tùy ý dạng `[..px]`; **không** đổi hàng loạt 4px/12px sang 8px.
- Container `max-w-7xl` (1280px), lề `px-gutter` (24px): một nguồn duy nhất ở `components/storefront/page-container.tsx` (`PageContainer`) cho mọi trang; header, chân trang, khung tìm kiếm và bảng điều hướng dùng cùng giá trị nhưng tự viết class (đổi bề rộng hay gutter thì đổi cả các nơi đó). Token liên quan ở `global.css`: `--hero-bleed` (140px: mức ảnh hero được lòi ra ngoài lề phải container, không lòi thêm ở màn rộng), `--hero-image-inset` (cạnh phải ảnh hero tới mép màn: `max(gutter, container-inset − hero-bleed)`), `--story-bleed`/`--story-edge`/`--story-max` (thẻ câu chuyện), `--container-max` (80rem), `--container-inset` (lề trái của khung tính từ mép màn hình, dùng `cqw` trong phần tử `@container`), `--hero-h` (chiều cao hero từ `lg`: `clamp(34rem, 100svh - thanh thông báo - header, 46rem)`).
- Khoảng cách giữa các khối lớn: token `--sp-block` (`pb-block`, `mt-block`, `py-block`): **56px di động, 96px từ `lg`**. `--sp-section` (80px) không đổi
  vì trang đăng nhập và trang chủ cũ đang dùng.
- Chiều cao thanh thông báo chạy chữ: `--announcement-h` (40px) → `h-announcement`, `top-announcement` (mốc cuộn của header đặt ngay dưới thanh).
- Chiều cao header: `--header-h` (64px, 80px từ `md`) → `h-header`, `scroll-mt-header` (đích "bỏ qua tới nội dung" và đầu danh sách không bị header dính che).
- Phần tử dính dưới header: `--sticky-gap` (24px), `--sticky-top` (= `--header-h` + `--sticky-gap`, tự theo breakpoint) và `--sticky-max-h` (= `100dvh − --sticky-top − --sticky-gap`); thẻ thông tin ở trang chi tiết dùng bộ này (mục 10, "Trang chi tiết"). Cột lọc ở `/products` vẫn dùng công thức riêng `header-h + 2rem`.
- Lưới sản phẩm (`ProductGrid`): **2 cột** (di động), **3 cột** từ `md` (768px), **4 cột** từ `xl` (1280px) khi có cột lọc bên trái (`layout="beside-filters"`);
  nơi không có cột lọc (khối liên quan, trang chủ) dùng `layout="full"`: 4 cột từ `lg`. Khoảng cách `gap-x-4 md:gap-x-6`, `gap-y-10 lg:gap-y-12`.
- Cột lọc 15rem, sticky dưới header, từ `lg`. Chi tiết: 6/6 từ `md`, **7/5 từ `lg`** (ảnh lớn hơn thông tin; đo từ thiết kế mẫu 350:250), dưới `md` xếp dọc (ảnh rồi thẻ). Từ `lg` thẻ thông tin dính theo cuộn (mục 10, "Trang chi tiết").

## 5. Hình khối

Storefront "mềm": bo góc theo ba bậc đo từ thiết kế mẫu `docs/design/home-v2/`, còn **khu admin và trang auth giữ góc nhỏ** (2px/3px).

| Token | Giá trị | Dùng cho |
|---|---|---|
| `control` (`--radius-control`, `rounded-xs`) | 10px trong `.soft-ui` (2px ngoài phạm vi) | nút, ô nhập, select, chip biến thể |
| `card` (`rounded-card`) | 18px | ảnh sản phẩm trên thẻ, ảnh nhỏ của bộ ảnh chi tiết, thẻ danh mục, skeleton ảnh |
| `panel` (`rounded-panel`) | 28px | ảnh hero (từ `lg`), thẻ câu chuyện, thẻ cam kết, ảnh chính và thẻ thông tin trang chi tiết |
| `pill` (`rounded-4xl`) | tròn hoàn toàn | huy hiệu tồn kho, tab, mũi tên hero |

**Phạm vi hóa**: class `soft-ui` gắn lên `<main>` (`StorefrontLayout`) và `<footer>` (`StorefrontFooter`), **không** gắn lên header (giữ nguyên), admin hay trang auth. `.soft-ui` ghi đè `--radius-control` (và `--radius-surface`); hoạt động vì `@theme inline` giữ nguyên tham chiếu (`rounded-xs` = `border-radius: var(--radius-control)`, đọc tại phần tử, cùng cơ chế `.density-admin`). Popup render ở Portal nằm ngoài cây nên tự gắn `soft-ui` ở chỗ gọi (ngăn kéo bộ lọc, `SelectContent` của sắp xếp). `card`/`panel` chỉ storefront dùng nên không cần phạm vi.

**Cỡ nút**: mọi nút, chip, ô nhập là 44px (`h-control`). **Ngoại lệ có chủ đích** là nút hành động chính cỡ `lg` (50px): hai nút của mỗi slide hero, nút "KHÁM PHÁ BỘ SƯU TẬP" của dải câu chuyện, "Thêm vào giỏ" và nút trong thanh mua dính đáy; không dùng `lg` cho nút nào khác. Mũi tên hero là nút tròn 44px. Đường kẻ 1px thay cho đổ bóng; không có bóng đổ nào.

**Nút hover ĐẢO MÀU** (chỉ trong `.soft-ui`; `@custom-variant soft (&:is(.soft-ui *))` ở `global.css`, lớp `soft:` khai báo trong variant `primary`/`secondary` của `ui/button.tsx`): nút đặc (`primary`) khi hover thành nền `canvas` + chữ `ink` + viền `ink`; nút viền (`secondary`, viền `border-control`) khi hover thành nền `primary` + chữ `primary-fg`. Trong vùng `dark` (dải câu chuyện, chân trang) cặp màu tự đảo theo token. Đã đo tương phản: 16,0 (đặc → sáng), 17,2 (viền → đặc), 16,2 (vùng dark). Chỉ chạy trên thiết bị có hover (đã đo `hover: none` thì không đảo); chuyển 150ms (`transition-colors`), giảm chuyển động thì tức thì. Tab đang chọn KHÔNG đảo (`SELECTED_TAB` ở `tab-bar.tsx`). Nút `ghost` và nút ngoài phạm vi (header) giữ hover cũ.

## 6. Chuyển động

Chỉ CSS và Tailwind, không thư viện animation. Token ở `global.css`:

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--motion-fast` | 150ms | đổi màu, gạch chân, nhấn |
| `--motion-base` | 250ms | vào trang (`animate-page-enter`), header đổi nền, lưới mờ khi tải lại |
| `--motion-slow` | 400ms | khung tìm kiếm, hiện dần khi cuộn |
| `--motion-drawer-in` / `--motion-drawer-out` | 300ms / 220ms | ngăn kéo (menu, bộ lọc, giỏ) mở / đóng, easing `--motion-ease-drawer` (`ease-drawer`) |
| `--motion-scrim` | 200ms | lớp nền sau ngăn kéo và hộp thoại (chỉ opacity) |
| `--motion-dialog-in` / `--motion-dialog-out` | 180ms / 120ms | hộp thoại nhỏ (`StorefrontDialog`): mờ vào + phóng 0,96 → 1 |
| `--motion-image` | 500ms | ảnh mờ dần khi tải xong, phóng 1,03 khi rê chuột |
| `--motion-marquee` | 60s | chạy hết MỘT nửa dải chữ của thanh thông báo (`animate-marquee`, tuyến tính, lặp vô hạn) |
| `--motion-ease` (`ease-smooth`) | `cubic-bezier(0.22, 1, 0.36, 1)` | mọi chuyển động |

Tiện ích: `shimmer` (skeleton có vệt sáng lướt), `press` (thu nhỏ 0,98 khi nhấn, không áp dụng cho nút bị vô hiệu hóa), `animate-page-enter`.
Quy tắc:

- **Vào trang** gắn `key` theo **pathname**, không theo query: đổi bộ lọc/trang không làm cả trang nhấp nháy lại (`StorefrontLayout`).
- **`Reveal`** (hiện dần khi cuộn): một lần duy nhất, chỉ cho khối nằm dưới màn hình đầu ("Có thể bạn cũng thích", các khối trang chủ dưới hero). Khối mặc định HIỆN; lúc gắn vào DOM đo
  một lần, khối đã trong màn hình (kể cả màn 1080p) giữ nguyên, không bao giờ bị giấu hay chạy transition (không nháy). Chỉ khối dưới màn hình bị giấu, và giấu KHÔNG có transition; cuộn tới mới
  thêm transition rồi hiện. Hai bộ quan sát (vào màn hình, và `ABOVE_ONLY_MARGIN` cho khối đã nằm hẳn phía trên) để cuộn nhảy qua khối không làm nó ẩn mãi. Tải lại dữ liệu bên trong không chạy lại.
  **Không** dùng ở footer, danh sách, nội dung màn hình đầu.
- **Easing theo phạm vi storefront**: `StorefrontLayout` đặt `--default-transition-timing-function: var(--motion-ease)` trên phần tử gốc, nên mọi `transition-*` không nói rõ easing (kể cả của `ui/Button`,
  `ui/Select` nằm trong khung) dùng đường cong token mà không đụng `ui/` và không đổi admin. Popup render ở Portal (ngăn kéo, danh sách chọn) không thừa hưởng, tự khai báo easing riêng.
- Hiệu ứng "chỉ khi rê chuột" của Tailwind (`hover:`) chỉ áp dụng khi thiết bị có hover. Phần tử ẩn cho tới khi rê chuột (mũi tên ô danh mục) phải ẩn bằng `[@media(hover:hover)]:` để thiết bị cảm ứng luôn thấy nó.
- Giảm chuyển động (`prefers-reduced-motion`): `global.css` đã đưa mọi animation/transition về gần 0; riêng phần transform dùng `motion-safe:`.
- Cấm: parallax, carousel TỰ CHẠY, hiệu ứng nặng. **Carousel thủ công được phép** (nút, thanh tiến trình, phím mũi tên, vuốt; chỉ đổi khi người dùng ra lệnh; hero trang chủ, mục 14). **Ngoại lệ có chủ đích**: thanh thông báo chạy chữ (mục 15) tự chạy nhưng dừng được (rê chuột, focus) và tắt hẳn khi giảm chuyển động.

## 7. Ảnh

- Khung `aspect-[3/4]` cố định (`ProductImage`) nên không giật bố cục. Trong lúc tải: skeleton shimmer cùng tỉ lệ; xong thì mờ dần vào (500ms).
- Thiếu hoặc lỗi ảnh: chữ cái đầu thương hiệu ("M", màu `ink-muted`; không dùng `ink-subtle` trên `surface-sunken`) trên `surface-sunken`. `alt` luôn là tên sản phẩm.
- `loading`: **4 thẻ đầu của danh sách và ảnh chính trang chi tiết là `eager`** (ảnh chính thêm `fetchPriority="high"`); còn lại `lazy`. Mọi ảnh `decoding="async"`.
  Lưới nằm dưới màn hình đầu truyền `eagerCount={0}`.
- Ảnh chính trang chi tiết tỉ lệ **4:5** (đo từ thiết kế mẫu), bo `panel` (`ProductImage radius="panel"`); là nút `aria-label="Xem ảnh lớn"`, `cursor-zoom-in`, mở `ImageLightbox`. Chỉ có nút khi ảnh đã hiện ra.
- **Bộ ảnh** (`ProductGallery`) nhận danh sách URL từ `galleryImages` (`images` đã sắp xếp, tối đa 6; rỗng thì dự phòng `[imageUrl]`; không có gì thì khung dự phòng của `ProductImage`: chữ cái đầu thương hiệu trên nền `surface-sunken`). Từ 2 ảnh trở lên mới hiện hàng ảnh nhỏ (`GalleryThumbs`: 4 cột, ô vuông bo `card`, ô đang chọn viền `ink` + `aria-current`, bấm hoặc bàn phím đổi ảnh chính); một ảnh thì không có hàng đó.
- Hạn chế: ảnh gốc từ máy chủ, không có bản thu nhỏ (`srcset`) nên tải nặng trên di động. Cần endpoint resize phía backend.
- **Ảnh tĩnh của trang chủ** (hero, thẻ danh mục, dải câu chuyện): tệp đặt trong `public/home/`, đường dẫn + `alt` + `objectPosition` khai báo ở `lib/home-content.ts` (đổi vùng ảnh giữ lại bằng `objectPosition`, vd. `"center 30%"`, không sửa code). Dựng bằng `StaticImage` (`components/storefront/static-image.tsx`, trạng thái tải dùng chung `hooks/use-image-load.ts` với `ProductImage`): skeleton khi tải, mờ dần khi xong; thiếu tệp hoặc lỗi thì khung trung tính `surface-sunken` kèm chữ cái đầu thương hiệu (tắt được cho nền dải rộng), KHÔNG chữ giữ chỗ. Chỉ nhận đường dẫn bắt đầu bằng một dấu `/`. Ảnh slide đầu của hero (bo góc, có lề, xem mục 14) `eager` + `fetchPriority="high"`, ảnh còn lại `lazy` (lưu ý: ảnh slide 2–3 nằm trong màn hình đầu nên trình duyệt vẫn tải sớm).
  Kích thước đề xuất (WebP, ≤ ~250 kB mỗi ảnh, hero ≤ ~400 kB; **hiện trạng đo ngày 2026-11-04: hầu hết vượt ngân sách** — hero-3 ≈ 2,3 MB, story ≈ 1,0 MB, category-ao-so-mi ≈ 0,8 MB, category-quan-jean ≈ 0,8 MB, hero-1 ≈ 0,7 MB, category-phu-kien ≈ 0,5 MB, category-ao-khoac ≈ 0,4 MB, chỉ hero-2 ≈ 0,1 MB đạt; cần nén lại trước khi demo): hero NGANG 4:3, 1600×1200 (`hero-1/2/3.webp`; cột ảnh desktop gần nằm ngang ~1,2–1,4:1, tablet 3:2 và di động 1:1/chặn cao đều cắt từ ảnh này, đặt chủ thể ở giữa); thẻ danh mục dọc 3:4, 900×1200 (`category-ao-so-mi/quan-jean/ao-khoac/phu-kien.webp`); dải câu chuyện 2:1, 2400×1200 (`story.webp`).

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

**Bố cục từ `xl`**: logo `BrandLogo` bên trái; thanh điều hướng và nhóm biểu tượng (tìm kiếm, trái tim "Yêu thích" giả, giỏ hàng, đăng nhập hoặc `UserMenu`) gom về BÊN PHẢI, thanh điều hướng sát bên trái nhóm biểu tượng, cách đúng 40px (`xl:ml-10`; hàng flex `xl:gap-0`). Dưới `xl`: nút menu, wordmark, tìm kiếm, giỏ hàng, và ngăn kéo (mục 9b-2).

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
vùng thu gọn `inert`; bên trong có "Tất cả <mục>" và danh mục con, cháu thụt vào), rồi "Địa chỉ"; dưới cùng là khối tài khoản. Kiểu chữ hàng cùng thanh điều hướng (hoa, giãn chữ). Dòng đang xem có `aria-current` + nền hover;
mục chứa danh mục đang xem tự mở sẵn và nhãn gạch chân. Chân trang có liên kết "Tất cả sản phẩm" và "Địa chỉ cửa hàng".

## 10. Trạng thái bắt buộc

Loading (skeleton cùng tỉ lệ, chỉ lần tải đầu; đổi bộ lọc/trang giữ lưới cũ mờ `opacity-60` + `aria-busy`), rỗng (danh mục chưa có sản phẩm; không khớp bộ lọc có
"Xóa bộ lọc"; chưa có sản phẩm nào), lỗi có "Thử lại", trang vượt tổng ("Về trang 1"), 404 danh mục (không gọi API sản phẩm), 404 sản phẩm, hết hàng,
biến thể không có tổ hợp. Dùng `StateMessage` (icon, tiêu đề, mô tả, hành động; không khung nét đứt): luôn nói chuyện gì xảy ra và làm gì tiếp. Trạng thái chiếm CẢ TRANG (404, không tìm thấy sản phẩm/danh mục,
lỗi tải chi tiết) dùng `titleAs="h1"` để trang vẫn có đúng một `h1`; trạng thái nằm trong trang đã có `h1` giữ `p`. URL lạ ngoài `/admin` hiện 404 TRONG khung storefront (`pages/storefront/not-found`).

Chip biến thể (`OptionChipGroup`): `radiogroup`, mũi tên/Home/End đổi lựa chọn, tab-index luân chuyển. Chip hết hàng **và** chip không có tổ hợp đều ghi chữ "Hết hàng";
chip hết hàng vẫn chọn được (để thấy trạng thái), chip không có tổ hợp thì viền nét đứt + `aria-disabled` (trừ ca ma trận thưa mà chip đó là đường duy nhất tới
tổ hợp: vẫn cho bấm và nhảy sang biến thể gần nhất). Mặc định chọn biến thể còn hàng đầu tiên. Số lượng 1 đến 99, giới hạn thật do server.
`OptionChipGroup` có prop `variant` (`chip` mặc định, `swatch`, `pill`). **Màu = `swatch`**: nút 44px chứa chấm 28px (màu theo `colorHex` của biến thể, mục 2), đang chọn có viền hai lớp (outline `ink` cách chấm 2px), mọi chấm có viền mảnh `border-ink/15`; màu có `colorHex` null thì ô đó rơi về nút chữ. **Size = `pill`**: pill tròn cao 44px. Hết hàng (và không có tổ hợp) ở `swatch`/`pill`: mờ đi + gạch chéo (đảo màu theo nền) + `aria-label` "<giá trị>, hết hàng", KHÔNG thêm chữ nên mọi pill cùng chiều cao; chỉ `chip` mới ghi chữ "Hết hàng". Tên màu không phân biệt hoa thường, bỏ khoảng trắng thừa.

**Trang chi tiết** (`ProductInfoCard`): hai cột (7/5 từ `lg`, ảnh 4:5 bo `panel` bên trái, MỘT thẻ `surface-sunken/50` bo `panel` bên phải, cao theo nội dung; dưới `md` xếp dọc). Breadcrumb nhỏ (`subtle`). Thẻ: huy hiệu danh mục + "Còn hàng" (chấm `success-fg`) hoặc "Hết hàng" theo `product.inStock` (API chi tiết chưa có `lowStock` nên không có "Sắp hết"), tên, giá, mô tả, màu, size (link "Hướng dẫn chọn size" là stub, mục 13), hàng thao tác (ô số lượng pill, "Thêm vào giỏ" pill đen có icon túi, trái tim stub), đường kẻ, ba dòng cam kết. Hàng thao tác dùng container query của thẻ: từ 24rem một hàng; hẹp hơn thì số lượng + tim ở hàng trên, nút full-width ở hàng dưới (không tràn ngang ở 375px). Trạng thái còn/hết của tổ hợp đang chọn là vùng `sr-only aria-live`; khi hết hàng nút ghi "Hết hàng" và bị khóa. Khối "Có thể bạn cũng thích": 4 thẻ cùng danh mục, thiếu thì bổ sung bằng MỘT lần gọi `GET /products` (không lọc danh mục, bỏ trùng và bỏ sản phẩm đang xem), "Xem tất cả →" về `/products?category=<slug>`.

**Thẻ thông tin dính (từ `lg`)**: thẻ luôn nằm trong tầm nhìn khi cuộn và dừng đúng mép dưới cột ảnh (ảnh chính + hàng ảnh nhỏ). Làm bằng `position: sticky` thuần CSS, không JavaScript đo cuộn, không thư viện, không chuyển động mới (nên không liên quan `prefers-reduced-motion`).
- **Ô dính**: ô lưới bọc thẻ (`div.lg:col-span-5`) có `lg:self-start lg:sticky lg:top-(--sticky-top)`. `self-start` để ô không bị kéo giãn bằng chiều cao hàng (nếu bị kéo giãn thì không còn chỗ để chạy); ô lưới cao bằng hàng nên thẻ tự dừng ở mép dưới cột ảnh. Chỉ 1 ảnh thì cột ảnh ngắn hơn, quãng dính ngắn lại (không lỗi); cột ảnh ngắn hơn thẻ thì hàng lưới do thẻ quyết định và thẻ không có chỗ chạy.
- **Vị trí**: `top = --sticky-top` = chiều cao header (`--header-h`: 64px, 80px từ `md`) + `--sticky-gap` (24px). Thanh thông báo không dính nên không tính. Header đã dính ở `top: 0` nên thẻ dính không chui dưới header và ô trong thẻ không bị header che khi focus.
- **Không có ngưỡng chiều cao**: sticky LUÔN bật từ `lg`. Chính thẻ là phần tử cuộn: `lg:max-h-(--sticky-max-h) lg:overflow-y-auto` + `scrollbar-soft` (thanh 8px, chỉ chiếm chỗ khi có tràn; không dùng `scrollbar-gutter`). Cửa sổ đủ cao thì thẻ không có thanh cuộn và giữ nguyên hình dạng; cửa sổ quá thấp (vd 1280×720) thì nội dung trong thẻ tự cuộn nên nút "Thêm vào giỏ" luôn tới được (Tab tới ô nào trình duyệt tự cuộn tới ô đó). Nền, bo góc, đệm 32px của thẻ không đổi; vòng focus của ô sát mép nằm trong đệm.
- **Không `overscroll-contain`**: cuộn hết thẻ thì lăn chuột tiếp tục cuộn trang, người dùng không bị kẹt trong thẻ.
- **Điều kiện để sticky không hỏng**: không lớp cha nào của ô dính (lưới, `PageContainer`, `<main>`, khung storefront) được đặt `overflow` hidden/auto/scroll. Cần ẩn tràn ngang ở đâu đó thì dùng `overflow-x: clip`, đừng dùng `hidden`. Hiện không lớp nào có `overflow`.
- Dưới `lg`: không đổi (xếp dọc, thanh mua dính đáy ở mục 12).

## 11. Truy cập

Liên kết "Bỏ qua tới nội dung" (`#main-content`); mỗi trang một `h1`; landmark (`header`, `nav` có nhãn, `main`, `footer`, `aside`, `section` có nhãn);
mọi icon có nhãn chữ; focus ring theo token (không bao giờ `outline: none` trần); điều khiển bằng bàn phím trọn vẹn, trả focus đúng nơi (ngăn kéo, tìm kiếm,
lightbox, bỏ chip, đổi trang); vùng chạm tối thiểu 44px (liên kết breadcrumb và chân trang có `min-w-control` ở di động); vùng live cho số kết quả và trạng thái còn hàng.
**Vòng focus và `outline-none`**: trong Tailwind v4, `outline-none` đặt `--tw-outline-style: none`, nên `focus-visible:outline-2` đi kèm KHÔNG vẽ được vòng nào (đã đo: `outline-style: none`). Không bao giờ viết `outline-none` cạnh `focus-visible:outline-*`; bỏ `outline-none`, vòng chung của `global.css` (`:focus-visible`) hoặc `focus-visible:outline-2` tự lo. Chỉ phần tử nhận focus bằng chương trình (`main`, vùng kết quả, popup) mới có `outline-none`. Đã sửa ở storefront: `ui/button`, `ui/input`, `ui/select` (trigger), `brand-logo`, `password-input`, `image-preview`, `search-panel`, `option-chip-group`, `quantity-stepper`; quét Tab thật ở `/`, `/products`, `/products/:slug`, `/thong-tin/:slug`, `/login`, `/dia-chi`: trước 49 điểm dừng thiếu vòng focus, sau 0. Khu admin còn lỗi này (xem mục 18).

## 12. Thanh mua dính đáy (di động)

`StickyBuyBar` được portal vào một ô `sticky bottom-0 h-0` ở cuối trang chi tiết (không dùng `fixed`) nên tự dừng ở cuối nội dung và không che chân trang.
Hiện khi nút "Thêm vào giỏ" chính đã cuộn lên trên khỏi màn hình (vùng quan sát chỉ có một biên, xem `purchase-panel.tsx`, để cuộn nhảy cũng đúng). Hiện giá và "Màu · Size"
đang chọn. Đệm dưới theo `env(safe-area-inset-bottom)`; chỉ có tác dụng khi `index.html` đặt `viewport-fit=cover` (chưa đặt).

## 13. Nội dung

`src/lib/store-info.ts` là nơi duy nhất cho tên, khẩu hiệu, mục điều hướng (`navItems`), danh sách cửa hàng (`stores`), liên hệ, thông điệp thanh thông báo (`announcements`), nội dung chân trang (`footer`) và chữ form nhận tin
(`newsletter`). Trang thông tin tạm cấu hình riêng ở `lib/info-pages.ts`; **nội dung trang chủ** (slide hero, nhãn các khối, danh mục nổi bật, câu chuyện, tab, dải cam kết, đường dẫn ảnh, `objectPosition`) ở `lib/home-content.ts`. **Nội dung mẫu, chờ chủ cửa hàng xác nhận**: khẩu hiệu "Thời trang tối giản cho mọi ngày", toàn bộ chữ của trang chủ lấy y thiết kế mẫu, và các **cam kết kinh doanh lấy y thiết kế mẫu** (bảng dưới). Liên hệ chưa có (chân trang ghi "Thông tin liên hệ đang được cập nhật"). Giọng ngắn gọn, tự tin, tiếng Việt.

### Bảng cam kết chờ xác nhận (danh sách việc trước khi demo)

Các câu dưới đây đang hiện trên giao diện nhưng **hệ thống chưa làm thật**. Mỗi dòng ghi việc cần có để câu đó đúng sự thật; chưa làm được thì xóa hoặc sửa câu trong `store-info.ts` trước khi demo.

| Cam kết hiện trên giao diện | Nằm ở | Hệ thống cần làm thật để đúng sự thật |
|---|---|---|
| "Miễn phí vận chuyển cho đơn hàng từ 500.000₫" | thanh thông báo (`STORE.announcements`) | Backend hiện chỉ có `Order.shippingFee` (mặc định 0), **chưa có công thức phí ship**. Cần: chốt quy tắc (phí cố định hay theo vùng; ngưỡng 500.000₫ tính trên `subtotal` trước hay sau voucher); tính `shippingFee` ở bước tạo đơn (cùng transaction, kiểm lại giá); trang giỏ/thanh toán hiện phí ship và dòng "miễn phí"; **trang giỏ và ngăn kéo giỏ hiện cũng ĐÃ có dải "Mua thêm … để được miễn phí vận chuyển" (`FreeShippingBar`) dùng cùng hằng số `FREE_SHIPPING_THRESHOLD` (`lib/store-info.ts`, đã dùng chung với thanh thông báo): tuyên bố này CHƯA có phí vận chuyển thật phía backend, bước đặt đơn phải áp dụng thật quy tắc này (đơn từ ngưỡng thì `shippingFee` = 0, dưới ngưỡng thì tính phí) và hiện phí ở bước thanh toán;** e2e cho Orders; cập nhật `docs/02` và `docs/03`. |
| "Đổi trả trong 30 ngày" | thanh thông báo | `docs/00` ghi đổi trả để V2; backend chỉ có trạng thái `RETURNED` cho hàng hoàn về sau khi giao. Cần: viết chính sách đổi trả (điều kiện, thời hạn 30 ngày tính từ lúc nào, ai chịu phí), luồng khách yêu cầu đổi/trả và staff/admin xử lý (hoàn tiền, cộng lại `stock`), rồi điền nội dung trang `/thong-tin/doi-tra`. |
| "Nhận ngay ưu đãi 10% cho đơn hàng đầu tiên" | form nhận tin ở chân trang (`STORE.newsletter.description`) | Cần: endpoint đăng ký nhận tin (`POST /newsletter/subscribers`) và bảng lưu email; cơ chế cấp ưu đãi (tạo voucher 10% dùng một lần cho email đó, giới hạn "đơn đầu tiên" của khách, gửi mã qua email); voucher chỉ do Admin tạo nên cần luồng tự cấp mã có kiểm soát. Trước đó form chỉ báo "đang hoàn thiện". |
| "Chất liệu thoáng mát, form chuẩn, dễ phối" | mô tả chân trang (`STORE.footer.description`), mô tả slide 1 và 3 của hero, mô tả dải câu chuyện (`lib/home-content.ts`) | Là lời quảng cáo về sản phẩm: cần xác nhận với chủ cửa hàng là đúng với hàng thật, hoặc đổi sang câu không cam kết. Không cần code. |
| "Giao hàng nhanh toàn quốc — Giao tận nơi trên mọi tỉnh thành." | dải cam kết (`HOME.assurances`) | Cần: danh sách tỉnh thành thật sự giao được; đối tác vận chuyển và thời gian giao cam kết ("nhanh" là bao lâu); tích hợp tính phí ship và địa chỉ theo tỉnh ở thanh toán (xem hàng "Miễn phí vận chuyển"); trang `/thong-tin/van-chuyen`. Chưa có thì sửa câu thành không cam kết. |
| "Đổi trả dễ dàng trong 30 ngày" (dải cam kết) | dải cam kết | Cùng việc với hàng "Đổi trả trong 30 ngày" ở trên. |
| "Hỗ trợ khách hàng 24/7 — Luôn sẵn sàng giải đáp mọi lúc bạn cần." | dải cam kết | Cần: kênh hỗ trợ thật (chat, hotline, email) có người trực 24/7 hoặc bot trả lời; thông tin liên hệ thật (hiện `STORE.contact` đang trống). Chưa có thì bỏ "24/7" hoặc cả ô. |
| "Cam kết chất lượng chính hãng — Sản phẩm chính hãng từ MONO STUDIO." | dải cam kết | Cần: chủ cửa hàng xác nhận bằng văn bản về nguồn hàng; chính sách khi phát hiện hàng không chính hãng (hoàn tiền). Không cần code ngoài việc sửa/xóa câu nếu không xác nhận được. |
| "Bộ sưu tập Thu Đông 2026", nhãn "AW26", nút "XEM BỘ SƯU TẬP" | hero (`HOME.hero`) | Hệ thống KHÔNG có khái niệm bộ sưu tập: nút hiện chỉ trỏ `/products`. Cần: model/trang bộ sưu tập (hoặc nhãn mùa trên sản phẩm) rồi nối nút tới đó; hoặc đổi chữ thành "XEM SẢN PHẨM" và bỏ "Thu Đông 2026/AW26" nếu không có thật. |
| "Best sellers — XU HƯỚNG HIỆN TẠI — được yêu thích tại MONO STUDIO" | khối best sellers | Dữ liệu hiện là **TẠM**: 4 sản phẩm tạo sớm nhất, KHÔNG phải bán chạy (`useBestSellerProducts`). Cần: có đơn hàng thật, endpoint thống kê sản phẩm bán chạy (đơn `COMPLETED`), đổi nguồn ở đúng một hook đó; trước đó nên đổi nhãn thành chữ không cam kết. |
| Nút trái tim "Yêu thích" (header, và trên thẻ ở Best sellers, Sản phẩm mới về, Tất cả sản phẩm `/products` và "Có thể bạn cũng thích") | `StorefrontHeader` (`WishlistButton`), `ProductCard` (`quickActions`) | **GIAO DIỆN GIẢ**: bấm chỉ hiện toast "Yêu thích sẽ sớm có mặt" (`STORE.comingSoon.wishlist`), không đổi trạng thái tim, không lưu, không gọi API, KHÔNG qua cổng đăng nhập (khác giỏ hàng). Làm thật: backend wishlist (bảng + `POST/DELETE` theo sản phẩm của khách), cổng đăng nhập như `useRequireLogin` cho khách chưa đăng nhập, `features/wishlist` (trạng thái tim đã chọn trên thẻ và đếm ở header nếu muốn), trang danh sách yêu thích, chuyển nút header vào ngăn kéo di động (hiện ẩn dưới 380px vì nhóm icon chạm logo). |
| Nút trái tim trong hàng thao tác trang chi tiết | `PurchasePanel` | **GIAO DIỆN GIẢ** như hàng trên: bấm chỉ hiện toast `STORE.comingSoon.wishlist`, không đổi trạng thái, không lưu, không qua cổng đăng nhập. Làm thật cùng việc với nút trái tim ở trên. |
| Link "Hướng dẫn chọn size" (trang chi tiết) | `VariantPicker` | **STUB**: bấm chỉ hiện toast "Hướng dẫn chọn size sẽ sớm có mặt" (`STORE.comingSoon.sizeGuide`). Không bịa bảng số đo. Làm thật: chủ cửa hàng cung cấp bảng số đo từng loại sản phẩm, điền trang `/thong-tin/huong-dan-chon-size` (`lib/info-pages.ts`) hoặc cửa sổ bảng size rồi nối link tới đó. |
| Ba dòng cam kết ở thẻ thông tin trang chi tiết ("Giao hàng nhanh toàn quốc", "Đổi trả dễ dàng trong 30 ngày", "Cam kết chất lượng chính hãng") | `ProductInfoCard` (lấy từ `HOME.assurances`, icon `truck`/`return`/`shield`) | Cùng nguồn và cùng việc cần làm với ba hàng tương ứng của dải cam kết ở trên; không có tuyên bố mới. |
| Nút "Thanh toán ngay" (ngăn kéo giỏ và trang `/gio-hang`) | `CheckoutButton` (`features/cart`) | **STUB**: bấm chỉ hiện toast "Thanh toán sẽ sớm có mặt" (`STORE.comingSoon.checkout`). Khóa khi không có dòng nào mua được. Làm thật ở bước đặt đơn: module Orders/Checkout ở backend (kiểm lại tồn kho và giá, tạo `Order`/`OrderItem` trong một transaction, áp dụng miễn phí vận chuyển theo hàng đầu của bảng này), trang thanh toán `features/checkout`, rồi nối nút tới đó. |


`STORE.stores` (`{ name, address, phone?, hours?, mapUrl? }`) cho trang `/dia-chi` (`pages/storefront/stores`): ĐỂ RỖNG cho tới khi chủ cửa hàng cung cấp thông tin thật; rỗng thì hiện `StateMessage` "Thông tin cửa hàng đang được cập nhật". Mỗi cửa hàng là một khối
(`StoreEntry`: tên `h2`, địa chỉ, điện thoại `tel:`, giờ mở cửa, "Xem bản đồ" mở tab mới và chỉ dựng khi `mapUrl` là http/https). Trang có một `h1` "Địa chỉ" và tiêu đề tab. Trang này có trong cột "Đường dẫn nhanh" của chân trang (từ `navItems`).

## 14. Trang chủ

Trang `pages/storefront/home` chỉ ghép. Nội dung ở `lib/home-content.ts` (`HOME`), liên kết danh mục tra bằng `lib/home-links.ts` (`homeHref`: danh mục có trong `GET /categories` thì `/products?category=<slug>`, không thì `/products`; không bao giờ tạo liên kết tới danh mục không có). Khối nào lỗi hoặc rỗng tự xử lý riêng, không làm vỡ cả trang. Ba khối có tiêu đề (danh mục nổi bật, best sellers, sản phẩm mới về) dựng trên khung chung `components/storefront/home/home-section.tsx` (`Reveal` + `PageContainer` + `section` có nhãn + `SectionHeading`); dải câu chuyện và dải cam kết tự bọc `Reveal` (hiện dần một lần; khối ẩn thì không để lại khoảng trống). Khung nội dung dùng `PageContainer` (một container thống nhất, không theo lề lệch của mẫu). Trang gọi `useDocumentTitle(STORE.name)`.

1. **Hero** (`components/storefront/home/home-hero.tsx` + `hero-slide`, `hero-controls`, `hero-progress`, `hero-layout`: bề rộng cột chữ 46%, khớp `HERO_SPLIT_CLASS` trong `hero-slide`): carousel THỦ CÔNG 3 slide, không tự chạy.
   - Cấu trúc: `section aria-roledescription="carousel"` có nhãn; ba slide xếp chồng trong CÙNG một ô lưới (chiều cao không nhảy), mỗi slide `role="group" aria-roledescription="slide" aria-label="n / 3"`; slide không hiện `inert` + mờ (không dùng `visibility`: chuyển `hidden → visible` giữ `hidden` tới hết chuyển động nên `focus()` ngay sau khi đổi slide thất bại). Một `h1` ẩn thị giác (tên cửa hàng + khẩu hiệu), tiêu đề slide là `h2`. Vùng `aria-live="polite"` báo "Slide n / 3: tiêu đề".
   - Điều khiển (`useCarousel`, `useSwipe`): hai mũi tên vuông 44px (quay vòng), thanh tiến trình 3 đoạn mỗi đoạn là một nút cao 44px có `aria-label` + `aria-current`, bộ đếm "01 / 03", phím ←/→ khi focus nằm trong hero, vuốt ngang bằng cảm ứng (≥ 48px và ngang trội hơn dọc 1,5 lần, chỉ `pointerType touch`; `touch-action: pan-y` giữ cuộn dọc). Đổi slide khi focus đang nằm trong slide cũ thì focus chuyển sang nút đầu của slide mới (không rơi về `body`).
   - Chuyển động: ảnh mờ chéo (`--motion-image`), chữ trồi 12px (`--motion-slow`); giảm chuyển động thì đổi tức thì.
   - Desktop (từ `lg`): chia 46/54, cao `--hero-h`; ảnh bo `panel` có lề `gutter` ở trên, dưới và phải, KHÔNG còn tràn sát mép; cạnh phải ảnh cách mép màn `--hero-image-inset`, tức lòi ra ngoài lề phải container tối đa `--hero-bleed` (140px) rồi không lòi thêm ở màn rộng hơn (màn hẹp thì đúng một gutter). Cột chữ và hàng điều khiển canh theo mép trái container bằng `--container-inset` (đơn vị `cqw` trong phần tử `@container`). Đã đo ở 1024, 1280, 1366, 1440, 1536, 1620, 1920, 2560: lòi 0/0/43/80/128/140/140/140px, mép trái chữ = mép trái header ở mọi cỡ. Mũi tên là nút tròn; phụ đề serif nghiêng. Cột chữ: nhãn có đường kẻ ngắn, tiêu đề, phụ đề, mô tả, hai nút `lg`, điều khiển ở đáy.
   - Dưới `lg`: ảnh trên (vuông chặn cao 40svh dưới `md`; 3:2 từ `md`), chữ dưới, điều khiển dưới cùng. Chữ trong slide canh từ đỉnh (không giữa) để slide ngắn không bị đẩy xuống. Ảnh di động có lề ngang `gutter`, bo `card`. Đã đo 375×667, 375×812, 360×740, 768×1024, 1024×768: nút chính (cả 3 slide) nằm trong màn hình đầu (ở 375×667 đáy nút ở 659px, sát mép 667px; đừng thêm đệm phía trên ảnh).
   - Cỡ tiêu đề: `text-h1` dưới `md` và ở `lg`, `text-display` ở `md` và từ `xl`. Đã đo "MINIMALIST" (từ dài nhất) không tràn cột chữ ở 360, 375, 768, 1024, 1100, 1200, 1280, 1366, 1440, 1536 (rộng 438px so với cột 507px ở `xl`).
2. **Danh mục nổi bật** (`category-showcase`, `category-card`): đầu khối (nhãn, `text-h1` hoa, "Xem tất cả sản phẩm →"), 4 thẻ dọc 3:4 (2 cột di động, 4 cột từ `md`): ảnh nền, gradient `scrim` ở đáy, tên ở góc dưới trái, mũi tên góc dưới phải; hover phóng ảnh 1,03 và mũi tên dịch phải. Thẻ chỉ hiện khi danh mục có trong cây; đang tải thì skeleton; cây lỗi hoặc không thẻ nào khớp thì ẩn cả khối.
3. **Best sellers (TẠM)** (`features/catalog/components/home/home-best-sellers.tsx`): 4 thẻ `ProductCard` (`ProductGrid layout="four-up"`: 2 cột di động, 4 cột từ `md`). Nguồn là hook DUY NHẤT `useBestSellerProducts` (`createdAt` tăng dần, `limit=4`), có comment "TẠM: thay bằng dữ liệu bán chạy khi có đơn hàng". Rỗng thì ẩn khối; lỗi có "Thử lại".
4. **Câu chuyện thương hiệu** (`brand-story`): THẺ `dark` + `surface-sunken` bo `panel`, rộng hơn khung nội dung `--story-bleed` (32px) mỗi bên từ `lg` (đã đo 32px từ 1312px; ở 1024–1312px mức lòi co về 16px để thẻ luôn cách mép màn ≥ 8px; dưới `lg` theo container), ảnh nền tĩnh + `scrim/70`, nhãn và tiêu đề serif nghiêng (Newsreader, mục 3), mô tả `ink`, nút sáng `lg` (đảo màu khi hover). Chưa có ảnh thì chỉ còn nền tối (không chữ cái giữ chỗ).
5. **Sản phẩm mới về** (`home-new-arrivals`, `components/storefront/tab-bar.tsx`, `hscroll-list.tsx`): tiêu đề trái, 3 tab phải (`tablist`/`tab`/`tabpanel`; ←/→ chuyển và kích hoạt ngay, Home/End; dạng viên thuốc; tab đang chọn là nút đặc, tab thường nút viền `border-control` và đảo thành nút đặc khi hover); tab "Áo mới"/"Quần mới" chỉ hiện khi danh mục `ao`/`quan` tồn tại, còn mỗi "Tất cả" thì ẩn cả thanh tab. Mỗi tab gọi `GET /products` (`createdAt` giảm dần, `limit=8`, tab danh mục kèm `categoryId`); đổi tab giữ danh sách cũ mờ đi (`keepPreviousData`, `aria-busy`), tab đã xem lấy từ cache. Danh sách CUỘN NGANG (`region` có `aria-label`, `tabIndex=0`, `scroll-snap`, thẻ rộng cố định `w-44/md:w-56/lg:w-64` để luôn thấy một phần thẻ kế tiếp, thanh cuộn mảnh bo tròn: tiện ích `scrollbar-soft` dùng `::-webkit-scrollbar` cho Chrome/Safari/Edge và `scrollbar-width` chuẩn cho Firefox; đừng dùng `scrollbar-thin` của Tailwind vì nó làm Chrome bỏ qua pseudo-element). Skeleton đúng tỉ lệ; rỗng và lỗi có trạng thái riêng ngay trong khối.
6. **Dải cam kết** (`assurance-strip`, `assurance-item`): THẺ bo `panel` nền `surface-sunken/50` trong khung nội dung, 4 ô biểu tượng (`lucide-react`) canh trái + tiêu đề + mô tả (4 cột từ `lg`, 2×2 ở `md`, 1 cột ở di động). Đứng giữa "Sản phẩm mới về" và chân trang, không thuộc chân trang. Nội dung là cam kết mẫu chờ xác nhận (mục 13).

**Request khi tải trang chủ** (đã đo): đúng 3 lần GET, không trùng: `/products?sortBy=createdAt&order=asc&limit=4` (best sellers), `/products?sortBy=createdAt&order=desc&limit=8` (tab "Tất cả"), `/categories` (chung cache với header). Hero không gọi API. Đổi sang tab danh mục thì thêm một request cho tab đó; quay lại tab đã xem không gọi lại.

Không làm: carousel tự chạy, chữ giữ chỗ của mẫu. (Chấm màu và ảnh thứ hai khi rê chuột đã làm, xem mục 16.) Trên thẻ của Best sellers, Sản phẩm mới về và Tất cả sản phẩm (`/products`) nút trái tim chỉ là GIAO DIỆN GIẢ (mục 13, 16), còn "Thêm nhanh" đã chạy thật (mục 19); khối "Có thể bạn cũng thích" ở trang chi tiết cũng bật `quickActions`.

## 15. Thanh thông báo chạy chữ

`AnnouncementBar` (`components/storefront/announcement-bar.tsx`, `announcement-message-set.tsx`), dựng trong `StorefrontLayout` NGAY TRÊN header, hiện ở mọi trang storefront. Nội dung từ `STORE.announcements` (mẫu: "MIỄN PHÍ VẬN CHUYỂN CHO ĐƠN HÀNG TỪ 500.000₫",
"ĐỔI TRẢ TRONG 30 NGÀY"; xem bảng cam kết ở mục 13).

- Cao `--announcement-h` (40px), `text-overline` hoa, **không dính**: cuộn là trượt đi, header dính như cũ. Nền tối cố định nhờ phạm vi `dark` (mục 2), viền dưới `border-strong`.
- Hai thông điệp liền nhau ngăn bằng nét "|" mảnh, giữa các lần lặp vòng là một chấm tròn nhỏ; cả hai chỉ để trang trí nên `aria-hidden`.
- Chạy bằng CSS: dải gồm hai nửa giống hệt nhau (mỗi nửa 5 lượt thông điệp, phủ được màn 2560px), `animate-marquee` dịch đúng `-50%` rồi lặp nên không thấy điểm nối. Không thư viện.
- Rê chuột (thiết bị có hover) hoặc focus bàn phím vào thanh thì dừng (`animation-play-state: paused`). Vùng là `role="region"` có `aria-label` tiếng Việt và `tabIndex={0}` để người dùng bàn phím dừng được; vòng focus là vòng chung của `global.css` lùi vào trong
  (`focus-visible:-outline-offset-2`) vì ở mép trang vòng ngoài bị `overflow-hidden` cắt.
- Giảm chuyển động: KHÔNG chạy (`motion-reduce:animate-none`, không dựa vào quy tắc 0.01ms chung vì nó sẽ nhảy tới cuối keyframe), chỉ hiện thông điệp đầu, căn giữa, xuống hai dòng nếu màn hình hẹp (≤ 2 dòng vừa trong 40px).
- Trình đọc màn hình chỉ đọc lượt đầu tiên; 9 lượt lặp `aria-hidden`.
- **Mốc cuộn của header**: phần tử mốc (`storefront-header.tsx`) đặt ở `top-announcement` (ngay dưới thanh) thay vì `top-0`, nên trạng thái "đã cuộn" (nền mờ + viền) không bật lúc header chưa dính. Vẫn giữ độ trễ 8px như cũ (mốc cao 8px): bật khi cuộn quá `--announcement-h` + 8px.
  Đã đo ở 1280px: cuộn 0 đến 39px header chưa dính và chưa "đã cuộn"; từ 41px header dính ở `top: 0`; từ 60px trạng thái "đã cuộn" bật.
  Nếu `STORE.announcements` rỗng thì thanh không dựng, mốc sẽ lệch 40px (chỉ muộn hơn, không hỏng) — muốn bỏ hẳn thanh thì cũng đưa `top-announcement` về `top-0`.

## 16. Thẻ sản phẩm

`ProductCard` (`features/catalog/components/product-card.tsx`, dùng chung trang danh sách, "Có thể bạn cũng thích" và trang chủ). Ảnh 3:4, tên tối đa 2 dòng, giá; cả thẻ là một liên kết (prefetch khi rê chuột/focus, ảnh dự phòng, skeleton, phóng ảnh 1,03 khi rê chuột giữ nguyên).

- **Ảnh** bo `card` (18px). **Huy hiệu tồn kho** (`product-stock-badge.tsx`) góc trên trái, cách mép 12px, dạng viên thuốc, chữ `text-overline` hoa, nền kính mờ (`bg-canvas/80` + `backdrop-blur-sm`), viền `border-default`. Chỉ MỘT huy hiệu: `inStock = false` → "Hết hàng" (ưu tiên); `lowStock = true` → "Sắp hết" kèm chấm 8px `warning-dot` (hổ phách, token riêng cho chấm này).
  Đã đo trên ảnh nền trắng và nền đen thuần: chữ huy hiệu ≥ 8,8:1.
  **Màu chấm**: token `warning-dot` (`#e0a21b`, lấy từ thiết kế mẫu home-v2) CHỈ dùng cho chấm trang trí này; huy hiệu đã có chữ "Sắp hết" nên chấm không cần tương phản chữ. Không dùng `warning-dot` cho chữ hay nền (các token `warning-fg/-tint/-border` đo ở phiên trước đều không đủ vàng).
- **Hết hàng**: ảnh `opacity-60`, tên `ink-muted` (6,06:1), giá giữ `ink-muted`. Truyền đạt bằng chữ của huy hiệu, không chỉ bằng màu.
- `lowStock` chỉ có ở `GET /products` (danh sách); `GET /products/:slug` không có nên `CatalogProductDetail` là `Omit<CatalogProductListItem, "lowStock">`. Backend: `lowStock` phụ thuộc `minStock` do kho đặt, `minStock` mặc định 0 nên chưa đặt ngưỡng thì không bao giờ hiện "Sắp hết".
- **Hai nút trên ảnh** (`quickActions`, mặc định TẮT; chỉ khối Best sellers, mọi tab Sản phẩm mới về, danh sách `/products` (`CatalogResults`) và "Có thể bạn cũng thích" ở trang chi tiết bật; các nơi khác giữ nguyên DOM; ở `/products` nút vẫn bấm được khi lưới đang mờ do đổi bộ lọc/sắp xếp): trái tim tròn ở góc trên phải và "Thêm nhanh" dạng viên thuốc ở đáy ảnh, nền kính mờ `canvas/80`, hover đảo màu như nút `secondary` khác. Trái tim: chỉ toast "chưa có tính năng" (mục 13), không đổi trạng thái. "Thêm nhanh": thật, xem mục 19. Hai nút nằm NGOÀI thẻ `<a>` (trong `div.group/card` bọc ngoài; lớp phủ `pointer-events-none` cùng tỉ lệ ảnh `PRODUCT_IMAGE_ASPECT`) nên bấm không điều hướng. Thiết bị có hover: ẩn, hiện khi rê chuột/focus vào thẻ hoặc nút (mờ dần + trượt nhẹ, trượt chỉ khi không giảm chuyển động); `hover: none`: luôn hiện (ẩn bằng `[@media(hover:hover)]`). Vòng focus hai lớp (`ring-2 ring-ink` + outline `canvas`) để thấy trên ảnh sáng lẫn tối. Hover bất kỳ chỗ nào của thẻ (kể cả hai nút) giữ ảnh phóng 1,03. Thẻ hẹp (< 16rem, container query): trái tim và pill nhỏ lại (36px, `text-overline`), vùng bấm vẫn 44px nhờ `before:`, huy hiệu tồn kho dời xuống dưới hàng trái tim để không đè nhau. Hết hàng thì không có "Thêm nhanh".
- **Chấm màu** (`product-card-colors.tsx`): bên phải giá, chấm tròn 14px, tối đa 3 chấm rồi "+N" (N = số màu còn lại, ví dụ "+1"; hằng số `MAX_COLOR_DOTS`). Màu `hex = null` bị bỏ qua. Mọi chấm có viền mảnh `border-ink/15`. Chỉ trang trí (không bấm được, `aria-hidden`), kèm chữ `sr-only` "Màu: …" liệt kê tên màu. Giá `shrink-0`; chấm tự xuống dòng khi thẻ quá hẹp nên giá không bị đẩy xuống (thẻ 155px ở 375px).
- **Ảnh thứ hai khi rê chuột** (`secondImageUrl`, `components/storefront/product-hover-image.tsx`): CHỈ trên thiết bị có hover (cảm ứng không đổi ảnh). Vùng `group/card` bật `armed` ở lần rê chuột/focus đầu tiên (kiểm `matchMedia("(hover: hover)")`) rồi mới dựng `<img>` thứ hai, nên lưới không tải ảnh thừa. Ảnh chồng lên ảnh đầu trong cùng khung 3:4 (không giật bố cục), `opacity-0` cho tới khi TẢI XONG (`onLoad`) và đang hover/focus thì chuyển mờ (`motion-safe`); chờ tải thì vẫn thấy ảnh đầu, tải lỗi thì bỏ qua. Ảnh này trang trí: `alt=""`, `aria-hidden`. Có ảnh thứ hai thì thay hiệu ứng phóng; `secondImageUrl` null thì giữ phóng 1,03. Hai nút trái tim/Thêm nhanh nằm trên lớp ảnh nên không bị che.
- Chưa làm (xem mục "việc hoãn"): trạng thái tim thật. "Thêm nhanh" đã làm (mục 19).

## 17. Chân trang, trang thông tin, nhận tin

**Chân trang** (`storefront-footer.tsx` + `footer-brand`, `footer-link-column`, `footer-bottom-bar`): phạm vi `dark` như thanh thông báo, viền trên `border-strong`. Dưới 768px một cột; từ 768px 2×2; từ 1024px bốn cột tỉ lệ 5:4:4:5.
1. Tên + mô tả (`STORE.footer.description`) + "Thông tin liên hệ đang được cập nhật" (`text-caption`).
2. ĐƯỜNG DẪN NHANH: "Trang chủ" (`STORE.footer.quickLinksLead`) rồi `resolveNavItems(STORE.navItems, tree)` — cùng nguồn với header nên mục danh mục chỉ hiện khi danh mục tồn tại (do `routes/storefront-layout-container.tsx` tính rồi truyền xuống).
3. CHÍNH SÁCH KHÁCH HÀNG: 4 trang từ `STORE.footer.policySlugs`, nhãn lấy từ tiêu đề trang (`lib/info-pages.ts`).
4. ĐĂNG KÝ NHẬN TIN: chữ từ `STORE.newsletter`; form do container truyền qua slot `newsletter` (components/ không import features/).
Dòng cuối: "Bản quyền © {năm hiện tại} MONO STUDIO." và "Điều khoản", "Bảo mật" (`STORE.footer.legalLinks`; "Bảo mật" và "Chính sách bảo mật" cùng trỏ trang `bao-mat`). Mọi liên kết cao ≥ 44px. Không có liên kết chết: nhãn chính sách nhận slug đã khai báo (`InfoPageSlug`).

**Trang thông tin tạm** `/thong-tin/:slug` (`pages/storefront/info`, `lib/info-pages.ts`): `doi-tra`, `van-chuyen`, `huong-dan-chon-size`, `bao-mat`, `dieu-khoan`. Một `h1` viết hoa, `useDocumentTitle`; chưa có `paragraphs` thì `StateMessage` "Nội dung đang được cập nhật" (không bịa chính sách);
slug lạ thì 404 TRONG khung storefront (`NotFoundContent` dùng chung với trang 404). Muốn thêm nội dung chỉ cần điền `paragraphs`.

**Form nhận tin** (`features/newsletter`): CHỈ GIAO DIỆN, backend chưa có. React Hook Form + zod: email rỗng, sai định dạng, quá 191 ký tự (`EMAIL_MAX_LENGTH`), lỗi hiện dưới ô (`aria-invalid`, `aria-describedby`); nhãn ô nhập `sr-only`; vùng `aria-live="polite"` luôn có mặt.
Từ `xl` (1280px) ô nhập và nút "ĐĂNG KÝ" cùng một hàng (đã đo ở 1280 và 1536: ô nhập 190px ≥ 170px, nút 107px, chữ không xuống dòng), dưới `xl` xếp dọc. Email hợp lệ thì gọi MỘT hàm `subscribeNewsletter` (`features/newsletter/api.ts`, async, TẠM: không gọi mạng, trả
`{ status: "unavailable", message }`); giao diện hiện `message` bằng `info-fg`, KHÔNG giả vờ thành công, KHÔNG xóa ô nhập; sửa email thì thông báo cũ mất. Khi có backend chỉ đổi thân hàm đó (thêm trạng thái đang gửi và xử lý lỗi ở nhánh thật) và xóa `NEWSLETTER_UNAVAILABLE_MESSAGE`.

## 18. Việc hoãn

- **ESLint `jsx-a11y`**: dự án chưa cài plugin (`eslint.config.js` không có), nên lỗi truy cập như mất vòng focus (từng gặp ở thanh thông báo: `outline-none` làm vòng focus không hiện), thiếu nhãn hay `tabIndex` trên phần tử không tương tác không bị bắt tự động. Cần thêm plugin và cấu hình quy tắc (kèm xử lý các cảnh báo có sẵn); hiện chỉ kiểm bằng tay (mục 11).
- **Nút dừng thanh thông báo cho cảm ứng** (WCAG 2.2.2): hiện chỉ dừng được bằng rê chuột và focus bàn phím; người dùng cảm ứng chưa dừng được (đã có tắt hẳn khi giảm chuyển động).
- **Thẻ sản phẩm**: nút tim mới là giao diện giả (mục 13); "Thêm nhanh" đã thật (mục 19). Cả hai bật ở Best sellers, Sản phẩm mới về, `/products` và "Có thể bạn cũng thích".
- **Nhận tin thật**: endpoint `POST /newsletter/subscribers`, lưu email, cấp ưu đãi 10% (xem bảng cam kết ở mục 13).
- **Font serif ở màn hình đầu**: đã preload hai tệp woff2 trong `index.html` nhưng CHƯA đo CLS và thời điểm hiện hero trên mạng chậm trước/sau (hướng đã duyệt: hero chậm hơn rõ rệt thì chỉ preload tệp latin hoặc bỏ); chưa làm `@font-face` dự phòng có `size-adjust` vì không đo được Georgia trên máy dev Linux.
- **Nội dung trang chính sách** (đổi trả, vận chuyển, chọn size, bảo mật, điều khoản): chủ cửa hàng viết, rồi điền `paragraphs` ở `lib/info-pages.ts`.
- **Vòng focus ở khu admin**: mẫu `outline-none focus-visible:outline-2 ...` (làm vòng focus không hiện, xem mục 11) còn nằm ở admin (`admin-sidebar`, các tiêu đề sắp xếp bảng, `inventory-*`, `product-*`, `users-table`, `dashboard/*`, `ui/checkbox`, `ui/badge`, `ui/toast`, `styleguide`). Ngoài phạm vi storefront nên chưa sửa; cách sửa là bỏ `outline-none` ở từng chỗ.
- **`header-nav.tsx` dài 165 dòng** (quy ước ~150) và `lib/api-client.ts` 214 dòng: chưa tách (header giữ nguyên).
- **Best sellers và các cam kết ở dải cam kết** đang là nội dung mẫu/dữ liệu tạm: xem bảng mục 13.

## 19. Giỏ hàng

Dữ liệu: `features/cart` (types, api, queries) theo `docs/api/cart.md` của backend. Chỉ CUSTOMER; giỏ Guest và gộp giỏ để V2. Không thêm món đang chờ sau khi đăng nhập: khách bấm giỏ/"Thêm vào giỏ" chỉ được đưa sang `/login` rồi quay lại đúng trang cũ.

**Dữ liệu và cache** (`queries.ts`): query key `["cart"]`, `staleTime` 45s, `retry: false`. `useCart({ enabled })` do nơi gọi truyền `enabled` (feature không đọc phiên). Header (qua `StorefrontLayoutContainer`) gọi một lần khi vào storefront để có số huy hiệu, chuyển trang dùng cache. Mở ngăn kéo hoặc vào `/gio-hang` thì làm mới nền (`invalidateQueries`): đã có cache thì hiện luôn, không khung chờ; chỉ khi chưa có dữ liệu mà lỗi mới hiện "Thử lại" (huy hiệu lỗi thì chỉ ẩn, không toast). Mỗi mutation ghi giỏ trả về vào cache (`setQueryData`); lỗi hiện toast đúng message của backend rồi làm mới giỏ. Đăng nhập/đăng xuất đã `queryClient.clear()` nên cache giỏ không lọt sang phiên khác. Không optimistic; nút và ô số lượng khóa khi đang gửi.

**Cầu nối** (`components/storefront/cart-ui-context.ts`): `StorefrontLayoutContainer` là nơi duy nhất biết cả `features/cart` lẫn `features/catalog`; nó cung cấp `requireLogin`, `addToCart` (qua cổng đăng nhập, thành công thì MỞ ngăn kéo và trả `true`) và `adding` qua context. Trang chi tiết và thẻ sản phẩm dùng `useCartUi()`.

**Giới hạn số lượng**: `MAX_QUANTITY_PER_ITEM` = 10 ở `lib/cart-rules.ts` (backend là nguồn sự thật, giao diện chỉ chặn sớm) cho ô số lượng ở trang chi tiết và hộp thoại thêm nhanh. Trong giỏ, mỗi dòng dùng `maxQuantity` của API.

**Ngăn kéo** (`cart-drawer*.tsx`, dựng trên `StorefrontDrawer`): trượt từ phải, rộng tối đa 27rem (đo từ ảnh mẫu `docs/design/pages/gio-hang-ngan-keo.png`: 431px), bo trái 28px từ `sm`; dưới `sm` toàn chiều rộng. Portal nằm ngoài `<main>` nên gắn `soft-ui` lên chính panel (bo, hover đảo màu). Đầu cố định: "Giỏ hàng của bạn (N)" + nút đóng tròn 44px; dải miễn phí vận chuyển; danh sách cuộn (`scrollbar-soft`); chân cố định: "Tạm tính", chú thích "Phí vận chuyển được tính ở bước thanh toán." (chưa có voucher nên không nhắc mã giảm giá), "Xem giỏ hàng chi tiết" (viền, `/gio-hang`) và "Thanh toán ngay" (STUB, mục 13). Trạng thái: khung chờ, lỗi + "Thử lại", rỗng + "Tiếp tục mua sắm" (đóng ngăn kéo). Esc/bấm nền đóng, focus bị giữ trong ngăn kéo, `aria-labelledby` tới tiêu đề, vùng `aria-live` đọc thông báo xóa dòng. Tự đóng khi đổi trang (`useOpenUntilNavigation`); trả focus về phần tử đã mở (nút giỏ ở header, hoặc nút "Thêm vào giỏ" / "Thêm nhanh" vừa bấm).

**Dòng giỏ** (`cart-line.tsx`, dùng chung ngăn kéo `size="sm"` và trang `size="lg"`): ảnh 3:4, tên (liên kết), "Màu · Size", đơn giá, thành tiền bên phải, ô số lượng dạng pill (`QuantityStepper compact`: chỉ chữ, không ô nhập để khỏi gửi mỗi phím gõ), nút "Xóa" kèm icon (aria-label ghi tên sản phẩm). Dòng không mua được (`purchasable` sai hoặc hết hàng): ảnh mờ, nhãn chữ "Không còn bán"/"Hết hàng", chỉ xóa được, không vào tạm tính; có thông báo đầu danh sách khi `unavailableCount > 0`. `quantity > maxQuantity`: "Chỉ còn N". Chữ không giảm độ mờ cả dòng để vẫn đủ tương phản.

**Dải miễn phí vận chuyển** (`free-shipping-bar.tsx`): thanh `role="progressbar"` theo `subtotal` / `FREE_SHIPPING_THRESHOLD`; đủ mức thì đầy và ghi "Đơn hàng của bạn được miễn phí vận chuyển". Chuỗi thanh thông báo dựng từ cùng hằng số nhưng giữ đúng dạng cũ ("…TỪ 500.000₫"). Xem lưu ý ở mục 13.

**Huy hiệu** (`CartButton` trong header): số `itemCount`, ẩn khi 0 hoặc chưa biết (khách, ADMIN/STAFF, lỗi), "9+" khi lớn hơn 9, `aria-label` "Giỏ hàng, N sản phẩm".

**Trang `/gio-hang`** (`pages/storefront/cart`, `cart-page-content.tsx`): route bọc `RequireAuth`; ADMIN/STAFF vào thẳng chỉ thấy thông báo và không gọi API. Từ `lg` hai cột 8/4: trái danh sách dòng cỡ lớn, phải thẻ tóm tắt `surface-sunken/50` bo `panel` dính dưới header (số sản phẩm, tạm tính, dải miễn phí vận chuyển, "Thanh toán ngay" STUB, "Tiếp tục mua sắm"); dưới `lg` xếp dọc. "Xoá tất cả" có hộp thoại xác nhận riêng (`ClearCartConfirm`, dựng trên `StorefrontDialog`; không dùng `confirm-dialog` của admin).

**Thêm vào giỏ ở trang chi tiết**: `PurchasePanel` và thanh mua dính đáy gọi `addToCart`, khóa/hiện vòng quay khi `adding`, thành công mở ngăn kéo.

**Thêm nhanh** (`use-quick-add.ts`, `quick-add-dialog.tsx`): qua cổng đăng nhập (khách sang `/login` ngay, chưa tải gì), rồi tải chi tiết sản phẩm (cache nếu đã tải trước khi rê chuột/focus thẻ); nút hiện vòng quay và khóa trong lúc chờ, lỗi tải thì toast và nút mở lại để thử lại. Sản phẩm có ĐÚNG MỘT biến thể tổng cộng thì thêm thẳng 1 cái. Từ hai biến thể trở lên (kể cả khi chỉ một cái còn hàng) thì luôn mở hộp thoại "Chọn phân loại" (`StorefrontDialog`, gắn `soft-ui`): `VariantPicker inStockOnly` (giá trị hết hàng mờ, gạch chéo, không chọn được), chọn sẵn biến thể còn hàng đầu tiên (`defaultChoice`, cùng trang chi tiết), `QuantityStepper` tối đa 10, "Thêm vào giỏ". Thành công thì đóng hộp thoại (không trả focus về thẻ) và mở ngăn kéo. Trái tim vẫn là stub.

**Chuyển động của ngăn kéo và hộp thoại** (`StorefrontDrawer`, `StorefrontDialog`): chung một cơ chế cho mọi ngăn kéo (menu, bộ lọc, giỏ, tìm kiếm): `transition-transform` theo `data-starting-style`/`data-ending-style` của Base UI, mở dùng `data-open:duration-(--motion-drawer-in)`, đóng rơi về `--motion-drawer-out`; lớp nền chỉ chuyển opacity (không animate độ mờ). Chỉ transform/opacity/scale, không animate width/left/margin. Base UI giữ Popup trong DOM tới khi chuyển động đóng xong. Giảm chuyển động: `global.css` ép mọi transition về 0,01ms nên ngăn kéo và hộp thoại hiện/ẩn tức thì, không trượt. Khóa cuộn trang do Base UI xử lý bằng `scrollbar-gutter: stable` nên nội dung không dịch ngang khi thanh cuộn biến mất. Mở ngăn kéo ngay sau khi thêm vào giỏ: giỏ đã nằm trong cache (`setQueryData`) và `useRefreshCart` bỏ qua việc làm mới nếu giỏ vừa được ghi dưới 3 giây, nên nội dung không nháy khung chờ hay đổi giữa lúc trượt. Từ hộp thoại "Thêm nhanh" sang ngăn kéo: đóng hộp thoại trước, xong (`onOpenChangeComplete`) mới mở ngăn kéo, nên hai lớp nền không chồng nhau. Huy hiệu giỏ nảy nhẹ khi số đổi (`motion-safe:animate-badge-bump`, đặt lại `key` theo số).
