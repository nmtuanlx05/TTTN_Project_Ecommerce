# Thiết kế Database

Database gồm 9 bảng với 11 quan hệ khóa ngoại, dành cho MySQL 8 (InnoDB). Quy tắc chung: không xóa cứng dữ liệu tài chính (đơn hàng, voucher); hủy đơn bằng `status = CANCELLED`, vô hiệu voucher bằng `isActive = false`.

## 1. Quan hệ giữa các bảng

| Quan hệ | Loại | Khóa ngoại | Bắt buộc |
| --- | --- | --- | --- |
| Category → Category (cha) | 1-N | `parentId` | Không |
| Category → Product | 1-N | `categoryId` | Có |
| Product → ProductVariant | 1-N | `productId` | Có |
| User → Cart | 1-1 | `userId` (unique) | Có |
| Cart → CartItem | 1-N | `cartId` | Có |
| ProductVariant → CartItem | 1-N | `variantId` | Có |
| User → Order (khách đặt đơn, quan hệ `OrderCustomer`) | 1-N | `userId` | Không (đơn của guest) |
| User → Order (người phụ trách, quan hệ `OrderHandler`) | 1-N | `handledById` | Không (đơn chưa được xác nhận) |
| Voucher → Order | 1-N | `voucherId` | Không (đơn không dùng voucher) |
| Order → OrderItem | 1-N | `orderId` | Có |
| ProductVariant → OrderItem | 1-N | `variantId` | Có |

Quan hệ nhiều-nhiều giữa Order và ProductVariant được tách thành bảng trung gian `OrderItem` (thêm số lượng, giá), tương tự `CartItem` giữa Cart và ProductVariant.

## 2. Ràng buộc và index theo bảng

| Bảng | Unique | Index khai báo bằng `@@index` |
| --- | --- | --- |
| User | `email` | — |
| Category | `slug` | — |
| Product | `slug` | (`categoryId`, `isActive`) |
| ProductVariant | `sku`; (`productId`, `size`, `color`) | — |
| Cart | `userId` | — |
| CartItem | (`cartId`, `variantId`) | — |
| Voucher | `code` | — |
| Order | `code` | (`status`, `createdAt`); `customerPhone` |
| OrderItem | — | — |

InnoDB tự tạo index cho mọi cột khóa ngoại, nên các cột như `userId`, `handledById`, `voucherId`, `orderId` hay `variantId` không cần khai báo thêm và không được liệt kê ở bảng trên. Các index còn lại, ví dụ (`status`, `createdAt`) hay `customerPhone`, cần khai báo bằng `@@index`.

### CHECK constraint

Prisma chưa hỗ trợ CHECK trực tiếp, nên các CHECK dưới đây được thêm tay vào cuối file `prisma/migrations/20261004165301_init_ecommerce/migration.sql` (tạo bằng `prisma migrate dev --create-only`, chỉnh file rồi mới áp). Tên constraint dạng `chk_<bảng>_<ý nghĩa>`.

| Bảng | Constraint | Điều kiện |
| --- | --- | --- |
| product_variants | `chk_product_variants_stock` | `stock >= 0` |
| product_variants | `chk_product_variants_reserved` | `reserved >= 0 AND reserved <= stock` |
| products | `chk_products_price` | `price >= 0` |
| cart_items | `chk_cart_items_quantity` | `quantity > 0` |
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

MySQL chỉ thực thi CHECK từ bản 8.0.16 trở lên. Các CHECK này là lớp bảo vệ cuối: dù code có lỗi, database vẫn không cho tồn kho âm, giữ nhiều hơn tồn thực tế, giảm giá vượt tổng tiền hàng hoặc dùng voucher quá số lượt cho phép.

## 3. Đặt tên bảng

Prisma mặc định tạo bảng theo tên model (`ProductVariant`). MySQL trên Linux phân biệt hoa thường ở tên bảng, nên `ProductVariant` và `productvariant` là hai tên khác nhau. Schema đặt tên bảng snake_case số nhiều bằng `@@map`, để SQL viết tay gọn và không lỗi vì hoa thường: `users`, `categories`, `products`, `product_variants`, `carts`, `cart_items`, `vouchers`, `orders`, `order_items`. Tên cột giữ nguyên camelCase như tên field (không dùng `@map` cho cột), nên SQL viết tay phải dùng đúng tên đó, ví dụ `totalAmount`.

