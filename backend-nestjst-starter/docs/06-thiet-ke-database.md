# Thiết kế Database

Database gồm 13 bảng với các quan hệ khóa ngoại ở mục 1, dành cho MySQL 8 (InnoDB). Quy tắc chung: không xóa cứng dữ liệu tài chính (đơn hàng, voucher); hủy đơn bằng `status = CANCELLED`, vô hiệu voucher bằng `isActive = false`.

## 1. Quan hệ giữa các bảng

| Quan hệ | Loại | Khóa ngoại | Bắt buộc |
| --- | --- | --- | --- |
| Category → Category (cha) | 1-N | `parentId` | Không |
| Category → Product | 1-N | `categoryId` | Có |
| Product → ProductVariant | 1-N | `productId` | Có |
| Product → ProductImage | 1-N | `productId` | Có |
| User → Cart | 1-1 | `userId` (unique) | Có |
| Cart → CartItem | 1-N | `cartId` | Có |
| ProductVariant → CartItem | 1-N | `variantId` | Có |
| User → Order (khách đặt đơn, quan hệ `OrderCustomer`) | 1-N | `userId` | Không (đơn của guest) |
| User → Order (người phụ trách, quan hệ `OrderHandler`) | 1-N | `handledById` | Không (đơn chưa được xác nhận) |
| Voucher → Order | 1-N | `voucherId` | Không (đơn không dùng voucher) |
| Order → OrderItem | 1-N | `orderId` | Có |
| Order → OrderStatusHistory | 1-N | `orderId` | Có |
| User → OrderStatusHistory (người thao tác) | 1-N | `actorId` | Không (hệ thống tự đổi) |
| Order → PaymentTransaction | 1-N | `orderId` | Có |
| ProductVariant → OrderItem | 1-N | `variantId` | Có |
| ProductVariant → StockMovement | 1-N | `variantId` | Có |
| User → StockMovement (người thực hiện) | 1-N | `createdById` | Có |

Quan hệ nhiều-nhiều giữa Order và ProductVariant được tách thành bảng trung gian `OrderItem` (thêm số lượng, giá), tương tự `CartItem` giữa Cart và ProductVariant.

## 2. Ràng buộc và index theo bảng

| Bảng | Unique | Index khai báo bằng `@@index` |
| --- | --- | --- |
| User | `email` | — |
| Category | `slug` | — |
| Product | `slug` | (`categoryId`, `isActive`) |
| ProductVariant | `sku`; (`productId`, `size`, `color`) | — |
| ProductImage | — | (`productId`, `sortOrder`) |
| Cart | `userId` | — |
| CartItem | (`cartId`, `variantId`) | — |
| Voucher | `code` | — |
| Order | `code`; (`userId`, `idempotencyKey`) | (`status`, `createdAt`); `customerPhone`; (`userId`, `createdAt`) |
| OrderItem | — | — |
| OrderStatusHistory | — | (`orderId`, `createdAt`) |
| PaymentTransaction | (`provider`, `providerTxnId`) | `orderId` |
| StockMovement | — | (`variantId`, `createdAt`) |

InnoDB tự tạo index cho mọi cột khóa ngoại, nên các cột như `userId`, `handledById`, `voucherId`, `orderId` hay `variantId` không cần khai báo thêm và không được liệt kê ở bảng trên. Các index còn lại, ví dụ (`status`, `createdAt`) hay `customerPhone`, cần khai báo bằng `@@index`.

### CHECK constraint

Prisma chưa hỗ trợ CHECK trực tiếp, nên các CHECK dưới đây được thêm tay vào file migration (tạo bằng `prisma migrate dev --create-only` hoặc `prisma migrate diff --script`, chỉnh file rồi mới áp). Hầu hết nằm ở `prisma/migrations/20261004165301_init_ecommerce/migration.sql`; hai CHECK cho ảnh và mã màu nằm ở `20261104090000_add_product_images_color_hex`. **Migration đã áp thì không sửa**: CHECK mới luôn thêm bằng migration mới. Tên constraint dạng `chk_<bảng>_<ý nghĩa>`.

