# API Orders (Đặt đơn và quản lý đơn)

Viết theo code (`src/orders/`, `src/locations/`, `src/common/`). Có unit test với Prisma giả (`src/orders/*.spec.ts`,
`src/orders/orders.my-orders.spec.ts` cho danh sách/summary/mua lại, `src/inventory/test/inventory.shipout.spec.ts`) và e2e với service giả (`test/orders.e2e-spec.ts`).
**Khóa dòng (`FOR UPDATE`), thứ tự khóa, chống bán vượt tồn và chống dùng quá lượt voucher khi nhiều request chạy đồng thời CHƯA được
chạy thử trên MySQL thật**: chỉ được bảo vệ bằng thiết kế (khóa theo thứ tự cố định + câu UPDATE có điều kiện + kiểm số dòng bị
ảnh hưởng). Cần chạy thử tay.

- Base URL dev: `http://localhost:3000`; `Content-Type: application/json`
- Dạng response thành công/lỗi chung: xem `docs/api/users.md` ("Dạng response chung"). Lỗi mới của module này có thêm trường
  `code` (máy đọc được): `{ "success": false, "statusCode": 409, "message": "...", "code": "CART_EMPTY", "errors"?: [...] }`.
- Xác thực: `Authorization: Bearer <accessToken>` (xem `docs/api/auth.md`).

## Phạm vi bản này

- Chỉ **COD**. `paymentMethod: "ONLINE"` → 400 `PAYMENT_METHOD_NOT_SUPPORTED` "Chưa hỗ trợ thanh toán online". Schema đã chừa chỗ cho
  cổng online (xem "Thiết kế chừa chỗ thanh toán online").
- Đặt đơn **từ giỏ của CUSTOMER**; guest checkout để V2 (`Order.userId` vẫn nullable).
- `COMPLETED` là trạng thái cuối. `RETURNED` (hàng hoàn) **chưa triển khai**, để lần sau.
- Không email, không cổng thanh toán online, quản lý voucher của admin xem `docs/api/vouchers.md` (voucher mẫu vẫn tạo bằng seed).

## Quyền

| Nhóm | Ai | Ghi chú |
| --- | --- | --- |
| `/orders...` | **CUSTOMER** | ADMIN/STAFF → 403 `Tài khoản quản trị không dùng để mua hàng`. Chưa đăng nhập → 401 |
| `/admin/orders...` | **ADMIN, STAFF** | CUSTOMER → 403. ADMIN có mọi quyền của STAFF |

Đơn luôn lọc theo người dùng trong token; đơn của người khác trả **404** `ORDER_NOT_FOUND` như đơn không tồn tại.

## Công thức tiền (tính ở backend, một nơi: `src/orders/orders.pricing.ts`)

```
tạmTính  = Σ (giá hiện tại × số lượng)
giảmGiá  = PERCENT: floor(tạmTính × discountValue / 100), rồi ≤ maxDiscount (nếu có)
           FIXED:   discountValue
           luôn ≤ tạmTính
phíShip  = tạmTính >= 500.000 ? 0 : 30.000      (tính trên tạmTính TRƯỚC giảm giá)
tổng     = tạmTính − giảmGiá + phíShip
```

Hằng số `FREE_SHIPPING_THRESHOLD = 500_000`, `SHIPPING_FEE = 30_000` ở `src/orders/orders.constants.ts` (cùng giá trị với giao diện).
Làm tròn xuống, toàn số nguyên VND. Đơn lưu `subtotal`, `discountAmount`, `voucherCode`, `shippingFee`, `totalAmount` và không tính lại.
Client **không** được gửi giá/tổng/phí (trường thừa → 400).

