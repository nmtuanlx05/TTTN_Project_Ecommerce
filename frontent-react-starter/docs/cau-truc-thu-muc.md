# Cấu trúc thư mục frontend

Quy ước này là luật. Code mới phải theo. Muốn đổi thì sửa file này trước.

## 1. Hai giao diện
- Storefront (khách hàng, CUSTOMER) ở `/`.
- Admin (ADMIN và STAFF dùng chung) ở `/admin`, ẩn menu và nút theo role.
- Không làm trang staff riêng.

## 2. Cây thư mục
✓ là đã có. Phần còn lại tạo khi làm đến. Không tạo thư mục rỗng.

````
src/
├─ main.tsx, App.tsx, global.css, vite-env.d.ts   ✓
├─ routes/        ✓ admin-routes, auth-routes, storefront-routes, admin-layout-container,
│                 storefront-layout-container, admin-pages ✓ (các trang admin nạp bằng React.lazy), admin-index-redirect, can-access-path, guards/ (require-auth, require-role,
│                 redirect-if-authenticated), account-layout-container ✓ (layout /tai-khoan), use-avatar-saved ✓ (cập nhật phiên + cache sau khi đổi ảnh đại diện)
├─ pages/         MỎNG: chỉ ghép
│   ├─ auth/        login ✓, register ✓
│   ├─ admin/       dashboard ✓, users ✓, categories ✓, products ✓ (index, new, edit; form có danh sách nhiều ảnh `product-images-field` + vùng kéo-thả file `product-image-dropzone` (dùng `use-file-drop` chung) + hàng đợi tải `use-multi-image-upload`, mã màu hex của biến thể `variant-color-hex-field`), orders ✓ (index, detail/:id),
│   │               inventory ✓, vouchers, placeholder ✓
│   ├─ styleguide/  ✓ trang nội bộ cho dev (route /styleguide: index + color-data — dữ liệu bảng màu), không thuộc admin
│   ├─ forbidden.tsx ✓ (403), not-found.tsx ✓ (404)
│   ├─ storefront/  home ✓ (hero carousel, danh mục nổi bật, best sellers, câu chuyện, sản phẩm mới về, dải cam kết), catalog ✓ (/products), product-detail ✓ (/products/:slug), stores ✓ (/dia-chi), not-found ✓ (404 trong khung khách),
│   │               cart ✓, checkout ✓, order-success ✓, my-orders ✓ (/tai-khoan/don-hang), my-order-detail ✓ (/tai-khoan/don-hang/:code)
├─ features/      mỗi thực thể một thư mục theo khuôn mục 3
│   ├─ auth/ ✓ dashboard/ users/ ✓ categories/ ✓ products/ ✓ inventory/ ✓ catalog/ ✓ (dữ liệu công khai của storefront: danh sách và chi tiết sản phẩm)
│   │  newsletter/ ✓ (form đăng ký nhận tin ở chân trang — mới có giao diện, chưa có backend)
│   ├─ cart/ ✓ (giỏ hàng của CUSTOMER: types, api, queries (useCart, useAddToCart, useUpdateCartItem, useRemoveCartItem, useClearCart); components/: cart-drawer (+ header, footer, states), cart-line (+ cart-line-list), free-shipping-bar, checkout-button (STUB), cart-page-content (+ cart-summary, clear-cart-confirm))
│   ├─ admin-orders/ ✓ (đơn hàng phía admin: danh sách + lọc trên URL, chi tiết, đổi trạng thái qua hộp xác nhận, huy hiệu đơn chờ xác nhận ở sidebar; không import `features/orders`)
│   ├─ orders/ ✓ (đơn của khách: danh sách + lọc trên URL, tóm tắt, chi tiết + mốc thời gian, hủy, mua lại; constants.ts có Record<OrderStatus, ...>; `OrderStatusPill` riêng cho storefront)
│   └─ checkout/ ✓ vouchers/ payments/ account/
├─ components/
│   ├─ ui/          shadcn, KHÔNG sửa ✓ (ngoại lệ: được THÊM lớp `soft:` vào variant của button.tsx, một commit riêng)
│   ├─ admin/       khung admin và thứ dùng chung nhiều tính năng ✓ (admin-layout, admin-sidebar, admin-topbar, nav-items, page-header, table-pagination, search-input — ô tìm kiếm debounce, confirm-dialog; category-select ✓ — ô chọn danh mục dạng cây thụt lề, dùng ở products và inventory)
│   ├─ storefront/  ✓ khung khách và phần dựng sẵn dùng ở nhiều trang storefront: storefront-layout, storefront-header
│   │                 (+ header-session, header-account, header-nav (+ header-nav-link, header-nav-panel: bảng toàn chiều rộng, header-nav-styles — thanh điều hướng và mega menu từ `xl`),
│   │                 mobile-nav-drawer (+ mobile-nav-list, mobile-nav-accordion, mobile-nav-styles — ngăn kéo dưới `xl`), mobile-account, search-panel;
│   │                 nút giỏ hàng `CartButton` (kèm huy hiệu số lượng) là hàm nội bộ trong storefront-header; cart-ui-context.ts — cầu nối giỏ hàng cho trang/thẻ sản phẩm, quantity-stepper (props pill/compact/min/max/disabled), storefront-dialog — hộp thoại nhỏ ở giữa màn hình), storefront-footer, storefront-drawer (ngăn kéo/khung trượt dựng trên Base UI Dialog),
│   │                 (liên kết bỏ qua `SkipLink` là hàm nội bộ trong storefront-layout),
│   │                 account-shell + account-sidebar (khung hai cột của các trang /tai-khoan, thanh bên dính), breadcrumbs, pagination (số trang, dạng liên kết), product-image (khung 3:4, shimmer, fade, ảnh dự phòng),
│   │                 reveal (hiện dần khi cuộn), state-message (rỗng/lỗi/404), section-heading (nhãn + tiêu đề + mô tả + liên kết phụ; dùng qua home-section), page-container (khung nội dung `max-w-7xl` + gutter),
│                 static-image (ảnh tĩnh trong `public/` có khung trung tính khi thiếu/lỗi), hscroll-list (danh sách cuộn ngang có snap), tab-bar (tablist điều khiển bằng mũi tên),
│                 home/ (các khối trang chủ chỉ nhận props, không import features: home-hero + hero-slide + hero-controls + hero-progress, category-showcase + category-card, brand-story, assurance-strip + assurance-item, home-section — bộ khung chung của các khối có tiêu đề, hero-layout — bề rộng cột chữ của hero dùng chung với hero-slide), view-all-link (liên kết "Xem tất cả →"),
│   │                 store-list (+ store-entry) — danh sách cửa hàng của trang /dia-chi,
│   │                 announcement-bar (+ announcement-message-set — một lượt các thông điệp của dải chạy chữ; thanh thông báo chạy chữ phía trên header), footer-brand, footer-link-column, footer-bottom-bar (+ footer-link-styles — kiểu liên kết chung; các phần của storefront-footer),
│   │                 info-page-content (nội dung trang chính sách tạm), not-found-content (nội dung 404 dùng chung cho 404 và slug lạ của trang thông tin)
│   └─ shared/      ✓ chỉ khi cả admin và storefront (kể cả trang auth) cùng dùng: password-input, user-menu, brand-logo, route-fallback ✓ (vòng quay khi tải trang lazy), form-dialog (vỏ hộp thoại có form: dùng cả ở admin lẫn hộp
│                     thoại trong user-menu), image-upload-field (+ image-preview, image-upload-progress,
│                     image-upload-message) — ô upload một ảnh, dùng cho sản phẩm và ảnh đại diện; user-avatar (+ avatar-initials) — avatar tròn có chữ cái
│                     đầu khi chưa có ảnh; avatar-dialog (+ avatar-form) — hộp thoại đổi ảnh đại diện, mở từ user-menu; image-lightbox (+ -viewer,
│                     -toolbar) — xem ảnh lớn có thu phóng, bật qua `zoomable` của image-preview
├─ hooks/         hook dùng chung (use-mobile ✓, use-dialog-target ✓, use-category-options ✓ — danh mục cho ô chọn của
│                 categories và products, use-image-upload ✓ + use-file-drop ✓ — upload ảnh và kéo-thả cho image-upload-field, use-update-avatar ✓ — lưu ảnh đại diện (PATCH /users/me/avatar, hàm gọi API nằm ngay trong hook), use-pan-zoom ✓ +
│                 use-pan-zoom-gestures ✓ — thu phóng và kéo ảnh cho image-lightbox (debounce của ô tìm kiếm viết ngay trong `components/admin/search-input.tsx`, chưa có hook riêng),
│                 use-category-tree ✓ — cây danh mục công khai cho header/footer/catalog, use-carousel ✓ + use-swipe ✓ — carousel thủ công (không tự chạy) của hero trang chủ, use-image-load ✓ — trạng thái tải/lỗi của ảnh (dùng chung product-image và static-image), use-document-title ✓, use-in-view ✓ — IntersectionObserver,
│                 use-open-until-navigation ✓ — ngăn kéo menu/khung tìm kiếm tự đóng khi đổi pathname, use-mega-menu ✓ — trạng thái mở/đóng, hẹn giờ hover và bấm ra ngoài của bảng điều hướng ở header, use-scroll-restoration ✓ — cuộn lên đầu khi đổi trang
│                 và khôi phục vị trí khi Back/F5 của storefront)
├─ lib/           hạ tầng: api-client ✓, api-error ✓, query-client ✓, format ✓, utils ✓, date-range ✓, category-tree-options ✓ (danh mục phẳng → danh sách theo cây, thuần túy),
│                 form-errors ✓, password-rules ✓ (nguồn duy nhất độ dài mật khẩu), vn-phone ✓, display-name ✓ (tên hiển thị của tài khoản),
│                 image-rules ✓ (giới hạn và kiểm tra file ảnh theo kind), upload-image ✓ (POST /uploads/<kind>),
│                 pan-zoom ✓ (toán thu phóng và kéo ảnh, thuần túy), store-info ✓ (nội dung cửa hàng: tên, khẩu hiệu, liên hệ — MỘT file duy nhất),
│                 category-tree ✓ (danh mục phẳng → cây, tra slug, chuỗi cha; thuần túy),
│                 nav-items ✓ (cấu hình `STORE.navItems` + cây danh mục → mục điều hướng, dòng của bảng, mục đang xem; thuần túy),
│                 info-pages ✓ (cấu hình các trang chính sách tạm `{ slug, title, paragraphs? }`, tra theo slug, đường dẫn; thuần túy),
│                 home-content ✓ (nội dung trang chủ: slide hero, danh mục nổi bật, best sellers, câu chuyện, tab sản phẩm mới, cam kết; tách khỏi giao diện),
│                 home-links ✓ (đích liên kết `{ categorySlug }` + cây danh mục → URL, thuần túy),
│                 tab-ids ✓ (id DOM của tab và tabpanel, dùng chung `tab-bar` và nơi dựng tabpanel)
├─ types/         kiểu dùng chung (api.ts ✓, user.ts ✓ — Role và User, dùng ở auth, users, components/admin; category.ts ✓ — PublicCategory,
│                 dùng ở categories và products; upload.ts ✓ — ImageUploadKind)
└─ assets/        ảnh, font nội bộ
public/home/      ảnh tĩnh của trang chủ (hero, danh mục, câu chuyện); đường dẫn khai báo ở `lib/home-content.ts`, thiếu file thì hiện khung trung tính
````