| Bảng | Constraint | Điều kiện |
| --- | --- | --- |
| product_variants | `chk_product_variants_stock` | `stock >= 0` |
| product_variants | `chk_product_variants_reserved` | `reserved >= 0 AND reserved <= stock` |
| product_variants | `chk_product_variants_color_hex` | `colorHex IS NULL` hoặc đúng `#RRGGBB` in hoa (migration `add_product_images_color_hex`) |
| product_images | `chk_product_images_sort_order` | `sortOrder >= 0` (migration `add_product_images_color_hex`) |
| products | `chk_products_price` | `price >= 0` |
| cart_items | `chk_cart_items_quantity` | `quantity > 0` (mức tối đa 10 mỗi dòng chỉ kiểm ở ứng dụng, không có CHECK để đổi hằng số không cần migration) |
| order_items | `chk_order_items_quantity` | `quantity > 0` |
| order_items | `chk_order_items_price` | `price >= 0` |
| orders | `chk_orders_total_amount` | `totalAmount >= 0` |
| orders | `chk_orders_discount_amount` | `discountAmount >= 0 AND discountAmount <= subtotal` |
| vouchers | `chk_vouchers_discount_value` | `discountValue > 0` |
| vouchers | `chk_vouchers_percent_max` | `discountType <> 'PERCENT' OR discountValue <= 100` |
| vouchers | `chk_vouchers_used_count` | `usedCount >= 0` |
| vouchers | `chk_vouchers_min_order_value` | `minOrderValue >= 0` |
| vouchers | `chk_vouchers_usage_limit` | `usageLimit IS NULL OR usedCount <= usageLimit` |
| vouchers | `chk_vouchers_usage_limit_positive` | `usageLimit IS NULL OR usageLimit > 0` |
| vouchers | `chk_vouchers_max_discount_positive` | `maxDiscount IS NULL OR maxDiscount > 0` |
| vouchers | `chk_vouchers_dates` | `expiresAt > startsAt` |
| payment_transactions | `chk_payment_transactions_amount` | `amount >= 0` (migration `add_order_checkout`) |

`order_items` có hai constraint riêng (`quantity` và `price`) để thông báo lỗi chỉ rõ cột nào sai. Tên cột là camelCase nên trong SQL phải bọc dấu backtick. Không đặt CHECK lên cột khóa ngoại, vì MySQL báo lỗi 3823 khi cột có FK với `ON UPDATE CASCADE` hoặc `ON DELETE SET NULL`.

SQL đúng như trong file migration:

```sql
-- AddCheck: product_variants
ALTER TABLE `product_variants`
    ADD CONSTRAINT `chk_product_variants_stock` CHECK (`stock` >= 0),
    ADD CONSTRAINT `chk_product_variants_reserved` CHECK (`reserved` >= 0 AND `reserved` <= `stock`);

-- AddCheck: products
ALTER TABLE `products`
    ADD CONSTRAINT `chk_products_price` CHECK (`price` >= 0);

-- AddCheck: cart_items
ALTER TABLE `cart_items`
    ADD CONSTRAINT `chk_cart_items_quantity` CHECK (`quantity` > 0);

-- AddCheck: order_items
ALTER TABLE `order_items`
    ADD CONSTRAINT `chk_order_items_quantity` CHECK (`quantity` > 0),
    ADD CONSTRAINT `chk_order_items_price` CHECK (`price` >= 0);

-- AddCheck: orders
ALTER TABLE `orders`
    ADD CONSTRAINT `chk_orders_total_amount` CHECK (`totalAmount` >= 0),
    ADD CONSTRAINT `chk_orders_discount_amount` CHECK (`discountAmount` >= 0 AND `discountAmount` <= `subtotal`);

-- AddCheck: vouchers
ALTER TABLE `vouchers`
    ADD CONSTRAINT `chk_vouchers_discount_value` CHECK (`discountValue` > 0),
    ADD CONSTRAINT `chk_vouchers_percent_max` CHECK (`discountType` <> 'PERCENT' OR `discountValue` <= 100),
    ADD CONSTRAINT `chk_vouchers_used_count` CHECK (`usedCount` >= 0),
    ADD CONSTRAINT `chk_vouchers_min_order_value` CHECK (`minOrderValue` >= 0),
    ADD CONSTRAINT `chk_vouchers_usage_limit` CHECK (`usageLimit` IS NULL OR `usedCount` <= `usageLimit`),
    ADD CONSTRAINT `chk_vouchers_usage_limit_positive` CHECK (`usageLimit` IS NULL OR `usageLimit` > 0),
    ADD CONSTRAINT `chk_vouchers_max_discount_positive` CHECK (`maxDiscount` IS NULL OR `maxDiscount` > 0),
    ADD CONSTRAINT `chk_vouchers_dates` CHECK (`expiresAt` > `startsAt`);
```

