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
│                 redirect-if-authenticated), use-avatar-saved ✓ (cập nhật phiên + cache sau khi đổi ảnh đại diện)
├─ pages/         MỎNG: chỉ ghép
│   ├─ auth/        login ✓, register ✓
│   ├─ admin/       dashboard ✓, users ✓, categories ✓, products ✓ (index, new, edit), orders,
│   │               inventory ✓, vouchers, placeholder ✓
│   ├─ styleguide/  ✓ trang nội bộ cho dev (route /styleguide), không thuộc admin
│   ├─ forbidden.tsx ✓ (403), not-found.tsx ✓ (404)
│   ├─ storefront/  home ✓ (hero, danh mục, sản phẩm mới, tuyên bố), catalog ✓ (/products), product-detail ✓ (/products/:slug), stores ✓ (/dia-chi), not-found ✓ (404 trong khung khách),
│   │               cart, checkout, order-success, my-orders, account
├─ features/      mỗi thực thể một thư mục theo khuôn mục 3
│   ├─ auth/ ✓ dashboard/ users/ ✓ categories/ ✓ products/ ✓ inventory/ ✓ catalog/ ✓ (dữ liệu công khai của storefront: danh sách và chi tiết sản phẩm)
│   └─ cart/ checkout/ orders/ vouchers/ payments/ account/
├─ components/
│   ├─ ui/          shadcn, KHÔNG sửa ✓
│   ├─ admin/       khung admin và thứ dùng chung nhiều tính năng ✓ (category-select ✓ — ô chọn danh mục dạng cây thụt lề, dùng ở products và inventory)
│   ├─ storefront/  ✓ khung khách và phần dựng sẵn dùng ở nhiều trang storefront: storefront-layout, storefront-header
│   │                 (+ header-session, header-account, header-nav (+ header-nav-link, header-nav-panel: bảng toàn chiều rộng, header-nav-styles — thanh điều hướng và mega menu từ `xl`),
│   │                 mobile-nav-drawer (+ mobile-nav-list, mobile-nav-accordion, mobile-nav-styles — ngăn kéo dưới `xl`), mobile-account, search-panel,
│   │                 cart-button), storefront-footer, storefront-drawer (ngăn kéo/khung trượt dựng trên Base UI Dialog), skip-link,
│   │                 breadcrumbs, pagination (số trang, dạng liên kết), product-image (khung 3:4, shimmer, fade, ảnh dự phòng),
│   │                 reveal (hiện dần khi cuộn), state-message (rỗng/lỗi/404), section-heading, category-tiles (ô chữ danh mục trang chủ), brand-statement,
│   │                 store-list (+ store-entry) — danh sách cửa hàng của trang /dia-chi
│   └─ shared/      ✓ chỉ khi cả admin và storefront (kể cả trang auth) cùng dùng: theme-toggle (+ theme-cycle-button,
│                     theme-options), password-input, user-menu, brand-logo, route-fallback ✓ (vòng quay khi tải trang lazy), form-dialog (vỏ hộp thoại có form: dùng cả ở admin lẫn hộp
│                     thoại trong user-menu), image-upload-field (+ image-preview, image-upload-progress,
│                     image-upload-message) — ô upload một ảnh, dùng cho sản phẩm và ảnh đại diện; user-avatar (+ avatar-initials) — avatar tròn có chữ cái
│                     đầu khi chưa có ảnh; avatar-dialog (+ avatar-form) — hộp thoại đổi ảnh đại diện, mở từ user-menu; image-lightbox (+ -viewer,
│                     -toolbar) — xem ảnh lớn có thu phóng, bật qua `zoomable` của image-preview
├─ hooks/         hook dùng chung (use-theme ✓, use-mobile ✓, use-dialog-target ✓, use-category-options ✓ — danh mục cho ô chọn của
│                 categories và products, use-image-upload ✓ + use-file-drop ✓ — upload ảnh và kéo-thả cho image-upload-field, use-update-avatar ✓ — lưu ảnh đại diện, use-pan-zoom ✓ +
│                 use-pan-zoom-gestures ✓ — thu phóng và kéo ảnh cho image-lightbox, use-debounce,
│                 use-category-tree ✓ — cây danh mục công khai cho header/footer/catalog, use-document-title ✓, use-in-view ✓ — IntersectionObserver,
│                 use-open-until-navigation ✓ — ngăn kéo menu/khung tìm kiếm tự đóng khi đổi pathname, use-mega-menu ✓ — trạng thái mở/đóng, hẹn giờ hover và bấm ra ngoài của bảng điều hướng ở header, use-scroll-restoration ✓ — cuộn lên đầu khi đổi trang
│                 và khôi phục vị trí khi Back/F5 của storefront)
├─ lib/           hạ tầng: api-client ✓, api-error ✓, query-client ✓, format ✓, utils ✓, date-range ✓, category-tree-options ✓ (danh mục phẳng → danh sách theo cây, thuần túy),
│                 form-errors ✓, password-rules ✓ (nguồn duy nhất độ dài mật khẩu), vn-phone ✓, display-name ✓ (tên hiển thị của tài khoản),
│                 image-rules ✓ (giới hạn và kiểm tra file ảnh theo kind), upload-image ✓ (POST /uploads/<kind>), update-avatar ✓ (PATCH /users/me/avatar),
│                 pan-zoom ✓ (toán thu phóng và kéo ảnh, thuần túy), store-info ✓ (nội dung cửa hàng: tên, khẩu hiệu, liên hệ — MỘT file duy nhất),
│                 category-tree ✓ (danh mục phẳng → cây, tra slug, chuỗi cha; thuần túy),
│                 nav-items ✓ (cấu hình `STORE.navItems` + cây danh mục → mục điều hướng, dòng của bảng, mục đang xem; thuần túy)
├─ types/         kiểu dùng chung (api.ts ✓, user.ts ✓ — Role và User, dùng ở auth, users, components/admin; category.ts ✓ — PublicCategory,
│                 dùng ở categories và products; upload.ts ✓ — ImageUploadKind)
└─ assets/        ảnh, font nội bộ
````