## 4. Kiểu dữ liệu

| Dữ liệu | Kiểu Prisma | Kiểu MySQL | Ghi chú |
| --- | --- | --- | --- |
| Khóa chính | `Int @default(autoincrement())` | `INT AUTO_INCREMENT` | |
| Tiền (VND) | `Int` | `INT` | Không có số thập phân; tối đa khoảng 2,1 tỷ mỗi giá trị, đủ cho một đơn. Khi cộng doanh thu cả tháng nên ép sang `BIGINT` trong câu truy vấn tổng hợp |
| Chuỗi thường | `String` | `VARCHAR(191)` | Giá trị dài hơn 191 ký tự sẽ không lưu được. Schema hiện để mọi `String` ở mức này, kể cả `Order.shippingAddress`, `Order.note`, `Order.cancelReason`, `Product.imageUrl`, `Voucher.description`; cần dài hơn thì dùng `@db.VarChar(n)` hoặc `@db.Text` |
| Mô tả sản phẩm | `String @db.Text` | `TEXT` | Tối đa 64 KB |
| Thời gian | `DateTime` | `DATETIME(3)` | Lưu UTC, hiển thị GMT+7 ở tầng giao diện |
| Đúng/sai | `Boolean` | `TINYINT(1)` | |
| Trạng thái, vai trò | `enum` | `ENUM(...)` | Thêm giá trị enum mới cần migration |

## 5. Chiến lược xóa dữ liệu

| Bảng | Cách xử lý |
| --- | --- |
| Product, ProductVariant, User, Voucher | Xóa mềm bằng `isActive = false` (Voucher không xóa cứng vì `Order.voucherId` tham chiếu tới) |
| Order, OrderItem | Không xóa; hủy đơn bằng `status = CANCELLED` |
| Cart, CartItem | Xóa cứng được; có thể dọn giỏ không hoạt động định kỳ |

## 6. Hành vi khóa ngoại

Schema không khai báo `onDelete` và `onUpdate`, nên Prisma dùng mặc định (thể hiện trong migration):

| Loại FK | Cột | Hành vi |
| --- | --- | --- |
| Bắt buộc | `Product.categoryId`, `ProductVariant.productId`, `Cart.userId`, `CartItem.cartId`, `CartItem.variantId`, `OrderItem.orderId`, `OrderItem.variantId` | `ON DELETE RESTRICT`: không xóa được bản ghi đang được tham chiếu |
| Tùy chọn | `Category.parentId`, `Order.userId`, `Order.handledById`, `Order.voucherId` | `ON DELETE SET NULL`: xóa bản ghi cha thì cột FK của bản ghi con thành NULL |
| Tất cả | mọi FK | `ON UPDATE CASCADE` |

`SET NULL` nghĩa là nếu xóa cứng `User` hoặc `Voucher`, các đơn liên quan sẽ mất liên kết (`userId`, `handledById`, `voucherId` thành NULL) mà không báo lỗi. Vì vậy quy ước của dự án: **không xóa cứng `User`, `Voucher`, `Product`, `Order`**. Vô hiệu hóa `User`, `Voucher`, `Product` bằng `isActive = false`; hủy `Order` bằng `status = CANCELLED` (xem mục 5). `Cart` xóa cứng được nhưng phải xóa các `CartItem` của nó trước (do `RESTRICT`).

## 7. Điểm cần chốt

- Schema `prisma/schema.prisma` đã có `@@index`, `@@unique` và `@@map` đúng như trên.
- Các CHECK ở mục 2 đã nằm trong file migration `init_ecommerce`; migration này chưa được áp vào database.
- Các cột văn bản dài (`Order.shippingAddress`, `Order.note`, `Order.cancelReason`, `Product.imageUrl`, `Voucher.description`) đang là `VARCHAR(191)`: chốt có đổi sang `@db.VarChar(n)` hoặc `@db.Text` hay không.
- Cách lưu yêu cầu hủy/hoàn tiền của đơn đã thanh toán (Staff tạo, Admin duyệt): schema chưa có model hoặc trường cho việc này.