Hai CHECK thêm ở migration `add_product_images_color_hex`:

```sql
-- REGEXP_LIKE với cờ 'c' = phân biệt hoa thường (collation _ci mặc định sẽ nhận cả chữ thường)
ALTER TABLE `product_variants`
    ADD CONSTRAINT `chk_product_variants_color_hex` CHECK (`colorHex` IS NULL OR REGEXP_LIKE(`colorHex`, '^#[0-9A-F]{6}$', 'c'));
ALTER TABLE `product_images`
    ADD CONSTRAINT `chk_product_images_sort_order` CHECK (`sortOrder` >= 0);
```

Migration này cũng chuyển dữ liệu: mỗi sản phẩm có `imageUrl` thành một dòng `product_images` (`sortOrder` 0), và điền `colorHex` cho biến thể cũ từ bảng tra tên màu → hex (SQL `CASE`, không dùng bảng tạm). Bảng tra gốc nằm ở `src/products/color-hex.ts` (`COLOR_HEX_MAP`); SQL tĩnh phải lặp lại nên `color-hex.spec.ts` đối chiếu hai nơi. Prisma **không có migration lùi**: muốn quay về phải khôi phục từ bản sao lưu.

MySQL chỉ thực thi CHECK từ bản 8.0.16 trở lên. Các CHECK này là lớp bảo vệ cuối: dù code có lỗi, database vẫn không cho tồn kho âm, giữ nhiều hơn tồn thực tế, giảm giá vượt tổng tiền hàng hoặc dùng voucher quá số lượt cho phép.

## 3. Đặt tên bảng

Prisma mặc định tạo bảng theo tên model (`ProductVariant`). MySQL trên Linux phân biệt hoa thường ở tên bảng, nên `ProductVariant` và `productvariant` là hai tên khác nhau. Schema đặt tên bảng snake_case số nhiều bằng `@@map`, để SQL viết tay gọn và không lỗi vì hoa thường: `users`, `categories`, `products`, `product_images`, `product_variants`, `carts`, `cart_items`, `vouchers`, `orders`, `order_items`, `stock_movements`. Tên cột giữ nguyên camelCase như tên field (không dùng `@map` cho cột), nên SQL viết tay phải dùng đúng tên đó, ví dụ `totalAmount`.

## 4. Kiểu dữ liệu

| Dữ liệu | Kiểu Prisma | Kiểu MySQL | Ghi chú |
| --- | --- | --- | --- |
| Khóa chính | `Int @default(autoincrement())` | `INT AUTO_INCREMENT` | |
| Tiền (VND) | `Int` | `INT` | Không có số thập phân; tối đa khoảng 2,1 tỷ mỗi giá trị, đủ cho một đơn. Khi cộng doanh thu cả tháng nên ép sang `BIGINT` trong câu truy vấn tổng hợp |
| Chuỗi thường | `String` | `VARCHAR(191)` | Giá trị dài hơn 191 ký tự sẽ không lưu được. Schema hiện để mọi `String` ở mức này, kể cả `Order.shippingAddress`, `Order.note`, `Order.cancelReason`, `Product.imageUrl`, `Voucher.description`; cần dài hơn thì dùng `@db.VarChar(n)` hoặc `@db.Text`. Ngoại lệ: `ProductImage.url` là `VARCHAR(500)`, `ProductVariant.colorHex` là `VARCHAR(7)` |
| Mô tả sản phẩm | `String @db.Text` | `TEXT` | Tối đa 64 KB |
| Thời gian | `DateTime` | `DATETIME(3)` | Lưu UTC, hiển thị GMT+7 ở tầng giao diện |
| Đúng/sai | `Boolean` | `TINYINT(1)` | |
| Trạng thái, vai trò | `enum` | `ENUM(...)` | Thêm giá trị enum mới cần migration |

## 5. Chiến lược xóa dữ liệu

| Bảng | Cách xử lý |
| --- | --- |
| ProductImage | Xóa cứng được: khi sửa sản phẩm có gửi `images`, các dòng cũ bị xóa và tạo lại theo thứ tự mới (id ảnh đổi). Xóa cứng `Product` (không khuyến khích) kéo theo xóa ảnh (`CASCADE`) |
| Product, ProductVariant, User, Voucher | Xóa mềm bằng `isActive = false` (Voucher không xóa cứng vì `Order.voucherId` tham chiếu tới) |
| Order, OrderItem | Không xóa; hủy đơn bằng `status = CANCELLED` |
| Cart, CartItem | Xóa cứng được; có thể dọn giỏ không hoạt động định kỳ |

