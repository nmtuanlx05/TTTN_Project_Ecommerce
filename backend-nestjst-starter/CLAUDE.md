# CLAUDE.md

File này cung cấp hướng dẫn cho Claude Code (claude.ai/code) khi làm việc với code trong repository này.

## Trạng thái dự án

Đây là một NestJS starter cho backend e-commerce thời trang. Cây thư mục `src/` hiện tại chỉ là
scaffold mặc định của Nest (`AppModule`/`AppController`/`AppService` trả về "Hello World") — các module
nghiệp vụ chưa được xây dựng. Đã có `docker-compose.yml` (service MySQL 8), `.env` và `prisma.config.ts`
(Prisma 7: URL kết nối khai báo ở đây, không nằm trong schema). `prisma/schema.prisma` (9 model) đã khớp
`docs/05` và `docs/06`, nhưng chưa có migration nào. Thư mục `docs/` (tiếng Việt) là spec đã được chốt để
xây dựng dựa trên đó; coi nó là nguồn thông tin chính khi triển khai tính năng, không phải code `src/`
hiện tại. Nếu `docs/05` lệch với `prisma/schema.prisma` thì schema là bản chuẩn.

Thư mục này (`backend-nestjst-starter`) nằm cạnh một `frontent-react-starter` riêng biệt
(React 19 + Vite) dưới cùng git repo root (`TTTN_Project`), nhưng hai ứng dụng độc lập với nhau —
CLAUDE.md này chỉ đề cập tới backend NestJS.

## Lệnh thường dùng

Package manager là npm (có `package-lock.json`).

- `npm run start:dev` (alias `npm run dev`) — chạy ở watch mode, lệnh dev thông thường
- `npm run build` — `nest build`
- `npm run start:prod` — chạy bản đã build từ `dist/main`
- `npm run lint` — ESLint trên `src`, `apps`, `libs`, `test` kèm `--fix`
- `npm run format` — Prettier write trên `src/**/*.ts` và `test/**/*.ts`
- `npm test` — unit test (Jest, config nhúng trong `package.json`, `rootDir: src`, match `*.spec.ts`)
- `npm run test:watch` / `npm run test:cov` — watch mode / coverage
- `npm run test:e2e` — e2e test qua `test/jest-e2e.json`, match `*.e2e-spec.ts` trong `test/`

Chạy một test đơn lẻ: unit spec nằm cạnh file source dưới `src/`, nên
`npx jest app.controller.spec.ts` (hoặc `npx jest -t "test name"`) hoạt động vì rootDir của Jest là
`src`. Với một e2e spec đơn lẻ: `npx jest --config ./test/jest-e2e.json test/app.e2e-spec.ts`.

## Kiến trúc (theo `docs/`, sẽ được triển khai)

`docs/00` đến `docs/06` là các tài liệu thiết kế được đánh số theo thứ tự (tiếng Việt) cho một
website e-commerce thời trang gồm khu vực mua sắm cho khách và khu vực quản trị nội bộ
(admin/staff). Đọc theo thứ tự khi triển khai một tính năng — các tài liệu sau dựa trên các quyết
định đã chốt ở tài liệu trước:

- `00-tong-quan.md` — mục tiêu và ranh giới MVP (cái gì thuộc MVP, cái gì để V2)
- `01-actor-phan-quyen.md` — actor (Guest, Customer, Staff, Admin, + payment/shipping provider) và
  ma trận phân quyền giữa các nhóm
- `02-business-flow.md` — hai luồng cốt lõi (khách xem hàng → đặt hàng, staff xử lý đơn) và quy tắc
  chuyển trạng thái đơn hàng
- `03-yeu-cau-nghiep-vu.md` — yêu cầu nghiệp vụ, mã hóa `BR-U-*` (user), `BR-A-*` (admin),
  `BR-S-*` (staff), mỗi mục gắn nhãn MVP hoặc V2
- `04-yeu-cau-he-thong.md` — yêu cầu chức năng (`FR-*`) và phi chức năng (`NFR-*`)
- `05-data-models.md` — mô tả schema Prisma (9 model, khớp `prisma/schema.prisma`) và quy tắc tồn kho, voucher
- `06-thiet-ke-database.md` — các vấn đề riêng của MySQL: đặt tên bảng (`@@map` sang snake_case),
  index, và các ràng buộc CHECK mà Prisma không hỗ trợ trực tiếp (thêm bằng cách sửa tay migration
  tạo từ `prisma migrate dev --create-only`)

### Mô hình nghiệp vụ