### features/catalog (dữ liệu công khai của storefront)
````
features/catalog/
├─ api.ts  queries.ts  types.ts  constants.ts  home-constants.ts  (GET /products và /products/:slug; key `["catalog", ...]`; home-constants: số thẻ và bề rộng thẻ của các khối trang chủ)
├─ use-catalog-search-params.ts   (URL → bộ lọc: category slug, q, sort, minPrice, maxPrice, page; lọc whitelist)
├─ variant-options.ts   (logic thuần; nhãn khoảng giá `priceRangeLabel` nằm trong active-filter-chips)
└─ components/   danh sách: catalog-content (+ tiêu đề trang `CatalogHeading` là hàm nội bộ), catalog-results, catalog-states, catalog-filters, category-filter,
                 price-filter, filter-link, filter-drawer, sort-select, active-filter-chips, product-grid(+skeleton), product-card
                 chi tiết: product-detail-content (+skeleton, not-found), product-info-card (thẻ thông tin bên phải), product-gallery + gallery-thumbs (+ `gallery-images.ts`: images, dự phòng imageUrl), product-card-colors (chấm màu), product-card-quick-actions, purchase-panel, variant-picker,
                 option-chip-group (variant chip|swatch|pill), quick-add-dialog + use-quick-add ("Thêm nhanh" ở thẻ), sticky-buy-bar, related-products ("Có thể bạn cũng thích")
                 trang chủ (`components/home/`, có dữ liệu; dựng trên `home-section` của components/storefront/home): home-best-sellers (hook TẠM `useBestSellerProducts`), home-new-arrivals (3 tab + cuộn ngang), product-strip-skeleton; khối lỗi dùng lại `CatalogError` của catalog-states
                 thẻ sản phẩm: product-card + product-stock-badge (huy hiệu "Hết hàng" / "Sắp hết")