### features/catalog (dữ liệu công khai của storefront)
````
features/catalog/
├─ api.ts  queries.ts  types.ts  constants.ts  (GET /products và /products/:slug; key `["catalog", ...]`)
├─ use-catalog-search-params.ts   (URL → bộ lọc: category slug, q, sort, minPrice, maxPrice, page; lọc whitelist)
├─ variant-options.ts  price-range.ts   (logic thuần)
└─ components/   danh sách: catalog-content, catalog-heading, catalog-results, catalog-states, catalog-filters, category-filter,
                 price-filter, filter-link, filter-drawer, sort-select, active-filter-chips, product-grid(+skeleton), product-card
                 chi tiết: product-detail-content (+skeleton, not-found), product-gallery, purchase-panel, variant-picker,
                 option-chip-group, quantity-stepper, sticky-buy-bar, related-products
                 trang chủ: home-hero (+ home-hero-images), home-new-arrivals (dùng chung một request `limit=8` với hero)
````
Cổng đăng nhập cho hành động mua nằm ở `features/auth/use-require-login.ts`; trang (`pages/`) và `routes/storefront-layout-container.tsx`
lấy hook rồi truyền xuống bằng props, vì features không import lẫn nhau.

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

## 6. Checklist module mới
1. Đọc ../backend-nestjst-starter/docs/api/<tên>.md (chỉ đọc, không sửa backend).
2. Tạo features/<tên>/ theo khuôn mục 3.
3. Tạo pages/admin/<tên>/index.tsx mỏng.
4. Thêm route, đặt `ready: true` và `roles` trong nav-items.ts.
5. Chạy tsc -b, lint, build; xem light và dark.
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
| Giỏ hàng, đơn hàng, voucher | features/cart/, orders/, vouchers/ |
| Storefront khung + catalog ✓ | components/storefront/, pages/storefront/catalog + product-detail, features/catalog/ |
| Storefront còn lại | features/checkout/, account/ |
| Thanh toán online | features/payments/ |
| Dashboard thật | features/dashboard/ nối API thật |

## 9. Việc tồn đọng
- Storefront dùng mật độ mặc định (không `.density-admin`), tông tối giản biên tập (Archivo cho logo/tiêu đề). Định hướng thiết kế chi tiết: `docs/storefront-design.md`.
- Backend Products đã tách `/admin/products` (thấy cả sản phẩm ẩn) và `/products` (khách, chỉ sản phẩm đang bán). Admin dùng `features/products`, khách dùng `features/catalog` (query key `["catalog", ...]`, tách khỏi `["products"]` của admin).
- Trang admin và `/styleguide` nạp bằng `React.lazy` (`routes/admin-routes.tsx`, `App.tsx`) để khách storefront không tải mã quản trị; `/login` và `/register` KHÔNG lazy vì nằm trên đường mua hàng.
- Ẩn hoặc chặn `/styleguide` ở bản production.
- `components/shared/` hiện chứa `theme-toggle`, `password-input`, `user-menu`, `brand-logo`, `form-dialog` (dùng từ hai khu trở lên) và bộ `image-*` (ô upload ảnh). `form-dialog` trước đây nằm ở `components/admin/`; đã chuyển sang `shared/` vì hộp thoại trong `user-menu` (storefront cũng dùng) cần nó, và `shared/` không được phụ thuộc ngược vào `admin/`. `confirm-dialog` vẫn ở `components/admin/` (chỉ admin dùng).
- Upload ảnh là hạ tầng chung, không thuộc feature nào: `components/` không được import `features/`, nên hàm gọi API nằm ở `lib/upload-image.ts` (đi qua `apiUpload` của `api-client`, không import axios) và hook ở `hooks/`. Avatar dùng lại bằng `kind="avatars"`, `shape="circle"` (hộp thoại `avatar-dialog`); hàm lưu `lib/update-avatar.ts` và hook `hooks/use-update-avatar.ts` cũng ở tầng chung vì `shared/` không import `features/`. Phần cập nhật phiên và cache sau khi lưu nằm ở `routes/use-avatar-saved.ts`.