| tạmTính | Voucher | giảmGiá | phíShip | tổng |
| --- | --- | --- | --- | --- |
| 499.999 | không | 0 | 30.000 | 529.999 |
| 500.000 | không | 0 | 0 | 500.000 |
| 520.000 | FIXED 100.000 | 100.000 | **0** (ngưỡng tính trước giảm) | 420.000 |
| 777.777 | 10%, tối đa 50.000 | 50.000 | 0 | 727.777 |
| 199.001 | 15% | 29.850 (làm tròn xuống) | 30.000 | 199.151 |
| 150.000 | FIXED 200.000 | 150.000 (bị chặn) | 30.000 | 30.000 |
| 500.000 | FIXED 800.000 | 500.000 | 0 | **0** (đơn hợp lệ, tổng bằng 0) |

## Voucher

- Mỗi đơn tối đa một mã; không lưu trong giỏ: client gửi `voucherCode` (tùy chọn) khi xem trước và khi đặt đơn. Mã được `trim`
  và chuẩn hóa chữ hoa; DB so khớp không phân biệt hoa thường.
- Điều kiện (mỗi lỗi một thông báo/mã riêng, xem bảng lỗi): tồn tại; `isActive`; `now >= startsAt`; `now <= expiresAt`;
  `tạmTính >= minOrderValue`; `usageLimit` rỗng hoặc `usedCount < usageLimit`.
- Một mốc `now` của ứng dụng (UTC) dùng cho cả kiểm tra và câu UPDATE. Giờ GMT+7 chỉ để hiển thị.
- Tăng lượt: `UPDATE vouchers SET usedCount = usedCount + 1 WHERE ... AND (usageLimit IS NULL OR usedCount < usageLimit)`, kiểm số
  dòng bị ảnh hưởng; 0 dòng → 400 `VOUCHER_USAGE_LIMIT` và rollback cả đơn.
- Hủy đơn trả lại đúng một lượt (`usedCount - 1`, không xuống dưới 0, chỉ khi đơn có voucher). `COMPLETED` không hoàn lượt.
- **Chưa giới hạn theo từng khách** (V2, cần thêm cột `perUserLimit` ở bảng `vouchers`).
- Không có endpoint xóa voucher; tắt bằng `isActive = false`. FK `orders.voucherId` là `ON DELETE SET NULL` nên xóa cứng sẽ làm đơn mất liên
  kết (đơn vẫn giữ chuỗi `voucherCode`).

## Endpoint của khách

### `GET /vouchers/available`: voucher khả dụng cho trang thanh toán

Chỉ CUSTOMER (ADMIN/STAFF → 403, chưa đăng nhập → 401). Trả voucher đang bật, `startsAt <= now <= expiresAt` (cùng mốc `now` UTC và quy tắc như
lúc đặt đơn) và còn lượt (`usageLimit` rỗng hoặc `usedCount < usageLimit`); sắp `expiresAt` tăng dần rồi `code`; tối đa **20** phần tử. Không lọc theo giá trị
giỏ: voucher chưa đủ `minOrderValue` vẫn được liệt kê để giao diện hiển thị điều kiện (đơn vẫn bị `VOUCHER_MIN_ORDER` nếu không đủ). **Không** trả `id`,
`usageLimit`, `usedCount`. Mã vẫn được kiểm lại đầy đủ khi `preview`/đặt đơn.

```json
{ "success": true, "data": [ { "code": "SALE10", "description": "Giảm 10%, tối đa 50.000đ", "discountType": "PERCENT",
  "discountValue": 10, "maxDiscount": 50000, "minOrderValue": 0, "expiresAt": "2027-06-30T16:59:59.000Z" } ] }
```

### `POST /orders/preview`: xem trước

Chỉ đọc (không khóa, không ghi). Body `{ "voucherCode"?: string }`.