````

### features/newsletter (đăng ký nhận tin ở chân trang)
````
features/newsletter/
├─ api.ts   (MỘT hàm `subscribeNewsletter` — TẠM trả "chưa khả dụng", sau này thay bằng POST /newsletter/subscribers; câu thông báo tạm nằm cùng file)
├─ schemas.ts  use-newsletter-form.ts
└─ components/newsletter-form.tsx
````
Chân trang (`components/storefront/storefront-footer`) nhận form qua slot `newsletter`; `routes/storefront-layout-container.tsx` dựng `<NewsletterForm />`
rồi truyền xuống, vì components/ không import features/.
Cổng đăng nhập cho hành động mua nằm ở `features/auth/use-require-login.ts`; trang (`pages/`) và `routes/storefront-layout-container.tsx`
lấy hook rồi truyền xuống bằng props, vì features không import lẫn nhau. Riêng giỏ hàng: `routes/storefront-layout-container.tsx` cung cấp `CartUiContext` (cổng đăng nhập + thêm vào giỏ + mở ngăn kéo) cho trang chi tiết và thẻ sản phẩm (`useCartUi()`), cũng vì features/catalog không import features/cart.

## 3. Khuôn của một feature
````
features/<tên>/
├─ api.ts  queries.ts  types.ts  schemas.ts  constants.ts
├─ use-<tên>-search-params.ts      (nếu có bảng lọc/phân trang)
└─ components/                     dùng chung hai khu
    ├─ admin/                      chỉ khi có phía admin
    └─ storefront/                 chỉ khi có phía khách