Ba role (`ADMIN`, `STAFF`, `CUSTOMER`) cộng với guest checkout (mua không cần đăng ký). Sơ đồ thực
thể cốt lõi: `Category → Product → ProductVariant` (tồn kho được tính theo từng biến thể — size ×
màu — không tính theo sản phẩm), `Cart/CartItem`, `Order/OrderItem`, `Voucher`. Staff nhập kho bằng
cách cộng trực tiếp vào `ProductVariant.stock`; không có bảng lịch sử nhập/xuất kho hay lịch sử đổi
trạng thái đơn (để V2). `Order` có hai quan hệ tới `User`: `userId` (`"OrderCustomer"`, khách đặt đơn)
và `handledById` (`"OrderHandler"`, người phụ trách: Staff hoặc Admin).

Các quy tắc mà bất kỳ triển khai nào cũng phải giữ nguyên:

- **Tồn khả dụng** luôn là `stock - reserved`, không bao giờ dùng riêng `stock`. `reserved` (hàng
  đang giữ) tăng khi một order (đơn hàng) được đặt và giảm khi đơn bị hủy hoặc khi đơn chuyển sang
  giao hàng (đồng thời giảm cả `stock`). Cart không bao giờ giữ/khóa tồn kho — chỉ order mới giữ.
- **Trạng thái đơn là một chuỗi một chiều nghiêm ngặt**: `PENDING → CONFIRMED → PACKING → SHIPPING →
COMPLETED`, với `CANCELLED` và `RETURNED` là các nhánh phụ tách ra từ chuỗi đó. Các chuyển trạng
  thái ngoài bảng đã tài liệu hóa (xem `02-business-flow.md`) phải bị từ chối.
- Đơn online chưa thanh toán sau **30 phút** tự động hủy và nhả `reserved`.
- Staff có thể hủy trực tiếp đơn chưa thanh toán (bắt buộc có lý do); với đơn **đã thanh toán**,
  Staff chỉ được tạo _yêu cầu_ hủy/hoàn tiền — Admin phải duyệt.
- Khi tạo order phải kiểm tra lại tồn kho và giá, rồi ghi `Order`/`OrderItem` trong cùng một
  transaction database — không được bán vượt quá tồn khả dụng.
- Báo cáo doanh thu chỉ tính các đơn `COMPLETED`.
- `OrderItem` lưu snapshot (tên, SKU, size, màu, giá) tại thời điểm mua để các đơn cũ không bị ảnh
  hưởng khi sản phẩm bị sửa sau này.
- `Order.handledById` gán một lần, khi xác nhận đơn (PENDING → CONFIRMED); đơn hủy trước khi
  xác nhận thì để trống.
- `totalAmount = subtotal + shippingFee - discountAmount`. **Voucher**: mỗi đơn tối đa một mã; giảm
  trên `subtotal`, không giảm phí ship; `discountAmount` không vượt `subtotal`; guest dùng được; chỉ
  Admin tạo/quản lý. Kiểm tra hiệu lực, đơn tối thiểu, số lượt và tăng `usedCount` trong cùng
  transaction với việc tạo đơn. Đơn `CANCELLED` (kể cả tự hủy sau 30 phút) thì `usedCount - 1`; đơn
  `RETURNED` không hoàn lượt.
- Xóa mềm bằng `isActive` cho `Product`/`ProductVariant`/`User`/`Voucher`; `Order` và `OrderItem`
  không bao giờ xóa cứng (hủy đơn bằng `CANCELLED`).

### Code style

Cấu hình ESLint (`eslint.config.mjs`) dùng `typescript-eslint` `recommendedTypeChecked` +
`eslint-plugin-prettier`, với `@typescript-eslint/no-explicit-any` tắt và
`no-floating-promises`/`no-unsafe-argument` đặt ở mức `warn` thay vì `error`. `tsconfig.json` có
`strictNullChecks: true` nhưng `noImplicitAny: false`.

## Bối cảnh dự án

Backend cho website e-commerce bán hàng của một brand thời trang.
Stack: NestJS, Prisma, MySQL 8 (InnoDB). Trả lời và viết tài liệu bằng tiếng Việt.

Người dùng: Guest (chưa đăng nhập), CUSTOMER, STAFF, ADMIN.

- STAFF vận hành: sản phẩm, kho, đơn hàng, hỗ trợ khách. Không khóa user, không xem doanh thu.
- ADMIN có mọi quyền của STAFF, thêm: quản lý Staff, khóa user, báo cáo doanh thu, duyệt hoàn tiền.

Quyết định nghiệp vụ quan trọng (không tự ý thay đổi):

