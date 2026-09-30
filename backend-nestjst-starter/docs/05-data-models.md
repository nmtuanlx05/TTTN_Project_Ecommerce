# Data Models

Schema chốt cho MVP gồm 10 model và 5 enum, viết bằng Prisma. Bốn quyết định lớn: tách `ProductVariant` khỏi `Product`; giữ hàng bằng `reserved`; `OrderItem` lưu snapshot; mọi biến động kho đi qua `InventoryTransaction`.

> Đây là bản tham khảo. Bản chính thức là `prisma/schema.prisma` sau khi được duyệt.

## Thay đổi so với schema ban đầu

| Hạng mục | Ban đầu | Chốt cho MVP | Lý do |
| --- | --- | --- | --- |
| `Role` | ADMIN, CUSTOMER | Thêm STAFF | Cần vai trò vận hành |
| `User` | Không có trạng thái hoạt động | Thêm `isActive` | Admin khóa được tài khoản |
| Tồn kho | `Product.quantity` | Bỏ; dùng `ProductVariant.stock` và `reserved` | Thời trang tồn theo size và màu |
| Danh mục | Chưa có | Thêm `Category`, `Product.categoryId` | Lọc và phân nhóm sản phẩm |
| Giỏ hàng | Quản lý ở frontend | Thêm `Cart`, `CartItem` cho Customer; Guest lưu ở trình duyệt và gộp khi đăng nhập | Không mất giỏ khi đổi thiết bị |
| `OrderStatus` | 5 giá trị | Thêm PACKING, RETURNED (tổng 7) | Có bước đóng gói và nhánh hoàn hàng |
| `Order` | Thông tin giao hàng, tổng tiền, trạng thái | Thêm mã đơn, phí ship, phương thức và trạng thái thanh toán, mã giao dịch, hạn thanh toán, lý do hủy | Thanh toán online và xử lý đơn |
| `OrderItem` | Trỏ tới `Product`, snapshot giá | Trỏ tới `ProductVariant`, snapshot thêm tên, SKU, size, màu | Đơn cũ không đổi khi sản phẩm bị sửa |
| `OrderStatusHistory` | Chưa có | Model mới | Truy vết ai đổi trạng thái, lúc nào |
| `InventoryTransaction` | Chưa có | Model mới | Staff quản lý nhập, xuất, điều chỉnh kho |
| Giảm giá | | Chưa có `discountAmount` và `Voucher` | Voucher để V2 |

## Quan hệ giữa các model

- `Category` → `Product` → `ProductVariant`: danh mục chứa sản phẩm, sản phẩm có nhiều biến thể.
- `User` → `Cart` → `CartItem` → `ProductVariant`: mỗi khách một giỏ.
- `User` → `Order` → `OrderItem` → `ProductVariant`: `Order.userId` để trống với guest checkout.
- `Order` → `OrderStatusHistory`; `User` (người thao tác) → `OrderStatusHistory`.
- `ProductVariant` → `InventoryTransaction`; `Order` và `User` cùng tham chiếu tới `InventoryTransaction`.

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

enum InventoryType {
  IMPORT   // nhập kho
  EXPORT   // xuất kho theo đơn
  ADJUST   // điều chỉnh, kiểm kê
  RETURN   // hoàn kho
}

model User {
  id            Int                    @id @default(autoincrement())
  email         String                 @unique
  password      String
  name          String?
  phone         String?
  role          Role                   @default(CUSTOMER)
  isActive      Boolean                @default(true)
  cart          Cart?
  orders        Order[]
  statusChanges OrderStatusHistory[]
  inventoryTx   InventoryTransaction[]
  createdAt     DateTime               @default(now())
  updatedAt     DateTime               @updatedAt
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
}