```json
{ "success": true, "data": {
  "items": [ { "id": 5, "variantId": 12, "quantity": 2, "productId": 3, "name": "Áo thun basic", "slug": "ao-thun-basic",
               "imageUrl": "https://example.com/a.jpg", "size": "M", "color": "Đen", "colorHex": "#000000",
               "unitPrice": 200000, "lineTotal": 400000, "purchasable": true, "inStock": true, "maxQuantity": 10 } ],
  "warnings": [ { "cartItemId": 7, "variantId": 20, "message": "Quần jean (30, Xanh) đã hết hàng, vui lòng xóa khỏi giỏ hàng" } ],
  "canCheckout": false,
  "subtotal": 400000, "discountAmount": 40000, "shippingFee": 30000, "totalAmount": 390000,
  "voucher": { "code": "SALE10", "description": "Giảm 10%, tối đa 50.000đ", "discountType": "PERCENT",
               "discountValue": 10, "maxDiscount": 50000, "minOrderValue": 0 } } }
```

- `items[]` là **mọi dòng trong giỏ** (kể cả dòng không đặt được), cùng dạng với `items[]` của `GET /cart` (xem `docs/api/cart.md`):
  `id` (id dòng giỏ), `variantId`, `quantity`, `productId`, `name`, `slug`, `imageUrl` (ảnh đầu, có thể `null`), `size`, `color`,
  `colorHex` (có thể `null`), `unitPrice`, `lineTotal`, `purchasable`, `inStock`, `maxQuantity`. Khác `items[]` của đơn đã đặt (dòng
  chụp lại: `productName`, `sku`, `price`... và **không** có `slug`).
- `subtotal` chỉ tính các dòng đặt được; dòng không đặt được nằm trong `warnings` (`canCheckout = false`).
- Giỏ rỗng → 409 `CART_EMPTY`. Voucher sai → 400 với mã `VOUCHER_*`. Không lộ `stock`/`reserved`.

### `POST /orders`: đặt đơn

Header tùy chọn `Idempotency-Key` (8-64 ký tự `A-Za-z0-9._:-`). Body:

```json
{ "receiverName": "Nguyễn Văn A", "phone": "0912345678",
  "provinceCode": "79", "districtCode": "760", "wardCode": "26734",
  "addressLine": "12 Lê Lợi", "note": "Giao giờ hành chính",
  "paymentMethod": "COD", "voucherCode": "SALE10" }
```

(`79/760/26734` chỉ là ví dụ minh họa; lấy mã thật từ `/locations`.) `note` và `voucherCode` tùy chọn. `wardCode` bắt buộc khi quận/huyện có
phường/xã và **phải bỏ trống** khi không có. Số điện thoại: đúng 10 số, đầu 03/05/07/08/09.

Trong **một transaction**: khóa giỏ → khóa các dòng biến thể theo `variantId` tăng dần → khóa voucher → tăng lượt voucher → giữ chỗ
(`reserved + n` có điều kiện) → tạo `Order` (`PENDING`, COD, `UNPAID`) + `OrderItem` chụp lại + một dòng lịch sử → xóa dòng giỏ đã đặt.
Giỏ không bị tự đổi khi lỗi. Gặp deadlock/write conflict (P2034) thì chạy lại tối đa 3 lần rồi 409 `SYSTEM_BUSY`.

**Chống đặt trùng:** nếu gửi `Idempotency-Key` và đã có đơn của user với key đó thì trả **đúng đơn cũ** (HTTP 201, không giữ chỗ thêm,
không báo giỏ trống). Kiểm sau khi đã khóa giỏ nên hai request song song cùng key chỉ tạo một đơn. Không gửi key: bấm hai lần → lần hai
nhận 409 `CART_EMPTY`.

Response: đối tượng đơn (bên dưới).

### `GET /orders`: đơn của tôi

Query (trường lạ → 400):

