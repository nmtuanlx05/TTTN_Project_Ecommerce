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
├─ routes/        admin-routes, storefront-routes, guards/ (require-auth, require-role)
├─ pages/         MỎNG: chỉ ghép
│   ├─ auth/        login, register
│   ├─ admin/       dashboard ✓, users ✓, orders, products, categories,
│   │               inventory, vouchers, placeholder ✓
│   ├─ styleguide/  ✓ trang nội bộ cho dev (route /styleguide), không thuộc admin
│   ├─ storefront/  home, catalog, product-detail, cart, checkout,
│   │               order-success, my-orders, account
│   └─ not-found.tsx
├─ features/      mỗi thực thể một thư mục theo khuôn mục 3
│   ├─ auth/ dashboard/ users/ ✓ categories/ products/ inventory/
│   └─ cart/ checkout/ orders/ vouchers/ payments/ account/
├─ components/
│   ├─ ui/          shadcn, KHÔNG sửa ✓
│   ├─ admin/       khung admin và thứ dùng chung nhiều tính năng ✓
│   ├─ storefront/  khung khách: store-layout, header, footer
│   └─ shared/      chỉ khi cả admin và storefront cùng dùng; chưa cần thì chưa tạo
├─ hooks/         hook dùng chung (use-theme ✓, use-mobile ✓, use-debounce)
├─ lib/           hạ tầng: api-client ✓, api-error ✓, query-client ✓, format ✓, utils ✓, date-range ✓
├─ types/         kiểu dùng chung (api.ts ✓)
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
2. features không import lẫn nhau. Thứ hai feature cùng cần thì đưa lên components/ hoặc lib/.
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

## 7. Bảng quyền (gợi ý, chốt khi làm Auth)
| Mục | ADMIN | STAFF |
|---|---|---|
| Dashboard, báo cáo doanh thu | Có | Không |
| Đơn hàng | Có | Có |
| Sản phẩm, Danh mục | Có | Xem, sửa |
| Kho | Có | Có |
| Voucher | Có | Không |
| Người dùng | Có | Không hoặc chỉ xem khách |

## 8. Thư mục xuất hiện khi nào
| Giai đoạn | Thư mục mới |
|---|---|
| Auth | features/auth/, routes/, pages/auth/ |
| Danh mục, sản phẩm | features/categories/, features/products/ |
| Kho | features/inventory/ |
| Giỏ hàng, đơn hàng, voucher | features/cart/, orders/, vouchers/ |
| Storefront | pages/storefront/, components/storefront/, features/checkout/, account/ |
| Thanh toán online | features/payments/ |
| Dashboard thật | features/dashboard/ nối API thật |

## 9. Việc tồn đọng
- Storefront sẽ có mật độ và tông riêng, không dùng `.density-admin`.
- API sản phẩm phải phân biệt admin (thấy cả sản phẩm ẩn) và khách (chỉ sản phẩm đang bán) khi làm backend Products.
- Ẩn hoặc chặn `/styleguide` ở bản production.