## 6. Hành vi khóa ngoại

Schema không khai báo `onDelete` và `onUpdate`, nên Prisma dùng mặc định (thể hiện trong migration). **Ngoại lệ duy nhất:** `ProductImage.productId` khai báo `onDelete: Cascade` (ảnh là bảng con thuần túy, không bảng nào tham chiếu tới nó):

| Loại FK | Cột | Hành vi |
| --- | --- | --- |
| Bắt buộc | `Product.categoryId`, `ProductVariant.productId`, `Cart.userId`, `CartItem.cartId`, `CartItem.variantId`, `OrderItem.orderId`, `OrderItem.variantId`, `OrderStatusHistory.orderId`, `PaymentTransaction.orderId`, `StockMovement.variantId`, `StockMovement.createdById` | `ON DELETE RESTRICT`: không xóa được bản ghi đang được tham chiếu |
| Tùy chọn | `Category.parentId`, `Order.userId`, `Order.handledById`, `Order.voucherId`, `OrderStatusHistory.actorId` | `ON DELETE SET NULL`: xóa bản ghi cha thì cột FK của bản ghi con thành NULL |
| Ngoại lệ | `ProductImage.productId` | `ON DELETE CASCADE` |
| Tất cả | mọi FK | `ON UPDATE CASCADE` |

`SET NULL` nghĩa là nếu xóa cứng `User` hoặc `Voucher`, các đơn liên quan sẽ mất liên kết (`userId`, `handledById`, `voucherId` thành NULL) mà không báo lỗi. Vì vậy quy ước của dự án: **không xóa cứng `User`, `Voucher`, `Product`, `Order`**. Vô hiệu hóa `User`, `Voucher`, `Product` bằng `isActive = false`; hủy `Order` bằng `status = CANCELLED` (xem mục 5). `Cart` xóa cứng được nhưng phải xóa các `CartItem` của nó trước (do `RESTRICT`).

## 7. Điểm cần chốt

- Schema `prisma/schema.prisma` đã có `@@index`, `@@unique` và `@@map` đúng như trên.
- Các CHECK ở mục 2 đã nằm trong file migration `init_ecommerce`; migration này chưa được áp vào database.
- Các cột văn bản dài: `Order.shippingAddress`, `Order.note`, `Order.cancelReason` đã nới lên `VARCHAR(500)` (migration `add_order_checkout`); `Product.imageUrl`, `Voucher.description` còn `VARCHAR(191)`.
- Migration `add_order_checkout` (đặt đơn): thêm địa chỉ 3 cấp (nullable), `voucherCode`, `idempotencyKey`, `order_items.colorHex/imageUrl`, bảng `order_status_histories` và `payment_transactions`, giá trị enum mới (`PENDING_PAYMENT`, `FAILED`, `SALE`). Chỉ thêm, không đổi dữ liệu cũ.
- Voucher: giới hạn theo từng khách để V2, cần thêm cột `perUserLimit` ở `vouchers`.
- **Backlog ảnh sản phẩm:**
  - Dọn file ảnh mồ côi trên ổ đĩa: upload chỉ ghi file, khi ảnh bị gỡ khỏi sản phẩm file không bị xóa.
  - Cân nhắc bỏ cột `Product.imageUrl` (deprecated) ở đợt dọn dẹp sau, khi mọi client đã đọc `images`.
  - Upload khi chạy nhiều instance: ổ đĩa local không dùng chung được, cần lưu trữ ngoài (S3, Cloudinary...).
  - Lưu đường dẫn tương đối (vd `/uploads/products/x.webp`) thay vì URL đầy đủ để đổi `APP_PUBLIC_URL` không làm hỏng dữ liệu.
  - `APP_PUBLIC_URL` đang bị giới hạn độ dài theo cột 191 của `imageUrl`; nới được sau khi bỏ cột này.
- Cách lưu yêu cầu hủy/hoàn tiền của đơn đã thanh toán (Staff tạo, Admin duyệt): schema chưa có model hoặc trường cho việc này (chưa phát sinh khi chỉ có COD; làm cùng thanh toán online).
