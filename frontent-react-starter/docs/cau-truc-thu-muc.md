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
│                 storefront-layout-container, admin-index-redirect, can-access-path, guards/ (require-auth, require-role,
│                 redirect-if-authenticated)
├─ pages/         MỎNG: chỉ ghép
│   ├─ auth/        login ✓, register ✓
│   ├─ admin/       dashboard ✓, users ✓, categories ✓, products ✓ (index, new, edit), orders,
│   │               inventory, vouchers, placeholder ✓
│   ├─ styleguide/  ✓ trang nội bộ cho dev (route /styleguide), không thuộc admin
│   ├─ forbidden.tsx ✓ (403), not-found.tsx ✓ (404)
│   ├─ storefront/  home ✓ (hero + khối "sắp ra mắt"), catalog, product-detail, cart, checkout,
│   │               order-success, my-orders, account
├─ features/      mỗi thực thể một thư mục theo khuôn mục 3
│   ├─ auth/ ✓ dashboard/ users/ ✓ categories/ ✓ products/ ✓ inventory/
│   └─ cart/ checkout/ orders/ vouchers/ payments/ account/
├─ components/
│   ├─ ui/          shadcn, KHÔNG sửa ✓
│   ├─ admin/       khung admin và thứ dùng chung nhiều tính năng ✓
│   ├─ storefront/  ✓ khung khách: storefront-layout, storefront-header, storefront-footer, home-hero
│   └─ shared/      ✓ chỉ khi cả admin và storefront (kể cả trang auth) cùng dùng: theme-toggle (+ theme-cycle-button,
│                     theme-options), password-input, user-menu, brand-logo
├─ hooks/         hook dùng chung (use-theme ✓, use-mobile ✓, use-dialog-target ✓, use-category-options ✓ — danh mục cho ô chọn của
│                 categories và products, use-debounce)
├─ lib/           hạ tầng: api-client ✓, api-error ✓, query-client ✓, format ✓, utils ✓, date-range ✓,
│                 form-errors ✓, password-rules ✓ (nguồn duy nhất độ dài mật khẩu), vn-phone ✓, display-name ✓ (tên hiển thị của tài khoản)
├─ types/         kiểu dùng chung (api.ts ✓, user.ts ✓ — Role và User, dùng ở auth, users, components/admin; category.ts ✓ — PublicCategory,
│                 dùng ở categories và products)
└─ assets/        ảnh, font nội bộ
````

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
   (ví dụ `PublicCategory` ở `types/category.ts` và `useCategoryOptions` ở `hooks/use-category-options.ts`, vì cả categories lẫn products cần chọn danh mục).
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
| Kho | features/inventory/ |
| Giỏ hàng, đơn hàng, voucher | features/cart/, orders/, vouchers/ |
| Storefront | pages/storefront/, components/storefront/, features/checkout/, account/ |
| Thanh toán online | features/payments/ |
| Dashboard thật | features/dashboard/ nối API thật |

## 9. Việc tồn đọng
- Storefront dùng mật độ mặc định (không `.density-admin`), tông tối giản biên tập (Archivo cho logo/tiêu đề). Header chưa có điều hướng, giỏ hàng, tìm kiếm.
- Backend Products đã tách `/admin/products` (thấy cả sản phẩm ẩn) và `/products` (khách, chỉ sản phẩm đang bán). Frontend mới dùng phía admin; phía khách làm cùng storefront.
- Ẩn hoặc chặn `/styleguide` ở bản production.
- `components/shared/` hiện chứa `theme-toggle`, `password-input`, `user-menu`, `brand-logo` (dùng từ hai khu trở lên).
