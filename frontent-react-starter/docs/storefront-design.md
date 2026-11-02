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
| Khung chung | `text-body-sm` (menu, liên kết chân trang) · `text-h3` (khung tìm kiếm, tiêu đề ngăn kéo) |

`text-display` dành cho trang chủ. Nhãn `overline` chỉ ở chỗ phụ (tên nhóm lọc, nhãn nhóm chip), không đặt trên mọi tiêu đề.
Tiêu đề trang viết hoa (cùng kiểu hero và đăng nhập); tên sản phẩm viết thường như dữ liệu. Mỗi trang đúng một `h1`.

## 4. Khoảng cách và lưới

- Nền 8px. Container `max-w-7xl` (1280px), lề `px-gutter` (24px).
- Khoảng cách giữa các khối lớn: token `--sp-block` (`pb-block`, `mt-block`, `py-block`): **56px di động, 96px từ `lg`**. `--sp-section` (80px) không đổi
  vì trang đăng nhập và trang chủ cũ đang dùng.
- Chiều cao header: `--header-h` (64px, 80px từ `md`) → `h-header`, `scroll-mt-header` (đích "bỏ qua tới nội dung" và đầu danh sách không bị header dính che).
- Lưới sản phẩm (`ProductGrid`): **2 cột** (di động), **3 cột** từ `md` (768px), **4 cột** từ `xl` (1280px) khi có cột lọc bên trái (`layout="beside-filters"`);
  nơi không có cột lọc (khối liên quan, trang chủ) dùng `layout="full"`: 4 cột từ `lg`. Khoảng cách `gap-x-4 md:gap-x-6`, `gap-y-10 lg:gap-y-12`.
- Cột lọc 15rem, sticky dưới header, từ `lg`. Chi tiết: 6/6 từ `md`, **7/5 từ `lg`** (ảnh lớn hơn thông tin).

## 5. Hình khối

Ảnh không bo góc (cảm giác biên tập). Nút, chip biến thể, ô nhập theo `radius-control` (2px); chip bộ lọc đang áp dụng dạng pill (`rounded-4xl`
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
- **`Reveal`** (hiện dần khi cuộn): một lần duy nhất, chỉ cho khối nằm dưới màn hình đầu (hiện chỉ "Sản phẩm cùng danh mục"); khối đã trong màn hình lúc dựng thì
  hiện luôn; tải lại dữ liệu bên trong không chạy lại. **Không** dùng ở footer, danh sách, nội dung màn hình đầu.
- Giảm chuyển động (`prefers-reduced-motion`): `global.css` đã đưa mọi animation/transition về gần 0; riêng phần transform dùng `motion-safe:`.
- Cấm: parallax, carousel tự chạy, hiệu ứng nặng.

## 7. Ảnh

- Khung `aspect-[3/4]` cố định (`ProductImage`) nên không giật bố cục. Trong lúc tải: skeleton shimmer cùng tỉ lệ; xong thì mờ dần vào (500ms).
- Thiếu hoặc lỗi ảnh: chữ cái đầu thương hiệu ("M") trên `surface-sunken`. `alt` luôn là tên sản phẩm.
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

## 9b. Menu danh mục ở header (từ `lg`)

Thanh điều hướng chỉ có **một mục** "Tất cả sản phẩm": chữ là liên kết thật tới `/products`, kèm **nút mũi tên riêng** (`aria-expanded`, `aria-controls`). Không có
liên kết danh mục nằm ngang. Dưới `lg` vẫn là ngăn kéo menu (mục 9). Bảng thả xuống (`HeaderNavPanel`):

- Dòng đầu "Xem tất cả sản phẩm" → `/products`; sau đó toàn bộ cây danh mục theo chiều dọc, danh mục con ngay dưới cha, thụt vào, chữ nhỏ hơn (`text-caption`), cùng hiện một lúc
  (không có menu con bay sang bên cạnh). Mục đang xem: `aria-current="page"` + chữ đậm + gạch chân (không chỉ màu). Mỗi dòng cao ≥ 44px; hover/focus đổi sang `ink` + gạch chân.
- Hình thức: nền `canvas` đặc, viền `border-subtle` 1px, `rounded-md` (= `radius-surface`), không đổ bóng, rộng 256px (`w-64`), canh trái theo mục, sát dưới header; cao tối đa
  `100dvh - header - 2rem` rồi cuộn bên trong. Hiện bằng mờ dần + trượt xuống nhẹ (`--motion-base`), tắt khi giảm chuyển động.
- Hành vi: chuột (`pointerType` mouse) mở sau 100ms, đóng sau 150ms khi rời. Bảng là **con** của vùng hover cao bằng header nên rê chéo từ nút xuống bảng không có khe hở. Cảm ứng không có hover nên mở
  bằng chạm vào mũi tên. Bàn phím: Enter/Space trên mũi tên bật/tắt; ↓ từ mũi tên mở và vào dòng đầu; ↑/↓/Home/End di chuyển (↑ ở dòng đầu về mũi tên); Esc đóng và trả focus về mũi tên; Tab ra khỏi
  menu thì đóng. Đóng khi chọn liên kết (kể cả chỉ đổi `?category=`), khi pathname đổi (`useOpenUntilNavigation`), khi bấm ra ngoài.
- Cây danh mục đang tải hoặc lỗi: chỉ còn liên kết "Tất cả sản phẩm", không mũi tên, không bảng.
- Tự dựng (state + hẹn giờ) thay vì Base UI NavigationMenu/Popover: cả hai coi trigger là một nút, không hợp với "chữ là liên kết + mũi tên là nút riêng"; hover-open của Popover chỉ gắn vào trigger và popup ở Portal nên dễ có khe hở khi rê chéo.

## 10. Trạng thái bắt buộc

Loading (skeleton cùng tỉ lệ, chỉ lần tải đầu; đổi bộ lọc/trang giữ lưới cũ mờ `opacity-60` + `aria-busy`), rỗng (danh mục chưa có sản phẩm; không khớp bộ lọc có
"Xóa bộ lọc"; chưa có sản phẩm nào), lỗi có "Thử lại", trang vượt tổng ("Về trang 1"), 404 danh mục (không gọi API sản phẩm), 404 sản phẩm, hết hàng,
biến thể không có tổ hợp. Dùng `StateMessage` (`EmptyState` bỏ khung nét đứt): luôn nói chuyện gì xảy ra và làm gì tiếp.

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

`src/lib/store-info.ts` là nơi duy nhất cho tên, khẩu hiệu, mô tả, liên hệ. Khẩu hiệu và mô tả là **nội dung mẫu**; liên hệ chưa có (footer ghi
"Thông tin liên hệ đang được cập nhật"). Không bịa cam kết kinh doanh (miễn phí vận chuyển, đổi trả...). Giọng ngắn gọn, tự tin, tiếng Việt.

## 14. Khi làm trang chủ

Dùng lại: `ProductGrid layout="full"` + `ProductCard` (`features/catalog`), hook `useCatalogProducts({ sortBy: "createdAt", order: "desc", limit: 8 })`,
`Reveal` cho các khối dưới màn hình đầu, `StateMessage`, `text-display` cho tiêu đề hero, `--sp-block` giữa các khối. Trang chủ cần `useDocumentTitle(STORE.name)`
và `eagerCount` hợp lý (lưới dưới hero nên truyền 0).