| Tham số | Mô tả |
| --- | --- |
| `status` | Một **hoặc nhiều** trạng thái phân tách bằng dấu phẩy, vd `status=CONFIRMED,SHIPPING`. Bỏ khoảng trắng, phần tử rỗng và giá trị lặp. Giá trị ngoài enum → 400 "status chỉ nhận các giá trị: ..." |
| `q` | Khớp **một phần** mã đơn (không phân biệt hoa thường, đã `trim`, tối đa 50 ký tự), chỉ trong đơn của chính khách |
| `page` | ≥ 1, mặc định 1 |
| `limit` | 1-100, mặc định 10 |
| `sortBy`, `order` | `createdAt`\|`totalAmount`, `asc`\|`desc`; mặc định mới nhất trước |

Phân trang `{ data, meta }`. Mỗi phần tử đủ để vẽ thẻ đơn (một truy vấn có include, không N+1; **không** có địa chỉ, SĐT hay trường nội bộ):

```json
{ "id": 12, "code": "MS-261105-ABCD", "status": "PENDING", "paymentMethod": "COD", "paymentStatus": "UNPAID",
  "totalAmount": 420000, "createdAt": "2026-11-05T03:00:00.000Z", "itemCount": 3,
  "items": [ { "productName": "Áo thun basic", "imageUrl": "https://.../a.jpg", "quantity": 2, "size": "M", "color": "Đen" } ] }
```

`itemCount` là **tổng số lượng** các dòng (không phải số dòng). `items[].imageUrl` là ảnh đã chụp lúc đặt, có thể `null`. (Trước đây danh sách
còn trả `subtotal`, `discountAmount`, `shippingFee`, `customerName`... Các trường này đã bỏ; xem chi tiết ở `GET /orders/:code`.)

### `GET /orders/summary`: số đơn theo nhóm

Một truy vấn `groupBy`, chỉ đơn của khách. Dùng cho huy hiệu/tab của trang "Đơn hàng của tôi".

```json
{ "success": true, "data": { "total": 14, "pending": 3, "processing": 4, "completed": 4, "cancelled": 3, "active": 7 } }
```

`pending` = `PENDING` + `PENDING_PAYMENT`; `processing` = `CONFIRMED` + `SHIPPING`; `completed` = `COMPLETED`; `cancelled` = `CANCELLED`;
`active` = `pending + processing`; `total` = mọi đơn (kể cả `RETURNED`, chưa dùng).

### `POST /orders/:code/reorder`: mua lại

Chỉ đơn của chính khách (đơn người khác hoặc không tồn tại → 404 `ORDER_NOT_FOUND`). Đưa các dòng của đơn vào **giỏ** qua `CartService`
(`addManyBestEffort`), cùng quy tắc và cùng cách khóa với `POST /cart/items`: khóa dòng `carts` (`FOR UPDATE`) trong một transaction, gặp P2034 thì
chạy lại tối đa 3 lần. Không tạo đơn, không giữ hàng, **giá lấy theo giá hiện tại** khi xem giỏ. Với mỗi dòng (không dùng giá/tên đã chụp):

- số thêm = `min(số lượng trong đơn, 10 - đang có trong giỏ, (stock - reserved) - đang có trong giỏ)`; cộng dồn vào dòng đã có.
- không thêm được dòng nào cả hoặc phải giảm số lượng → ghi vào `skipped`.

```json
{ "success": true, "data": { "added": 2, "skipped": [
  { "productName": "Quần jean", "size": "30", "color": "Xanh", "reason": "OUT_OF_STOCK", "message": "Quần jean (30, Xanh) đã hết hàng" },
  { "productName": "Áo thun basic", "size": "M", "color": "Đen", "reason": "QUANTITY_REDUCED",
    "message": "Áo thun basic (M, Đen) chỉ thêm được 3/5 sản phẩm do giới hạn tồn kho hoặc số lượng tối đa mỗi sản phẩm trong giỏ" } ] } }
```

`added` là số **dòng** có thêm ít nhất 1 sản phẩm (kể cả khi bị giảm số lượng). `skipped[].reason`:

