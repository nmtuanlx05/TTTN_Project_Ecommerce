# CLAUDE.md

File này cung cấp hướng dẫn cho Claude Code (claude.ai/code) khi làm việc với code trong repository này.

## Trạng thái dự án

Đây là một NestJS starter cho backend e-commerce thời trang. Cây thư mục `src/` hiện tại chỉ là
scaffold mặc định của Nest (`AppModule`/`AppController`/`AppService` trả về "Hello World") — các module
nghiệp vụ chưa được xây dựng. Đã có `docker-compose.yml` (service MySQL 8), `.env.development`/`.env.production` và `prisma.config.ts`
(Prisma 7: URL kết nối khai báo ở đây, không nằm trong schema). `prisma/schema.prisma` (13 model) đã khớp
`docs/05` và `docs/06`; migration `init_ecommerce`, `add_user_avatar_url`, `add_stock_movements`, `add_product_images_color_hex` và `add_order_checkout` đã có trong `prisma/migrations`. Thư mục `docs/` (tiếng Việt) là spec đã được chốt để
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
- `05-data-models.md` — mô tả schema Prisma (13 model, khớp `prisma/schema.prisma`) và quy tắc tồn kho, voucher
- `06-thiet-ke-database.md` — các vấn đề riêng của MySQL: đặt tên bảng (`@@map` sang snake_case),
  index, và các ràng buộc CHECK mà Prisma không hỗ trợ trực tiếp (thêm bằng cách sửa tay migration
  tạo từ `prisma migrate dev --create-only`)

### Mô hình nghiệp vụ

Ba role (`ADMIN`, `STAFF`, `CUSTOMER`) cộng với guest checkout (mua không cần đăng ký). Sơ đồ thực
thể cốt lõi: `Category → Product → ProductVariant` (tồn kho được tính theo từng biến thể — size ×
màu — không tính theo sản phẩm; `Product → ProductImage` là ảnh sản phẩm), `Cart/CartItem`, `Order/OrderItem`, `Voucher`. Staff nhập kho bằng
cách cộng trực tiếp vào `ProductVariant.stock` và mỗi lần đổi `stock` ghi một dòng `StockMovement` (module Kho);
không có lịch sử đổi trạng thái đơn (để V2). `Order` có hai quan hệ tới `User`: `userId` (`"OrderCustomer"`, khách đặt đơn)
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
- **Ảnh và màu sản phẩm**: `ProductImage` (tối đa 6 ảnh/sản phẩm, `url` VARCHAR(500), thứ tự theo `sortOrder`, ảnh đầu là ảnh
  đại diện) gắn theo **sản phẩm**, không theo màu. `PATCH` có gửi `images` thì thay cả mảng trong một `$transaction`. Cột
  `Product.imageUrl` **deprecated**: chỉ để tương thích, khi ghi được đồng bộ = ảnh đầu (null nếu dài hơn 191 ký tự hoặc không có ảnh);
  đọc thì ưu tiên ảnh thật, chỉ dự phòng bằng cột cũ khi chưa có dòng `ProductImage` nào; chỉ gửi `imageUrl` cũ (không gửi `images`) thì
  coi như `images = [imageUrl]`, gửi `null`/`""` thì xóa hết ảnh. Việc bỏ cột để đợt dọn dẹp sau. Màu: `ProductVariant.colorHex`
  (`#RRGGBB` in hoa, tùy chọn, CHECK ở DB), **không** có bảng `Color`; cùng tên màu trong một sản phẩm phải cùng `colorHex`. Bảng tra
  tên màu → hex ở `src/products/color-hex.ts`, migration SQL lặp lại và có test đối chiếu.
- **Giỏ hàng** (`src/cart/`, API ở `docs/api/cart.md`): lưu trong DB, chỉ `CUSTOMER` (ADMIN/STAFF 403 "Tài khoản quản trị không dùng để mua hàng"
  qua `@RolesMessage`); giỏ Guest và gộp giỏ để V2. Một giỏ/user, tạo khi thêm món đầu; mỗi dòng một biến thể, số lượng 1..10
  (`MAX_QUANTITY_PER_ITEM`, không CHECK ở DB) và không vượt `stock - reserved`; thêm trùng biến thể thì cộng dồn. Giỏ không giữ hàng và
  **không lưu giá** (đọc giá hiện tại; đơn hàng chụp giá lúc đặt). Ghi trong `$transaction` có `SELECT ... FOR UPDATE` dòng `carts`; dòng đã
  hết hàng/ẩn vẫn hiện kèm `purchasable`/`inStock`, `subtotal`/`itemCount` chỉ tính dòng mua được. Dòng của người khác trả 404.