````
Tính năng chỉ có một phía (users, dashboard, cart) để phẳng `components/`, chỉ chia khi phía còn lại cần.

## 4. Luật
1. Chiều phụ thuộc: pages → features → components → lib/hooks/types. Không đi ngược. ESLint kiểm tra.
2. features không import lẫn nhau. Thứ hai feature cùng cần thì đưa lên components/, hooks/, types/ hoặc lib/
   (ví dụ `PublicCategory` ở `types/category.ts` và `useCategoryOptions` ở `hooks/use-category-options.ts`, vì cả categories lẫn products cần chọn danh mục; `CategorySelect` ở `components/admin/category-select.tsx` và `buildCategoryTreeOptions` ở `lib/category-tree-options.ts` vì cả products lẫn inventory cần lọc theo danh mục).
3. pages/ chỉ ghép: không gọi API, không có logic nghiệp vụ, thường dưới 60 dòng.
4. Mỗi file một component, dưới khoảng 150 dòng.
5. Chỉ features/<tên>/api.ts và lib/api-client.ts được import axios.
6. Tên file kebab-case, hook bắt đầu bằng `use-`, component PascalCase.
7. Thứ riêng của một tính năng nằm trong features/<tên>/. Chỉ đưa lên components/admin hoặc components/shared khi từ hai nơi dùng.
8. Không dùng thư mục mơ hồ (utils/, common/, services/), không dùng barrel index.ts. Không sửa src/components/ui/.
   Các file shadcn chưa ai dùng (`avatar`, `card`, `dialog`, `separator`, `sidebar`) đã bị xóa khỏi `ui/`. Cần lại thì chạy `npx shadcn add <tên>` rồi chỉnh theo token của dự án (màu, cỡ chữ, bo góc, `cn` từ `@/lib/utils`); bản sinh sẵn dùng class của shadcn nên trái token.