- Tồn kho theo biến thể (size + màu): `ProductVariant` có `stock` và `reserved`.
  Tồn khả dụng = `stock - reserved`.
- Thêm vào giỏ không giữ hàng. Đặt đơn tăng `reserved`. Chuyển SHIPPING thì giảm
  cả `stock` và `reserved`.
- Trạng thái đơn: PENDING, CONFIRMED, PACKING, SHIPPING, COMPLETED; nhánh CANCELLED, RETURNED.
- Đơn online quá 30 phút chưa thanh toán thì tự hủy và nhả `reserved`.
- Đơn đã thanh toán: Staff chỉ tạo yêu cầu hủy, Admin duyệt.
- Không xóa cứng Order, OrderItem, Voucher.
- Staff nhập kho cộng trực tiếp vào `stock`, không lưu lịch sử kho (để V2).
- Voucher: mỗi đơn tối đa một mã, giảm trên `subtotal`, hủy đơn thì hoàn lượt (`usedCount - 1`).
- Tiền là VND, kiểu Int.

Phạm vi MVP: 9 model (User, Category, Product, ProductVariant, Cart, CartItem,
Order, OrderItem, Voucher).
Để V2: Address, Review, Supplier, AuditLog, InventoryTransaction (lịch sử kho).

## Tài liệu dự án (đọc khi cần)

- docs/00-tong-quan.md: mục tiêu, quyết định đã chốt, phạm vi MVP
- docs/01-actor-phan-quyen.md: actor và ma trận quyền
- docs/02-business-flow.md: luồng đặt hàng, xử lý đơn, quy tắc chuyển trạng thái
- docs/03-yeu-cau-nghiep-vu.md: yêu cầu nghiệp vụ (mã BR-)
- docs/04-yeu-cau-he-thong.md: yêu cầu chức năng FR- và phi chức năng NFR-
- docs/05-data-models.md: schema Prisma và quy tắc tồn kho
- docs/06-thiet-ke-database.md: quan hệ, ràng buộc, index MySQL

## Quy tắc làm việc

- Trước khi viết code cho một module, đọc các file docs liên quan.
- Mỗi lần chỉ làm một module. Trước khi viết, tóm tắt lại điều sẽ làm và hỏi chỗ chưa rõ.
- Khi code khác tài liệu, hoặc tài liệu chưa rõ, hỏi tôi, không tự đổi nghiệp vụ.
- Không tự chạy migrate hay xóa dữ liệu khi chưa được đồng ý.
- Bảng đặt tên snake_case số nhiều bằng `@@map`. Không cấu hình `onDelete` ở giai đoạn này.
- Comment và tài liệu viết bằng tiếng Việt. Tên biến, hàm, file, commit message viết bằng tiếng Anh.

# BACKEND CONVENTIONS (NESTJS + PRISMA)

1. Cấu trúc module:
   - Thư mục: `src/modules/<resource-name>/` (kebab-case).
   - Gồm: `dto/`, `<name>.controller.ts`, `<name>.service.ts`, `<name>.module.ts`.
   - Thứ tự tạo: Entity/Schema -> DTOs -> Service -> Controller -> Module.

2. DTO:
   - Dùng `class-validator` với `message` hoàn toàn bằng tiếng Việt.
   - `Update<Resource>Dto` kế thừa `Create<Resource>Dto` qua `PartialType` từ `@nestjs/swagger`.

3. Bảo mật Password (Tuyệt đối):
   - Triệt tiêu trường `password` ngay tại tầng Service bằng helper loại bỏ key hoặc Prisma omit/select cụ thể trước khi trả dữ liệu ra ngoài. Không bao giờ trả `password` thô/hash.

4. Xử lý lỗi (Exception):
   - Dùng built-in NestJS exceptions (`NotFoundException`, `ConflictException`, `BadRequestException`, `ForbiddenException`).
   - Thông điệp tiếng Việt thân thiện, không throw trực tiếp lỗi thô của Prisma/MySQL (P2002, foreign key error) ra client.

5. Cấu trúc Response chuẩn:
   - Single: `{ success: true, data: {...} }`
   - Paginated: `{ success: true, data: [...], meta: { page, limit, total, totalPages } }`
   - Lỗi: Đồng bộ qua Exception Filter toàn cục.

6. Phân quyền (RBAC):
   - Dùng Guard (`JwtAuthGuard`, `RolesGuard`) kết hợp Decorator `@Roles('ADMIN', 'STAFF', 'CUSTOMER')`.
   - Server-side enforcement 100% cho các API quản trị và nội bộ kho.