- **Đặt đơn, voucher, quản lý đơn** (`src/orders/`, API ở `docs/api/orders.md`; địa chỉ ở `src/locations/`, `docs/api/locations.md`): chỉ `CUSTOMER` đặt đơn
  từ giỏ (guest checkout để V2), chỉ COD (`ONLINE` → 400 `PAYMENT_METHOD_NOT_SUPPORTED`; schema đã chừa `PENDING_PAYMENT`, `payment_transactions`).
  **Tiền tính ở một nơi** `orders.pricing.ts`: `phíShip = tạmTính >= 500.000 ? 0 : 30.000` (trên tạmTính TRƯỚC giảm giá; hằng số ở `orders.constants.ts`,
  cùng giá trị giao diện); `PERCENT` làm tròn xuống rồi ≤ `maxDiscount`, mọi giảm giá ≤ tạmTính (tổng có thể = 0). Đơn lưu `subtotal`/`discountAmount`/
  `voucherCode`/`shippingFee`/`totalAmount`, không tính lại. **Thứ tự khóa cố định** (tránh deadlock): giỏ → đơn → biến thể theo `variantId` tăng dần
  (câu khóa chỉ trên `product_variants`, không JOIN; tồn lấy từ chính câu khóa) → voucher. Lượt voucher tăng bằng `UPDATE ... WHERE (usageLimit IS NULL OR
  usedCount < usageLimit)` kiểm số dòng; hủy đơn trả `usedCount - 1` đúng một lần (kiểm trạng thái sau khi khóa đơn). Trừ kho thật ở `PACKING → SHIPPING`
  qua `InventoryService.shipOut` (giảm `stock` và `reserved`, ghi `StockMovement` `SALE`). Khách chỉ hủy khi `PENDING` (đơn khác → 409
  `ORDER_NOT_CANCELLABLE_BY_CUSTOMER`); Staff/Admin hủy đến hết `PACKING` kèm lý do. `COMPLETED` là trạng thái cuối, `RETURNED` để lần sau. Mọi đổi trạng thái
  ghi `order_status_histories`. Mã đơn `MS-YYMMDD-XXXX` (YYMMDD theo GMT+7 tường minh). `Idempotency-Key` (header tùy chọn) trả lại đúng đơn cũ, kiểm sau khi khóa giỏ.
  `GET /vouchers/available` (`src/vouchers/`, chỉ CUSTOMER) liệt kê voucher còn dùng được, tối đa 20, không lộ `id`/`usageLimit`/`usedCount`.
  **Đơn hàng của tôi**: `GET /orders` nhận `status` nhiều giá trị (phân tách dấu phẩy, `QueryMyOrdersDto`) + `q` (khớp một phần mã đơn), thẻ đơn có `itemCount`
  + `items[]` rút gọn (`myOrderListSelect`; danh sách quản trị vẫn dùng `orderListSelect`); `GET /orders/summary` (một `groupBy`); `POST /orders/:code/reorder`
  đưa dòng đơn vào giỏ qua `CartService.addManyBestEffort` (cùng khóa giỏ, retry P2034, tối đa 10 và `stock - reserved`; dòng không thêm được vào `skipped`,
  không dòng nào thì 409 `REORDER_NOTHING_ADDED`). Chưa chạy thật trên MySQL.
    Voucher: không giới hạn theo từng khách (V2, cần cột `perUserLimit`); không có endpoint xóa voucher; chưa có admin CRUD voucher (voucher mẫu ở `prisma/seed.ts`).
  **Địa chỉ 3 cấp (chuẩn CŨ)**: dữ liệu dvhcvn `v20250301` (GPL-3.0, xem `src/locations/data/NOTICE.md`) nạp vào bộ nhớ; đơn lưu mã VÀ tên từng cấp;
  quận/huyện có phường/xã thì `wardCode` bắt buộc, không có (5 huyện đảo) thì phải bỏ trống. Lỗi mới có trường `code` (`AllExceptionsFilter`, helper
  `src/common/errors/coded-errors.ts`); lỗi cũ không đổi.
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
- Trạng thái đơn: PENDING, CONFIRMED, PACKING, SHIPPING, COMPLETED; nhánh CANCELLED, RETURNED (RETURNED chưa triển khai); PENDING_PAYMENT cho đơn online (chưa dùng).
- Đơn online quá 30 phút chưa thanh toán thì tự hủy và nhả `reserved`.
- Đơn đã thanh toán: Staff chỉ tạo yêu cầu hủy, Admin duyệt.
- Không xóa cứng Order, OrderItem, Voucher.
- Staff nhập kho cộng trực tiếp vào `stock`; mỗi lần đổi `stock` ghi một dòng `StockMovement` (giữ/nhả `reserved` không ghi).
- Voucher: mỗi đơn tối đa một mã, giảm trên `subtotal`, hủy đơn thì hoàn lượt (`usedCount - 1`).
- Tiền là VND, kiểu Int.

