# Data Models

Schema chốt cho MVP gồm 9 model và 5 enum, viết bằng Prisma. Bốn quyết định lớn: tách `ProductVariant` khỏi `Product`; giữ hàng bằng `reserved`; `OrderItem` lưu snapshot; voucher giảm trên `subtotal` và số tiền giảm được lưu vào `Order.discountAmount`. Staff nhập kho bằng cách cộng trực tiếp vào `ProductVariant.stock`, không lưu lịch sử nhập/xuất kho (để V2).

> Các khối schema dưới đây khớp với `prisma/schema.prisma`. Nếu hai bên lệch nhau, `prisma/schema.prisma` là bản chuẩn.

## Thay đổi so với schema ban đầu

| Hạng mục | Ban đầu | Chốt cho MVP | Lý do |
| --- | --- | --- | --- |
| `Role` | ADMIN, CUSTOMER | Thêm STAFF | Cần vai trò vận hành |
| `User` | Không có trạng thái hoạt động | Thêm `isActive` | Admin khóa được tài khoản |
| Tồn kho | `Product.quantity` | Bỏ; dùng `ProductVariant.stock` và `reserved` | Thời trang tồn theo size và màu |
| Danh mục | Chưa có | Thêm `Category`, `Product.categoryId` | Lọc và phân nhóm sản phẩm |
| Giỏ hàng | Quản lý ở frontend | Thêm `Cart`, `CartItem` cho Customer; Guest lưu ở trình duyệt và gộp khi đăng nhập | Không mất giỏ khi đổi thiết bị |
| `OrderStatus` | 5 giá trị | Thêm PACKING, RETURNED (tổng 7) | Có bước đóng gói và nhánh hoàn hàng |
| `Order` | Thông tin giao hàng, tổng tiền, trạng thái | Thêm mã đơn, phí ship, giảm giá (`voucherId`, `discountAmount`), phương thức và trạng thái thanh toán, mã giao dịch, hạn thanh toán, lý do hủy, `handledById` | Thanh toán online, voucher và xử lý đơn |
| `OrderItem` | Trỏ tới `Product`, snapshot giá | Trỏ tới `ProductVariant`, snapshot thêm tên, SKU, size, màu | Đơn cũ không đổi khi sản phẩm bị sửa |
| `OrderStatusHistory` | Chưa có | Không đưa vào MVP | Không lưu lịch sử đổi trạng thái; `Order.handledById` ghi người phụ trách (Staff hoặc Admin) |
| `InventoryTransaction` | Chưa có | Không đưa vào MVP | Staff nhập kho cộng trực tiếp vào `ProductVariant.stock`; lịch sử kho để V2 |
| Giảm giá | | Thêm `Voucher`, enum `DiscountType`, `Order.voucherId`, `Order.discountAmount` | Voucher thuộc MVP |

## Quan hệ giữa các model

- `Category` → `Product` → `ProductVariant`: danh mục chứa sản phẩm, sản phẩm có nhiều biến thể.
- `User` → `Cart` → `CartItem` → `ProductVariant`: mỗi khách một giỏ.
- `User` → `Order` → `OrderItem` → `ProductVariant`: `Order.userId` để trống với guest checkout.
- `Order` có hai quan hệ tới `User`: `userId` (quan hệ `"OrderCustomer"`, khách đặt đơn) và `handledById` (quan hệ `"OrderHandler"`, người phụ trách (Staff hoặc Admin), gán khi xác nhận đơn, để trống khi chưa xác nhận). Phía `User` là `orders` và `handledOrders`.
- `Voucher` → `Order`: `Order.voucherId` để trống khi đơn không dùng mã.

Giỏ hàng, đơn hàng và giao dịch kho đều trỏ về `ProductVariant`, nên tồn kho luôn tính theo size và màu.

## Prisma schema

### Enum và User

```prisma
enum Role {
  ADMIN
  STAFF
  CUSTOMER
}

enum PaymentMethod {
  COD
  ONLINE
}

enum PaymentStatus {
  UNPAID
  PAID
  REFUNDED
}

enum OrderStatus {
  PENDING     // vừa đặt, chờ xử lý
  CONFIRMED   // Staff đã xác nhận
  PACKING     // đang đóng gói
  SHIPPING    // đã giao cho vận chuyển, đã xuất kho
  COMPLETED   // giao thành công
  CANCELLED   // đã hủy
  RETURNED    // hàng hoàn về
}

enum DiscountType {
  PERCENT   // giảm theo phần trăm của subtotal
  FIXED     // giảm số tiền cố định (VND)
}

model User {
  id            Int      @id @default(autoincrement())
  email         String   @unique
  password      String
  name          String?
  phone         String?
  role          Role     @default(CUSTOMER)
  isActive      Boolean  @default(true)
  cart          Cart?
  orders        Order[]  @relation("OrderCustomer")   // đơn do user này đặt
  handledOrders Order[]  @relation("OrderHandler")    // đơn user này (Staff) phụ trách
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@map("users")
}
```

### Sản phẩm