7. Prisma & Transaction:
   - Inject `PrismaService` vào constructor của Service.
   - Bắt buộc dùng `this.prisma.$transaction([...])` khi thay đổi dữ liệu đồng thời trên nhiều bảng (Checkout, Nhập/Xuất kho).

8. Global Validation:
   - Đăng ký `ValidationPipe` toàn cục trong `main.ts` với `{ whitelist: true, forbidNonWhitelisted: true, transform: true }`.

9. Swagger:
   - Mỗi endpoint tối thiểu có: `@ApiOperation({ summary })`, `@ApiResponse({ status, description })`. DTO phải có `@ApiProperty()`.

10. Testing (Mức đồ án):
    - Không bắt buộc viết unit test cho mỗi service.
    - Chỉ viết e2e cho module có logic tiền hoặc tồn kho (Orders, Inventory, Payment).
    - Các module CRUD đơn giản chỉ cần chạy thử bằng tay.

## Quy ước API

Áp dụng cho mọi module; module mới phải theo, không tự định nghĩa dạng response riêng. Phần chung nằm ở
`src/common/` và `src/app.setup.ts` (`configureApp()` dùng trong `main.ts`) — không lặp lại trong controller.

**Response thành công** (do `ResponseInterceptor` bọc; controller/service chỉ trả dữ liệu thô):

- Đơn: `{ "success": true, "data": { ... } }`
- Phân trang: `{ "success": true, "data": [ ... ], "meta": { "page", "limit", "total", "totalPages" } }`.
  Service trả `new Paginated(data, { page, limit, total })` (`src/common/paginated.ts`).
- Mọi key `password` bị xóa đệ quy khỏi response ở bất kỳ độ sâu nào (lớp chốt thêm); service vẫn phải
  `select` cụ thể, không dựa hoàn toàn vào lớp này.

**Response lỗi** (do `AllExceptionsFilter` tạo):
`{ "success": false, "statusCode": 400, "message": "...", "errors"?: [{ "field", "message" }] }`

- Lỗi validate (class-validator) → 400, `message: "Dữ liệu không hợp lệ"`, `errors` liệt kê theo từng trường
  (trường lồng nhau ghi dạng `a.b`). Trường thừa (`forbidNonWhitelisted`) cũng nằm trong `errors`.
- Prisma P2002 → 409 (nhắc tới email thì "Email đã được sử dụng", còn lại "Dữ liệu đã tồn tại"); P2025 → 404.
- Lỗi không lường trước → 500 "Lỗi hệ thống, vui lòng thử lại sau"; chi tiết (SQL, tên bảng, stack) chỉ ghi
  log server, không trả client.
- Trong service vẫn ném built-in exception với message tiếng Việt (`NotFoundException`, `ConflictException`...).

**Phân trang và danh sách**: query `page` (≥ 1, mặc định 1) và `limit` (1–100, mặc định 10); `skip = (page - 1) * limit`.
Tổng `total` đếm theo cùng điều kiện lọc, lấy danh sách và đếm trong một `$transaction`. Sắp xếp dùng
`sortBy` (whitelist field) + `order` (`asc|desc`), mặc định mới nhất trước. Query boolean (`isActive`) phải
transform từ chuỗi `"true"/"false"`.

**Param id**: dùng `parseIdPipe` (`src/common/pipes/parse-id.pipe.ts`); id không hợp lệ → 400 "ID không hợp lệ".

**Không xóa cứng**: không có endpoint `DELETE` cho `Product`/`ProductVariant`/`User`/`Voucher`; khóa/mở khóa
bằng `PATCH /<resource>/:id/status` với body `{ isActive: boolean }`. `Order`/`OrderItem` không bao giờ xóa
(hủy đơn bằng trạng thái `CANCELLED`).

**DTO**: message class-validator hoàn toàn tiếng Việt. `Update<X>Dto` dùng `PartialType(PickType(Create<X>Dto, [...]))`
từ `@nestjs/mapped-types` (chưa cài `@nestjs/swagger`), chỉ gồm các trường được phép sửa — ví dụ User không cho
sửa `email`/`password` qua PATCH thường.

**Lưu ý Jest**: `@nestjs/config` và `@nestjs/mapped-types` (v12) chỉ có bản ESM nên Jest không nạp được; test
phải `jest.mock` chúng (xem `test/users.e2e-spec.ts`).

## Việc tồn đọng

- **`POST /users` đang nhận `role`, nên ai cũng tạo được user `ADMIN`** (chưa có Auth). Phải chặn ở module Auth:
  chỉ `ADMIN` được đặt hoặc đổi `role` (áp dụng cho cả `POST /users` và `PATCH /users/:id`).