Phạm vi MVP: 13 model (User, Category, Product, ProductVariant, ProductImage, Cart, CartItem,
Order, OrderItem, OrderStatusHistory, PaymentTransaction, Voucher, StockMovement).
Để V2: Address, Review, Supplier, AuditLog.

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
- Bảng đặt tên snake_case số nhiều bằng `@@map`. Không cấu hình `onDelete` ở giai đoạn này, **ngoại lệ duy nhất**: `ProductImage.productId`
  dùng `onDelete: Cascade` (bảng con thuần túy, không bảng nào tham chiếu tới; vẫn không xóa cứng `Product`).
- Migration đã áp thì không sửa; CHECK mới thêm bằng migration mới. Không chạy `migrate reset`/`db push --force-reset`; sao lưu DB dev
  (`mysqldump`) trước khi `migrate deploy`.
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

**Phân trang và danh sách**: query `page` (≥ 1, mặc định 1) và `limit` (1–100, mặc định 10; riêng `GET /products` công khai là 1–48, mặc định 12); `skip = (page - 1) * limit`.
Tổng `total` đếm theo cùng điều kiện lọc, lấy danh sách và đếm trong một `$transaction`. Sắp xếp dùng
`sortBy` (whitelist field) + `order` (`asc|desc`), mặc định mới nhất trước. Query boolean (`isActive`) phải
transform từ chuỗi `"true"/"false"`.

**So khớp chuỗi**: `fold()` (`src/common/utils/fold.ts`) bỏ dấu, hoa/thường và xử lý cả `đ → d` (NFD không tách được `đ`) để khớp
collation `utf8mb4_unicode_ci` của DB. Dùng nó khi so sánh tên màu/size/SKU trong service và mapper, đừng tự viết lại.

**Param id**: dùng `parseIdPipe` (`src/common/pipes/parse-id.pipe.ts`); id không hợp lệ → 400 "ID không hợp lệ".

**Không xóa cứng**: không có endpoint `DELETE` cho `Product`/`ProductVariant`/`User`/`Voucher`; khóa/mở khóa
bằng `PATCH /<resource>/:id/status` với body `{ isActive: boolean }`. `Order`/`OrderItem` không bao giờ xóa
(hủy đơn bằng trạng thái `CANCELLED`).

**DTO**: message class-validator hoàn toàn tiếng Việt. `Update<X>Dto` dùng `PartialType(PickType(Create<X>Dto, [...]))`
từ `@nestjs/mapped-types` (chưa cài `@nestjs/swagger`), chỉ gồm các trường được phép sửa — ví dụ User không cho
sửa `email`/`password` qua PATCH thường.

**Mã lỗi `code`**: lỗi mới ở module đơn hàng/địa chỉ có thêm trường `code` (vd `VOUCHER_EXPIRED`, `CART_EMPTY`), liệt kê ở `docs/api/orders.md`; dùng helper `badRequest/conflict/notFound` ở `src/common/errors/coded-errors.ts`.

**Lưu ý Jest**: `@nestjs/config` và `@nestjs/mapped-types` (v12) chỉ có bản ESM nên Jest không nạp được; test
phải `jest.mock` chúng (xem `test/users.e2e-spec.ts`, `test/auth.e2e-spec.ts`). `@nestjs/jwt` và `@nestjs/passport` cũng ESM
nhưng cần chạy thật, nên được transform qua `transformIgnorePatterns` trong `test/jest-e2e.json`.

## Quy ước Auth

Code ở `src/auth/`; chi tiết endpoint ở `docs/api/auth.md`. Passport: `LocalStrategy` (login), `JwtStrategy` (access),
`JwtRefreshStrategy` (refresh từ cookie).