| `reason` | Ý nghĩa |
| --- | --- |
| `UNAVAILABLE` | Biến thể hoặc sản phẩm đã ẩn/ngừng bán |
| `OUT_OF_STOCK` | Hết hàng (`stock - reserved <= 0`), hoặc giỏ đã có đủ số còn bán được |
| `MAX_QUANTITY_REACHED` | Dòng trong giỏ đã đạt 10, không thêm được nữa |
| `QUANTITY_REDUCED` | Thêm được **một phần** (dòng vẫn được tính vào `added`) |

Không dòng nào thêm được → **409 `REORDER_NOTHING_ADDED`** kèm `errors[]` (`field: "items.<thứ tự dòng trong đơn>"`, `message` như trên).

### `GET /orders/:code`: chi tiết

### `POST /orders/:code/cancel`: khách tự hủy

Body `{ "reason"?: string }` (mặc định "Khách tự hủy"). Chỉ khi `PENDING`; trả lại giữ chỗ và lượt voucher.

Route cố định (`preview`, `summary`) khai báo trước route có `:code`.

## Endpoint quản trị

| Method | Đường dẫn | Mô tả |
| --- | --- | --- |
| GET | `/admin/orders` | Query: `status`, `from`, `to` (`YYYY-MM-DD` theo GMT+7, `to` tính đến hết ngày), `q` (mã đơn / số điện thoại / tên), `page`, `limit`, `sortBy`, `order` |
| GET | `/admin/orders/:id` | Chi tiết kèm `customer`, `handledBy`, `history[].actor` |
| PATCH | `/admin/orders/:id/status` | Body `{ "status": "CONFIRMED", "reason"?: string }`; `reason` bắt buộc khi `CANCELLED` |

## Đối tượng đơn

```json
{ "success": true, "data": {
  "id": 1, "code": "MS-261206-K7QF", "status": "PENDING", "paymentMethod": "COD", "paymentStatus": "UNPAID", "paidAt": null,
  "items": [ { "productName": "Áo thun basic", "sku": "ATB-M-DEN", "size": "M", "color": "Đen", "colorHex": "#000000",
               "imageUrl": "https://.../a.jpg", "quantity": 2, "price": 260000, "lineTotal": 520000 } ],
  "subtotal": 520000, "discountAmount": 100000, "voucherCode": "GIAM50K", "shippingFee": 0, "totalAmount": 420000,
  "shippingAddress": {
    "receiverName": "Nguyễn Văn A", "phone": "0912345678",
    "province": { "code": "79", "name": "Thành phố Hồ Chí Minh" },
    "district": { "code": "760", "name": "Quận 1" },
    "ward": { "code": "26734", "name": "Phường Bến Nghé" },
    "addressLine": "12 Lê Lợi", "fullAddress": "12 Lê Lợi, Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh", "note": null },
  "cancelReason": null,
  "history": [ { "fromStatus": null, "toStatus": "PENDING", "reason": null, "createdAt": "2026-12-06T03:00:00.000Z", "byRole": "CUSTOMER" } ],
  "createdAt": "...", "updatedAt": "..." } }
```

- `ward` là `null` khi quận/huyện không có phường/xã. Đơn cũ (trước khi có 3 cấp) chỉ có `fullAddress`, `province/district/ward` là `null`.
- `OrderItem.imageUrl` chụp đúng `product_images.url` của ảnh đầu tại thời điểm đặt (dự phòng cột `Product.imageUrl` cũ nếu sản phẩm chưa
  có dòng ảnh). Phía khách `history[]` có `byRole` (`CUSTOMER`/`STAFF`/`ADMIN`/`SYSTEM`), **không lộ tên nhân viên**; phía quản trị `history[].actor`
  là `{ id, name, role }`.

## Trạng thái đơn