## 5. File này đặt ở đâu?
| Đang viết | Đặt ở |
|---|---|
| Gọi API, hook react-query, kiểu dữ liệu của một thực thể | features/<thực thể>/ |
| Component chỉ phía admin | features/<tt>/components/admin/ |
| Component chỉ phía khách | features/<tt>/components/storefront/ |
| Component cả hai phía dùng, thuộc một thực thể | features/<tt>/components/ |
| Component dùng nhiều thực thể, chỉ trong admin | components/admin/ |
| Component dùng cả admin và storefront, không thuộc thực thể | components/shared/ |
| Ghép các phần thành một trang | pages/... |
| Hạ tầng (axios, format tiền, ngày) | lib/ |
| Nội dung cửa hàng (tên, khẩu hiệu, liên hệ) | lib/store-info.ts (không viết rải rác) |
| Nội dung trang chủ (chữ, liên kết, đường dẫn ảnh, `objectPosition`) | lib/home-content.ts |

## 6. Checklist module mới
1. Đọc ../backend-nestjst-starter/docs/api/<tên>.md (chỉ đọc, không sửa backend).
2. Tạo features/<tên>/ theo khuôn mục 3.
3. Tạo pages/admin/<tên>/index.tsx mỏng.
4. Thêm route, đặt `ready: true` và `roles` trong nav-items.ts.
5. Chạy tsc -b, lint, build; xem giao diện sáng và 5 vùng tối cố định (class `dark`).
6. Cập nhật mục "Trang hiện có" trong CLAUDE.md.

## 7. Bảng quyền (đã chốt)
Nguồn duy nhất là trường `roles` trong `components/admin/nav-items.ts`; menu ẩn mục và route
(`guarded()` trong `routes/admin-routes.tsx`) đều đọc từ đó. Đổi quyền thì sửa bảng này và `nav-items.ts`.

| Mục | ADMIN | STAFF |
|---|---|---|
| Dashboard, báo cáo doanh thu | Có | Không |
| Đơn hàng | Có | Có |
| Sản phẩm (xem, tạo, sửa, ẩn/hiện) | Có | Có |
| Danh mục | Có | Xem, sửa |
| Kho | Có | Có |
| Voucher | Có | Không |
| Người dùng | Có | Không |

"Xem, sửa" của Danh mục: cả hai role vào được trang; nút nào STAFF không được dùng (Thêm, Xóa) thì ẩn bằng
`useCurrentRole()` (`features/auth/`). Sản phẩm thì ADMIN và STAFF làm được mọi thao tác (không có xóa, "xóa" = ẩn) nên
không ẩn nút theo role. Backend vẫn là nơi chặn thật.

Thứ tự guard trong `/admin`: `RequireAuth` → `RequireRole` (ADMIN/STAFF, 403 toàn trang) → khung admin →
`RequireRole` theo mục (403 trong khung). Route lạ `*` nằm trong cùng cây nên guard chạy trước 404.

## 8. Thư mục xuất hiện khi nào
| Giai đoạn | Thư mục mới |
|---|---|
| Auth ✓ | features/auth/, routes/, pages/auth/ |
| Danh mục ✓, sản phẩm ✓ | features/categories/ ✓, features/products/ ✓ |
| Kho ✓ | features/inventory/ ✓ |
| Giỏ hàng ✓ | features/cart/, pages/storefront/cart, components/storefront/cart-ui-context.ts, lib/cart-rules.ts |
| Đơn hàng, voucher | features/orders/, vouchers/ |
| Storefront khung + catalog ✓ | components/storefront/, pages/storefront/catalog + product-detail, features/catalog/ |
| Storefront: thanh thông báo, thẻ sản phẩm mới, chân trang, trang thông tin ✓ | features/newsletter/, pages/storefront/info/ |
| Storefront: làm lại trang chủ ✓ | components/storefront/home/, features/catalog/components/home/, public/home/ |
| Storefront còn lại | features/checkout/, account/ |
| Thanh toán online | features/payments/ |
| Dashboard thật | features/dashboard/ nối API thật |