```prisma
model Category {
  id       Int        @id @default(autoincrement())
  name     String
  slug     String     @unique
  parentId Int?
  parent   Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children Category[] @relation("CategoryTree")
  products Product[]

  @@map("categories")
}

model Product {
  id          Int              @id @default(autoincrement())
  name        String
  slug        String           @unique
  description String?          @db.Text
  price       Int              // giá niêm yết, VND
  imageUrl    String?
  isActive    Boolean          @default(true)
  categoryId  Int
  category    Category         @relation(fields: [categoryId], references: [id])
  variants    ProductVariant[]
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  @@index([categoryId, isActive])
  @@map("products")
}

model ProductVariant {
  id         Int         @id @default(autoincrement())
  productId  Int
  product    Product     @relation(fields: [productId], references: [id])
  sku        String      @unique
  size       String
  color      String
  stock      Int         @default(0)   // tồn thực tế trong kho
  reserved   Int         @default(0)   // đang giữ cho đơn chưa xuất kho
  minStock   Int         @default(0)   // ngưỡng cảnh báo sắp hết
  isActive   Boolean     @default(true)
  cartItems  CartItem[]
  orderItems OrderItem[]

  @@unique([productId, size, color])
  @@map("product_variants")
}
```

### Giỏ hàng

```prisma
model Cart {
  id     Int        @id @default(autoincrement())
  userId Int        @unique
  user   User       @relation(fields: [userId], references: [id])
  items  CartItem[]

  @@map("carts")
}

model CartItem {
  id        Int            @id @default(autoincrement())
  cartId    Int
  cart      Cart           @relation(fields: [cartId], references: [id])
  variantId Int
  variant   ProductVariant @relation(fields: [variantId], references: [id])
  quantity  Int

  @@unique([cartId, variantId])
  @@map("cart_items")
}
```

### Voucher

```prisma
model Voucher {
  id            Int          @id @default(autoincrement())
  code          String       @unique
  description   String?
  discountType  DiscountType
  discountValue Int          // PERCENT: số nguyên phần trăm (10 = 10%); FIXED: số tiền VND
  maxDiscount   Int?         // mức giảm tối đa (VND), chỉ áp dụng cho PERCENT
  minOrderValue Int          @default(0)   // subtotal tối thiểu để áp mã
  usageLimit    Int?         // tổng số lượt dùng; để trống = không giới hạn
  usedCount     Int          @default(0)   // số lượt đã dùng (đơn bị hủy thì trừ lại)
  startsAt      DateTime
  expiresAt     DateTime
  isActive      Boolean      @default(true)
  orders        Order[]
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  @@map("vouchers")
}
```

### Đơn hàng

```prisma
model Order {
  id               Int           @id @default(autoincrement())
  code             String        @unique      // ví dụ DH20260930-0001
  userId           Int?                       // null = guest checkout
  user             User?         @relation("OrderCustomer", fields: [userId], references: [id])
  handledById      Int?                       // Staff phụ trách, gán khi xác nhận đơn
  handledBy        User?         @relation("OrderHandler", fields: [handledById], references: [id])
  customerName     String
  customerPhone    String
  customerEmail    String?
  shippingAddress  String
  note             String?
  subtotal         Int
  shippingFee      Int           @default(0)
  voucherId        Int?                       // null = không dùng voucher
  voucher          Voucher?      @relation(fields: [voucherId], references: [id])
  discountAmount   Int           @default(0)  // số tiền giảm từ voucher, không vượt subtotal
  totalAmount      Int                        // = subtotal + shippingFee - discountAmount
  paymentMethod    PaymentMethod
  paymentStatus    PaymentStatus @default(UNPAID)
  paymentRef       String?                    // mã giao dịch của cổng thanh toán
  paidAt           DateTime?
  paymentExpiresAt DateTime?                  // hạn thanh toán của đơn online
  status           OrderStatus   @default(PENDING)
  cancelReason     String?
  items            OrderItem[]
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  @@index([status, createdAt])
  @@index([customerPhone])
  @@map("orders")
}

model OrderItem {
  id          Int            @id @default(autoincrement())
  orderId     Int
  order       Order          @relation(fields: [orderId], references: [id])
  variantId   Int
  variant     ProductVariant @relation(fields: [variantId], references: [id])
  productName String         // snapshot lúc mua
  sku         String         // snapshot
  size        String         // snapshot
  color       String         // snapshot
  quantity    Int
  price       Int            // snapshot đơn giá lúc mua

  @@map("order_items")
}
```

## Quy tắc tồn kho

Tồn khả dụng của một biến thể bằng `stock - reserved`. Bảng dưới cho thấy mỗi sự kiện tác động thế nào lên hai cột này (n là số lượng của biến thể trong sự kiện). Không có bảng lịch sử: `stock` được cập nhật trực tiếp trên `ProductVariant`; lịch sử nhập/xuất/điều chỉnh kho để V2.

| Sự kiện | `stock` | `reserved` |
| --- | --- | --- |
| Staff nhập kho | +n | 0 |
| Khách đặt đơn | 0 | +n |
| Đơn bị hủy trước SHIPPING | 0 | −n |
| Staff chuyển đơn sang SHIPPING | −n | −n |
| Hàng hoàn về, kiểm đạt | +n | 0 |
| Staff điều chỉnh thủ công | ±n | 0 |

## Quy tắc tiền và voucher

`totalAmount = subtotal + shippingFee - discountAmount`. Chi tiết điều kiện áp mã và cách tính `discountAmount` xem `02-business-flow.md`. Tác động lên `Voucher.usedCount`:

| Sự kiện | `usedCount` |
| --- | --- |
| Khách đặt đơn có dùng voucher | +1 |
| Đơn chuyển CANCELLED (kể cả tự hủy sau 30 phút) | −1 |
| Đơn chuyển RETURNED | 0 |