| Từ | Sang | Ai | `reserved` | `stock` | `usedCount` voucher |
| --- | --- | --- | --- | --- | --- |
| (đặt đơn COD) | `PENDING` | Customer | +n | 0 | +1 nếu có voucher |
| `PENDING` | `CONFIRMED` | Staff, Admin | 0 | 0 | 0; gán `handledById` |
| `CONFIRMED` | `SHIPPING` | Staff, Admin | −n | −n, ghi `StockMovement` loại `SALE` | 0 |
| `SHIPPING` | `COMPLETED` | Staff, Admin | 0 | 0 | 0; COD: `paymentStatus = PAID`, `paidAt` |
| `PENDING` | `CANCELLED` | **Customer**, Staff, Admin | −n | 0 | −1 |
| `CONFIRMED` | `CANCELLED` | Staff, Admin (bắt buộc lý do) | −n | 0 | −1 |

Mọi bước khác → 409 `ORDER_INVALID_TRANSITION`. Đơn đang giao/đã giao không hủy được. Mọi thay đổi trạng thái, tồn kho và voucher nằm
trong cùng một transaction và ghi một dòng `order_status_histories` (ai, khi nào, lý do). Trừ kho thật ở bước `CONFIRMED → SHIPPING`
(hàng chưa rời kho trước đó; đơn `CONFIRMED` chỉ giữ chỗ).
Không còn trạng thái `PACKING` (đã bỏ khỏi enum): `status=PACKING` ở query → 400. Thứ tự khóa luôn: giỏ → đơn → biến thể (id tăng dần) → voucher.

`PENDING_PAYMENT`, `RETURNED` có trong enum nhưng **chưa có bước chuyển nào dẫn tới/đi từ chúng** ở bản này.

## Bảng lỗi (`code`)