## 9. Việc tồn đọng
- Storefront dùng mật độ mặc định (không `.density-admin`), tông tối giản biên tập (Archivo cho logo/tiêu đề). Định hướng thiết kế chi tiết: `docs/storefront-design.md`.
- Backend Products đã tách `/admin/products` (thấy cả sản phẩm ẩn) và `/products` (khách, chỉ sản phẩm đang bán). Admin dùng `features/products`, khách dùng `features/catalog` (query key `["catalog", ...]`, tách khỏi `["products"]` của admin).
- Trang admin và `/styleguide` nạp bằng `React.lazy` (`routes/admin-routes.tsx`, `App.tsx`) để khách storefront không tải mã quản trị; `/login` và `/register` KHÔNG lazy vì nằm trên đường mua hàng.
- Ẩn hoặc chặn `/styleguide` ở bản production.
- `components/shared/` hiện chứa `password-input`, `user-menu`, `brand-logo`, `form-dialog` (dùng từ hai khu trở lên) và bộ `image-*` (ô upload ảnh). `form-dialog` trước đây nằm ở `components/admin/`; đã chuyển sang `shared/` vì hộp thoại trong `user-menu` (storefront cũng dùng) cần nó, và `shared/` không được phụ thuộc ngược vào `admin/`. `confirm-dialog` vẫn ở `components/admin/` (chỉ admin dùng).
- Upload ảnh là hạ tầng chung, không thuộc feature nào: `components/` không được import `features/`, nên hàm gọi API nằm ở `lib/upload-image.ts` (đi qua `apiUpload` của `api-client`, không import axios) và hook ở `hooks/`. Avatar dùng lại bằng `kind="avatars"`, `shape="circle"` (hộp thoại `avatar-dialog`); hàm lưu `lib/update-avatar.ts` và hook `hooks/use-update-avatar.ts` cũng ở tầng chung vì `shared/` không import `features/`. Phần cập nhật phiên và cache sau khi lưu nằm ở `routes/use-avatar-saved.ts`.

## 10. Bản chỉ đường storefront

Việc cần làm → file cần mở. Nội dung chữ không nằm trong component: chỉ sửa ở file cấu hình.