- **Access token**: JWT 15 phút, header `Authorization: Bearer`, payload `{ sub: userId, role }`, secret `JWT_ACCESS_SECRET`.
- **Refresh token**: JWT 7 ngày trong cookie `refresh_token` (`httpOnly`, `sameSite=lax`, `secure` chỉ ở production,
  `path=/auth`), stateless, xoay vòng mỗi lần `POST /auth/refresh`, secret riêng `JWT_REFRESH_SECRET`.
- **File env theo `NODE_ENV`** (`src/config/env-file.ts`, dùng chung cho Nest, `prisma.config.ts`, `prisma/seed.ts`): không đặt
  hoặc `development` → `.env.development`; `production` → `.env.production`. Không còn dùng `.env`. Biến có sẵn trong
  `process.env` được ưu tiên hơn file. `npm run start:prod`, `db:migrate:prod`, `db:seed:prod` đã đặt `NODE_ENV=production`;
  `npm run db:up` chạy docker compose với `--env-file .env.development`.
- **Biến môi trường** (mẫu trong `.env.example`, không commit secret thật): `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN`,
  `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN`. Thiếu biến thì app không khởi động (`src/config/env.validation.ts`).
  `ADMIN_EMAIL`/`ADMIN_PASSWORD` chỉ dùng cho `npx prisma db seed` (tạo ADMIN đầu tiên, chạy lại an toàn).
- `JwtStrategy`/`JwtRefreshStrategy` luôn tải lại user từ DB: khóa tài khoản hoặc đổi role có hiệu lực ngay.
- Login: sai email hoặc mật khẩu → 401 cùng một câu; đúng mật khẩu nhưng `isActive=false` → 403. Email luôn được chuẩn hóa
  (trim + lowercase) bằng `NormalizeEmail` / `normalizeEmail` (`src/common/transforms/`).
- `LocalAuthGuard` tự validate body bằng `LoginDto` (guard chạy trước `ValidationPipe`).
- Đăng ký (`/auth/register`) luôn tạo `CUSTOMER`, gọi `UsersService.create`; `RegisterDto` không có `role`.
- Mật khẩu tối thiểu 6 ký tự ở `CreateUserDto` và `RegisterDto` (login không giới hạn).

**Bảo vệ endpoint mới**: gắn `@UseGuards(JwtAuthGuard, RolesGuard)` (thứ tự này) rồi `@Roles('ADMIN', 'STAFF')`;
lấy user bằng `@CurrentUser()`. Endpoint không gắn `@Roles` chỉ yêu cầu đã đăng nhập. `JwtAuthGuard` đã đăng ký toàn cục (`APP_GUARD`) nên endpoint công khai phải đánh dấu `@Public()`. Phân quyền luôn kiểm tra ở server.

**Quy tắc `role`**: chỉ `ADMIN` được đặt hoặc đổi `role` (áp dụng cho `POST /users` và `PATCH /users/:id`); đăng ký công khai
không bao giờ nhận `role`.
Toàn bộ `/users/*` chỉ `ADMIN` (`@Roles('ADMIN')` ở cấp class; riêng `PATCH /users/me/avatar` mở cho cả 3 role). ADMIN không được tự hạ
role của mình và không được tự khóa chính mình (403, kiểm ở `UsersService`); vẫn hạ/khóa được ADMIN khác. `test/route-permissions.e2e-spec.ts`
quét mọi controller và báo lỗi nếu có route không `@Public`, không `@Roles` mà chưa được liệt kê ngoại lệ có lý do: khi thêm route mới
chỉ cần đạt test này.

## Git

Quy ước đầy đủ ở `docs/git-workflow.md` (commit, tên nhánh, quy trình 6 bước, thứ tự commit, điều không làm).

- **Một tính năng = một nhánh** `feat/<tên-tính-năng>` chứa cả backend và frontend: một lần push, một Pull Request, merge
  bằng merge commit. Frontend đọc tài liệu API (`docs/api/<module>.md`) trực tiếp từ working tree, không chờ backend merge.
- **Thứ tự commit trong nhánh:** backend trước (schema/migration → code → test → docs), frontend sau (docs → hạ tầng/component
  dùng chung → tính năng).

- **Người dùng tự commit.** Claude KHÔNG commit, push, tạo nhánh hay merge, kể cả khi vừa làm xong một công việc.
  Làm xong chỉ để thay đổi ở working tree, không `git add`, không `git commit`.