| HTTP | `code` | Điều kiện | Thông báo |
| --- | --- | --- | --- |
| 400 | `VOUCHER_NOT_FOUND` | Mã không tồn tại | Mã giảm giá không tồn tại |
| 400 | `VOUCHER_INACTIVE` | `isActive = false` | Mã giảm giá đã bị tắt |
| 400 | `VOUCHER_NOT_STARTED` | `now < startsAt` | Mã giảm giá chưa đến thời gian áp dụng |
| 400 | `VOUCHER_EXPIRED` | `now > expiresAt` | Mã giảm giá đã hết hạn |
| 400 | `VOUCHER_MIN_ORDER` | `tạmTính < minOrderValue` | Đơn hàng cần tối thiểu {số tiền} để dùng mã này |
| 400 | `VOUCHER_USAGE_LIMIT` | Hết lượt (kể cả thua lượt cuối khi đặt) | Mã giảm giá đã hết lượt sử dụng |
| 409 | `CART_EMPTY` | Giỏ rỗng | Giỏ hàng trống, hãy thêm sản phẩm trước khi đặt hàng |
| 409 | `CART_ITEMS_UNAVAILABLE` | Dòng ẩn, hết hàng, vượt hàng còn, hoặc hết hàng lúc giữ chỗ | Liệt kê từng dòng trong `errors[]` (`field: "items.<id dòng giỏ>"`) |
| 400 | `PHONE_INVALID` | Số điện thoại sai (lỗi theo trường, nằm trong `errors[]`) | Số điện thoại phải gồm 10 số, đầu số 03, 05, 07, 08 hoặc 09 |
| 400 | `LOCATION_REQUIRED` | Thiếu `provinceCode`/`districtCode` (trong `errors[]`) | Vui lòng chọn tỉnh/thành phố / quận/huyện |
| 400 | `PROVINCE_NOT_FOUND` | Mã tỉnh không tồn tại | Tỉnh/thành phố không hợp lệ |
| 400 | `DISTRICT_NOT_FOUND` | Mã quận/huyện không tồn tại | Quận/huyện không hợp lệ |
| 400 | `DISTRICT_NOT_IN_PROVINCE` | Quận/huyện không thuộc tỉnh | Quận/huyện không thuộc tỉnh/thành phố đã chọn |
| 400 | `WARD_NOT_FOUND` | Mã phường/xã không tồn tại | Phường/xã không hợp lệ |
| 400 | `WARD_NOT_IN_DISTRICT` | Phường/xã không thuộc quận/huyện | Phường/xã không thuộc quận/huyện đã chọn |
| 400 | `WARD_REQUIRED` | Quận/huyện có phường/xã mà thiếu `wardCode` | Vui lòng chọn phường/xã |
| 400 | `WARD_NOT_ALLOWED` | Quận/huyện không có phường/xã mà gửi `wardCode` | Quận/huyện này không có phường/xã, vui lòng bỏ trống phường/xã |
| 400 | `PAYMENT_METHOD_NOT_SUPPORTED` | `paymentMethod = ONLINE` | Chưa hỗ trợ thanh toán online |
| 400 | `IDEMPOTENCY_KEY_INVALID` | Header sai định dạng | Idempotency-Key phải gồm 8-64 ký tự chữ, số hoặc . _ : - |
| 404 | `ORDER_NOT_FOUND` | Đơn không tồn tại hoặc của người khác | Không tìm thấy đơn hàng |
| 409 | `ORDER_INVALID_TRANSITION` | Chuyển trạng thái sai (kể cả hủy đơn đã hủy) | Không thể chuyển đơn từ "{từ}" sang "{sang}" |
| 409 | `ORDER_NOT_CANCELLABLE_BY_CUSTOMER` | Khách hủy đơn không còn `PENDING` | Đơn hàng đã được xác nhận hoặc đang xử lý, không thể tự hủy. Vui lòng liên hệ cửa hàng |
| 400 | `ORDER_CANCEL_REASON_REQUIRED` | Admin/Staff hủy mà không có lý do | Vui lòng nhập lý do hủy đơn |
| 400 | `INVALID_DATE` / `INVALID_DATE_RANGE` | `from`/`to` sai (vd 2026-02-31) hoặc `from` sau `to` | `from` không phải ngày hợp lệ / `from` không được sau `to` |
| 409 | `REORDER_NOTHING_ADDED` | Mua lại mà không dòng nào thêm được vào giỏ | Không có sản phẩm nào trong đơn này có thể thêm vào giỏ hàng (chi tiết từng dòng trong `errors[]`) |
| 409 | `SYSTEM_BUSY` | P2034 sau 3 lần chạy lại | Hệ thống đang bận, vui lòng thử lại sau ít phút |

Lỗi validate chung (trường thừa, sai kiểu) vẫn là 400 `Dữ liệu không hợp lệ` kèm `errors[]` và **không có** `code` ở cấp trên cùng;
chỉ các ràng buộc `PHONE_INVALID`, `LOCATION_REQUIRED` mang `code` ở từng trường.

## Thiết kế chừa chỗ thanh toán online (chưa làm)

- Schema đã có: `Order.paymentMethod` (`COD`/`ONLINE`), `paymentStatus` (`UNPAID`/`PAID`/`REFUNDED`/`FAILED`), `paymentRef`, `paidAt`,
  `paymentExpiresAt`; `OrderStatus.PENDING_PAYMENT`; bảng `payment_transactions` (`provider`, `providerTxnId`, `amount`, `status`,
  `rawData`, unique `(provider, providerTxnId)` cho callback idempotent). Cổng cụ thể nằm ở cột `provider`, không đổi enum.
- Đơn online sẽ vào `PENDING_PAYMENT` với `paymentExpiresAt = now + 30 phút` (đơn COD không đi qua trạng thái này). Quá hạn: một job định kỳ
  chọn đơn `PENDING_PAYMENT` có `paymentExpiresAt < now` và đi qua **đúng luồng hủy ở trên** (khóa đơn → biến thể → voucher), nên nhả giữ chỗ và trả
  lượt voucher đúng một lần; callback "thành công" đến muộn bị từ chối vì trạng thái đã `CANCELLED`.