model ProductVariant {
  id          Int                    @id @default(autoincrement())
  productId   Int
  product     Product                @relation(fields: [productId], references: [id])
  sku         String                 @unique
  size        String
  color       String
  stock       Int                    @default(0)   // tồn thực tế trong kho
  reserved    Int                    @default(0)   // đang giữ cho đơn chưa xuất kho
  minStock    Int                    @default(0)   // ngưỡng cảnh báo sắp hết
  isActive    Boolean                @default(true)
  cartItems   CartItem[]
  orderItems  OrderItem[]
  inventoryTx InventoryTransaction[]

  @@unique([productId, size, color])
}
```

### Giỏ hàng

```prisma
model Cart {
  id     Int        @id @default(autoincrement())
  userId Int        @unique
  user   User       @relation(fields: [userId], references: [id])
  items  CartItem[]
}

model CartItem {
  id        Int            @id @default(autoincrement())
  cartId    Int
  cart      Cart           @relation(fields: [cartId], references: [id])
  variantId Int
  variant   ProductVariant @relation(fields: [variantId], references: [id])
  quantity  Int

  @@unique([cartId, variantId])
}
```

### Đơn hàng

```prisma
model Order {
  id               Int                    @id @default(autoincrement())
  code             String                 @unique      // ví dụ DH20260930-0001
  userId           Int?                                // null = guest checkout
  user             User?                  @relation(fields: [userId], references: [id])
  customerName     String
  customerPhone    String
  customerEmail    String?
  shippingAddress  String
  note             String?
  subtotal         Int
  shippingFee      Int                    @default(0)
  totalAmount      Int
  paymentMethod    PaymentMethod
  paymentStatus    PaymentStatus          @default(UNPAID)
  paymentRef       String?                             // mã giao dịch của cổng thanh toán
  paidAt           DateTime?
  paymentExpiresAt DateTime?                           // hạn thanh toán của đơn online
  status           OrderStatus            @default(PENDING)
  cancelReason     String?
  items            OrderItem[]
  history          OrderStatusHistory[]
  inventoryTx      InventoryTransaction[]
  createdAt        DateTime               @default(now())
  updatedAt        DateTime               @updatedAt

  @@index([status, createdAt])
  @@index([userId])
  @@index([customerPhone])
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
}

model OrderStatusHistory {
  id          Int          @id @default(autoincrement())
  orderId     Int
  order       Order        @relation(fields: [orderId], references: [id])
  fromStatus  OrderStatus?
  toStatus    OrderStatus
  note        String?
  changedById Int?                     // null nếu hệ thống tự đổi
  changedBy   User?        @relation(fields: [changedById], references: [id])
  createdAt   DateTime     @default(now())

  @@index([orderId, createdAt])
}
```

### Kho

```prisma
model InventoryTransaction {
  id          Int            @id @default(autoincrement())
  variantId   Int
  variant     ProductVariant @relation(fields: [variantId], references: [id])
  type        InventoryType
  quantity    Int                      // dương = tăng tồn, âm = giảm tồn
  stockAfter  Int                      // tồn sau giao dịch, để đối soát
  reason      String?
  orderId     Int?                     // có khi xuất hoặc hoàn kho theo đơn
  order       Order?         @relation(fields: [orderId], references: [id])
  createdById Int
  createdBy   User           @relation(fields: [createdById], references: [id])
  createdAt   DateTime       @default(now())

  @@index([variantId, createdAt])
}
```

## Quy tắc tồn kho

Tồn khả dụng của một biến thể bằng `stock - reserved`. Bảng dưới cho thấy mỗi sự kiện tác động thế nào lên hai cột này (n là số lượng của biến thể trong sự kiện).

| Sự kiện | `stock` | `reserved` | Ghi `InventoryTransaction` |
| --- | --- | --- | --- |
| Staff nhập kho | +n | 0 | IMPORT |
| Khách đặt đơn | 0 | +n | Không |
| Đơn bị hủy trước SHIPPING | 0 | −n | Không |
| Staff chuyển đơn sang SHIPPING | −n | −n | EXPORT |
| Hàng hoàn về, kiểm đạt | +n | 0 | RETURN |
| Staff điều chỉnh thủ công | ±n | 0 | ADJUST, bắt buộc có lý do |
