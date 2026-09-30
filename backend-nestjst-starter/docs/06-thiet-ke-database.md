# Thiết kế Database

Database gồm 10 bảng với 14 quan hệ khóa ngoại, dành cho MySQL 8 (InnoDB). Quy tắc chung: không xóa cứng dữ liệu tài chính và tồn kho; đơn hàng, giao dịch kho và lịch sử trạng thái chỉ thêm, không sửa hay xóa.

## 1. Quan hệ giữa các bảng

| Quan hệ | Loại | Khóa ngoại | Bắt buộc |
| --- | --- | --- | --- |
| Category → Category (cha) | 1-N | `parentId` | Không |
| Category → Product | 1-N | `categoryId` | Có |
| Product → ProductVariant | 1-N | `productId` | Có |
| User → Cart | 1-1 | `userId` (unique) | Có |
| Cart → CartItem | 1-N | `cartId` | Có |
| ProductVariant → CartItem | 1-N | `variantId` | Có |
| User → Order | 1-N | `userId` | Không (đơn của guest) |
| Order → OrderItem | 1-N | `orderId` | Có |
| ProductVariant → OrderItem | 1-N | `variantId` | Có |
| Order → OrderStatusHistory | 1-N | `orderId` | Có |
| User → OrderStatusHistory | 1-N | `changedById` | Không (hệ thống tự đổi) |
| ProductVariant → InventoryTransaction | 1-N | `variantId` | Có |
| Order → InventoryTransaction | 1-N | `orderId` | Không (nhập kho, điều chỉnh không có đơn) |
| User → InventoryTransaction | 1-N | `createdById` | Có |

Quan hệ nhiều-nhiều giữa Order và ProductVariant được tách thành bảng trung gian `OrderItem` (thêm số lượng, giá), tương tự `CartItem` giữa Cart và ProductVariant.

## 2. Ràng buộc và index theo bảng

| Bảng | Unique | Index cần có | CHECK (thêm bằng SQL) |
| --- | --- | --- | --- |
| User | `email` | — | — |
| Category | `slug` | `parentId` | — |
| Product | `slug` | (`categoryId`, `isActive`) | `price >= 0` |
| ProductVariant | `sku`; (`productId`, `size`, `color`) | — | `stock >= 0`; `reserved >= 0`; `reserved <= stock` |
| Cart | `userId` | — | — |
| CartItem | (`cartId`, `variantId`) | `variantId` | `quantity > 0` |
| Order | `code` | (`status`, `createdAt`); `userId`; `customerPhone` | `totalAmount >= 0` |
| OrderItem | — | `orderId`; `variantId` | `quantity > 0`; `price >= 0` |
| OrderStatusHistory | — | (`orderId`, `createdAt`) | — |
| InventoryTransaction | — | (`variantId`, `createdAt`); `orderId` | — |

InnoDB tự tạo index cho mọi cột khóa ngoại, nên các cột như `orderId` hay `variantId` không cần khai báo thêm. Các index còn lại, ví dụ (`status`, `createdAt`) hay `customerPhone`, cần khai báo bằng `@@index`.

Prisma chưa hỗ trợ CHECK trực tiếp. Tạo migration bằng `prisma migrate dev --create-only`, rồi thêm SQL sau vào file migration trước khi chạy:

```sql
ALTER TABLE product_variants
  ADD CONSTRAINT chk_variant_stock CHECK (stock >= 0),
  ADD CONSTRAINT chk_variant_reserved CHECK (reserved >= 0 AND reserved <= stock);

ALTER TABLE order_items
  ADD CONSTRAINT chk_item_qty CHECK (quantity > 0 AND price >= 0);

ALTER TABLE cart_items
  ADD CONSTRAINT chk_cart_qty CHECK (quantity > 0);
```

MySQL chỉ thực thi CHECK từ bản 8.0.16 trở lên. Các CHECK này là lớp bảo vệ cuối: dù code có lỗi, database vẫn không cho tồn kho âm hoặc giữ nhiều hơn tồn thực tế.

## 3. Đặt tên bảng

Prisma mặc định tạo bảng theo tên model (`ProductVariant`). MySQL trên Linux phân biệt hoa thường ở tên bảng, nên `ProductVariant` và `productvariant` là hai tên khác nhau. Khuyến nghị đặt tên bảng snake_case số nhiều bằng `@@map`, ví dụ `@@map("product_variants")`, để SQL viết tay gọn và không lỗi vì hoa thường.

## 4. Kiểu dữ liệu

| Dữ liệu | Kiểu Prisma | Kiểu MySQL | Ghi chú |
| --- | --- | --- | --- |
| Khóa chính | `Int @default(autoincrement())` | `INT AUTO_INCREMENT` | |
| Tiền (VND) | `Int` | `INT` | Không có số thập phân; tối đa khoảng 2,1 tỷ mỗi giá trị, đủ cho một đơn. Khi cộng doanh thu cả tháng nên ép sang `BIGINT` trong câu truy vấn tổng hợp |
| Chuỗi thường | `String` | `VARCHAR(191)` | `email`, `slug`, `sku` dài hơn 191 ký tự sẽ không lưu được; cần thì dùng `@db.VarChar(255)` |
| Mô tả sản phẩm | `String @db.Text` | `TEXT` | Tối đa 64 KB |
| Thời gian | `DateTime` | `DATETIME(3)` | Lưu UTC, hiển thị GMT+7 ở tầng giao diện |
| Đúng/sai | `Boolean` | `TINYINT(1)` | |
| Trạng thái, vai trò | `enum` | `ENUM(...)` | Thêm giá trị enum mới cần migration |

## 5. Chiến lược xóa dữ liệu

| Bảng | Cách xử lý |
| --- | --- |
| Product, ProductVariant, User | Xóa mềm bằng `isActive = false` |
| Order, OrderItem | Không xóa; hủy đơn bằng `status = CANCELLED` |
| OrderStatusHistory, InventoryTransaction | Chỉ thêm, không sửa, không xóa; sửa sai bằng giao dịch ADJUST mới |
| Cart, CartItem | Xóa cứng được; có thể dọn giỏ không hoạt động định kỳ |

## 6. Điểm cần chốt

- Cập nhật schema thêm `@@index` và `@@map` cho khớp phần này.
- Đồng ý thêm CHECK cho tồn kho bằng migration thủ công.