| Việc cần làm | Mở file |
|---|---|
| Sửa chữ trang chủ (slide hero, nhãn và tiêu đề các khối, câu chuyện, tab, đường dẫn ảnh, `objectPosition`) | `lib/home-content.ts` |
| Đổi ảnh trang chủ (hero, thẻ danh mục, dải câu chuyện) | thay file trong `public/home/`; đổi tên file thì sửa đường dẫn ở `lib/home-content.ts` |
| Đổi nội dung dải cam kết (chữ) / biểu tượng | chữ: `lib/home-content.ts` (`assurances`); biểu tượng: `components/storefront/home/assurance-item.tsx` |
| Đổi hero: bố cục slide / nút điều khiển / thanh tiến trình / hành vi carousel | `components/storefront/home/hero-slide.tsx` / `hero-controls.tsx` / `hero-progress.tsx` / `home-hero.tsx` (+ `hooks/use-carousel.ts`, `hooks/use-swipe.ts`); tỉ lệ cột chữ 46%: `hero-layout.ts` và `HERO_SPLIT_CLASS` trong `hero-slide.tsx` phải khớp nhau |
| Thêm, bớt hoặc đổi thứ tự khối trang chủ | `pages/storefront/home/index.tsx`; khung chung của khối có tiêu đề: `components/storefront/home/home-section.tsx` |
| Đổi nguồn dữ liệu Best sellers / số thẻ ở các khối trang chủ | `features/catalog/queries.ts` (`useBestSellerProducts`) / `features/catalog/home-constants.ts` |
| Đổi thẻ sản phẩm (ảnh, tên, giá, huy hiệu; hai nút trên ảnh là hàm `QuickActions` trong `product-card-quick-actions.tsx`: trái tim giả, chữ toast ở `STORE.comingSoon`; "Thêm nhanh" thật qua `use-quick-add.ts`) | `features/catalog/components/product-card.tsx`, `product-stock-badge.tsx`; ảnh: `components/storefront/product-image.tsx` |
| Đổi lưới sản phẩm (số cột) | `features/catalog/components/product-grid.tsx` |
| Đổi trang danh sách và bộ lọc / khoảng giá, kiểu sắp xếp, số sản phẩm mỗi trang | `features/catalog/components/catalog-*.tsx`, `catalog-filters.tsx` / `features/catalog/constants.ts` |
| Đổi trang chi tiết sản phẩm | `features/catalog/components/product-detail-content.tsx`, `purchase-panel.tsx`, `variant-picker.tsx` |
| Đổi menu điều hướng: các mục / giao diện thanh và bảng / ngăn kéo mobile | `STORE.navItems` ở `lib/store-info.ts` / `components/storefront/header-nav*.tsx` / `mobile-nav-*.tsx` |
| Đổi thanh thông báo chạy chữ | chữ: `STORE.announcements` ở `lib/store-info.ts`; giao diện: `components/storefront/announcement-bar.tsx` |
| Đổi footer: chữ, cột chính sách / bố cục | `STORE.footer` ở `lib/store-info.ts` / `components/storefront/storefront-footer.tsx`, `footer-*.tsx` |
| Đổi form nhận tin ở footer (chữ / hành vi) | `STORE.newsletter` ở `lib/store-info.ts` / `features/newsletter/` |
| Thêm nội dung trang chính sách | `lib/info-pages.ts` (điền `paragraphs`); thêm trang mới thì thêm slug vào `INFO_PAGES` và, nếu muốn hiện ở footer, vào `STORE.footer.policySlugs` |
| Thêm cửa hàng cho trang /dia-chi | `STORE.stores` ở `lib/store-info.ts` |
| Thêm một trang storefront mới | `pages/storefront/<tên>/index.tsx` (mỏng) + một `<Route>` trong `routes/storefront-routes.tsx`; logic và dữ liệu ở `features/<tên>/` |
| Đổi màu, cỡ chữ, khoảng cách, chuyển động | `src/global.css` (token), tra cách dùng ở `docs/storefront-design.md` |
| Đổi bán kính bo góc storefront / hover đảo màu của nút | `src/global.css` (`.soft-ui`, `rounded-card/panel`, `@custom-variant soft`) / lớp `soft:` trong `components/ui/button.tsx` |
| Đổi bề rộng và lề của khung nội dung | `components/storefront/page-container.tsx`, và 4 nơi tự viết class (header, footer, `header-nav-panel`, `search-panel`) + `--container-max`/`--container-inset` ở `global.css` |

## 11. Khi nào tạo file mới, khi nào gộp

1. Component hoặc hook chỉ dùng MỘT nơi và dưới ~20 dòng thì để trong file nơi dùng (viết thành hàm nội bộ, không `export`), không tạo file riêng.
2. Chỉ tách file khi: được tái sử dụng (từ hai nơi trở lên), file đang vượt ~150 dòng, hoặc cần test riêng.
3. Xóa file ngay khi đã thay bằng bản mới. Không để bản cũ sót lại; nhánh code cũ không còn nơi dùng (vd. một biến thể prop) cũng xóa theo.
4. Hằng số và nội dung (chữ, đường dẫn ảnh, danh sách mục) đặt ở file cấu hình (`lib/store-info.ts`, `lib/home-content.ts`, `features/<tên>/constants.ts`), không rải trong component.

Lưu ý khi gộp: file đích sau khi gộp không được vượt ~150 dòng; hàm nội bộ không làm `react-refresh/only-export-components` báo lỗi (chỉ phần `export` mới bị xét). Giữ file riêng cho trang mỏng (`pages/`), `routes/`, `api.ts`, và các hằng/kiểu dùng chung giữa nhiều file anh em (`header-nav-styles.ts`, `tab-ids.ts`...). Hai thứ cùng phải khớp số (vd. `hero-layout.ts` và `HERO_SPLIT_CLASS`) thì ghi chú chéo ở cả hai nơi.