- Chỉ làm các thao tác Git ghi (add/commit/push/nhánh/merge) khi người dùng nói rõ ngay trong lượt đó; lời yêu cầu cũ
  không có hiệu lực cho lần sau.
- Khi làm xong một công việc: báo ngắn gọn các file đã đổi và **gợi ý** message commit theo Conventional Commits
  (`<type>(<scope>): <subject>`, tiếng Anh, thể mệnh lệnh; scope lấy từ `docs/git-workflow.md`, không bắt buộc cứng) để
  người dùng tự chạy. Mỗi commit một thay đổi logic nên nếu thay đổi gồm nhiều phần thì gợi ý tách.
- **Quy tắc khi đề xuất commit:**
  - Mỗi file thuộc ĐÚNG MỘT commit; các commit xếp theo thứ tự phụ thuộc và mỗi commit phải build được độc lập.
  - KHÔNG dùng `git add -p` hay `git add -N`; add cả file.
  - Ghi rõ lệnh `cd` vào thư mục backend hoặc frontend trước mỗi nhóm lệnh (giả định đang ở thư mục gốc repo, nên nhóm
    frontend sau nhóm backend dùng `cd ../frontent-react-starter`).
  - Mỗi commit dùng nhiều tham số `-m` (tiêu đề, phần giải thích, dòng `Co-Authored-By`), không dùng chuỗi nhiều dòng.
  - Cuối đề xuất có bước `git status`, kết quả phải sạch.
  - Mỗi phiên chỉ đề xuất add các file của chính phần mình; nhắc người dùng chạy `git restore --staged :/` nếu working
    tree đang có file staged từ phần khác.
- Nếu được yêu cầu add/commit: không dùng `git add -A` hay `git add .` một cách mù quáng, `git add` theo từng file rồi
  kiểm tra `git diff --staged`. Không bao giờ add file `.env*` (chỉ `.env.example` được commit). Footer `Co-Authored-By`
  được phép.
- Không force push, không sửa lịch sử đã push, không push lên `main` khi chưa được yêu cầu.
- Trước khi người dùng commit, chạy lint + build + test và báo kết quả (kể cả lỗi có sẵn):
  - Lint kiểm tra bằng `npx eslint "{src,apps,libs,test}/**/*.ts"` (không `--fix`). `npm run lint` có `--fix` nên tự sửa
    file; nếu chạy thì xem lại `git status` và `git diff` sau đó.
  - `npm run build` và `npm test`; e2e chỉ chạy cho module đang sửa (có logic tiền/tồn kho).
  - Lỗi có sẵn, không phải do thay đổi hiện tại: `test/app.e2e-spec.ts` fail (xem "Việc tồn đọng"); ESLint báo lỗi ở
    `src/generated/**` (file Prisma sinh tự động, đã gitignore), `src/app.controller.ts` và `test/users.e2e-spec.ts`.
    Chỉ cần đảm bảo không phát sinh thêm lỗi mới.

## Việc tồn đọng

- **Chưa thu hồi được refresh token**: stateless nên logout chỉ xóa cookie; token bị lộ dùng được tới khi hết 7 ngày
  (chỉ chặn được bằng cách khóa user hoặc đổi `JWT_REFRESH_SECRET`). Cân nhắc lưu hash refresh token / `tokenVersion` ở V2.
- **Đặt đơn chưa kiểm chứng trên MySQL thật**: khóa `FOR UPDATE`, thứ tự khóa, chống bán vượt tồn và chống dùng quá lượt voucher khi hai request đồng thời chỉ được bảo vệ bằng thiết kế
  (khóa theo thứ tự cố định + UPDATE có điều kiện + kiểm số dòng); test hiện dùng Prisma giả. Chưa xác minh adapter áp dụng `isolationLevel: ReadCommitted`.
- **Chưa có**: admin CRUD voucher, đơn hết hạn tự hủy cho thanh toán online (job định kỳ, mô tả ở `docs/api/orders.md`), hoàn hàng `RETURNED`, giới hạn voucher theo khách, guest checkout, email.
- **Chưa giới hạn số lần đăng nhập sai** (chưa có rate limit/lockout) cho `/auth/login`.
- **`test/app.e2e-spec.ts` fail từ trước**: nạp `AppModule` thật mà `@nestjs/config` chỉ có bản ESM (Jest không nạp được)
  và cần DB. `test/jest-e2e.json` đã cho Jest transform `@nestjs/jwt` và `@nestjs/passport` (cũng ESM) để test Auth chạy được.
