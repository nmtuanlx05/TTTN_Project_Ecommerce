# API Cart (Giỏ hàng)

Viết theo code (`src/cart/`, `src/common/`, `src/auth/guards/roles.guard.ts`). Phân quyền (401/403), validate, định dạng
response và lỗi có e2e với service giả (`test/cart.e2e-spec.ts`); quy tắc giỏ và truy vấn có unit test với Prisma giả
(`src/cart/*.spec.ts`). **Khóa dòng giỏ, ràng buộc UNIQUE và tình huống đua (nhiều request đồng thời) chưa được test tự động
trên MySQL thật**, cần chạy thử tay.

- Base URL dev: `http://localhost:3000`
- Content-Type: `application/json`
- Dạng response thành công/lỗi chung: xem `docs/api/users.md` (mục "Dạng response chung").
- Xác thực: header `Authorization: Bearer <accessToken>` (xem `docs/api/auth.md`).

## Quyền

Toàn bộ endpoint `/cart...` chỉ cho **CUSTOMER** (kiểm ở server theo role hiện tại trong DB). Người dùng luôn lấy từ token,
không có tham số `userId`.

- Không có token (hoặc token sai/hết hạn) → **401**.
- ADMIN hoặc STAFF → **403** `Tài khoản quản trị không dùng để mua hàng`.
- Guest không có giỏ ở backend (giỏ tạm ở trình duyệt và gộp khi đăng nhập để V2).

## Quy tắc

- Mỗi Customer một giỏ, tạo khi thêm món đầu tiên. `GET /cart` khi chưa có giỏ trả giỏ rỗng và **không tạo bản ghi**.
- Mỗi dòng giỏ = một biến thể + số lượng; duy nhất theo (giỏ, biến thể).
- Số lượng mỗi dòng từ **1 đến 10** (`MAX_QUANTITY_PER_ITEM`), đồng thời không vượt tồn khả dụng `stock - reserved` tại thời điểm ghi.
- Giỏ **không giữ hàng** (không đổi `reserved`). Tồn có thể thay đổi sau khi thêm; bước đặt đơn kiểm lại.
- Giỏ **không lưu giá**: tên, ảnh, giá đọc từ dữ liệu hiện tại mỗi lần đọc giỏ.
- Thêm biến thể đã có trong giỏ thì **cộng dồn** số lượng (vẫn bị chặn ở 10 và ở hàng còn).
- Dòng đã nằm trong giỏ mà sau đó hết hàng hoặc bị ẩn vẫn hiện kèm cờ trạng thái; hệ thống không tự xóa hay đổi số lượng khi đọc.
- Các thao tác ghi của cùng một người dùng chạy lần lượt (khóa dòng giỏ trong transaction), nên nhiều request đồng thời không thể
  cộng dồn vượt 10.

## Đối tượng giỏ (response của mọi endpoint)

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 5,
        "variantId": 12,
        "quantity": 2,
        "productId": 3,
        "name": "Áo thun basic",
        "slug": "ao-thun-basic",
        "imageUrl": "https://example.com/a.jpg",
        "size": "M",
        "color": "Đen",
        "colorHex": "#000000",
        "unitPrice": 199000,
        "lineTotal": 398000,
        "purchasable": true,
        "inStock": true,
        "maxQuantity": 10
      }
    ],
    "subtotal": 398000,
    "itemCount": 2,
    "unavailableCount": 0
  }
}
```

| Trường | Ý nghĩa |
|---|---|
| `id` | Id **dòng giỏ** (dùng cho `PATCH`/`DELETE /cart/items/:id`), khác `variantId` |
| `imageUrl` | Ảnh đầu của sản phẩm (theo `sortOrder`); dự phòng cột `imageUrl` cũ; có thể `null` |
| `colorHex` | `#RRGGBB` in hoa hoặc `null` |
| `unitPrice` | Giá hiện tại của sản phẩm (VND, số nguyên) |
| `lineTotal` | `unitPrice * quantity`, hiện ở **mọi** dòng kể cả dòng không mua được |
| `purchasable` | Biến thể đang bán **và** sản phẩm đang hiện |
| `inStock` | `stock - reserved > 0` |
| `maxQuantity` | `purchasable` ? `min(10, stock - reserved)` : `0`. **Chỉ dùng cho ô chọn số lượng**; chặn ở 10 nên không lộ tồn kho khi còn nhiều. Không trả `stock`/`reserved` |
| `subtotal` | Tổng `lineTotal` của các dòng **mua được** (`purchasable && inStock`) |
| `itemCount` | Tổng `quantity` của các dòng **mua được** |
| `unavailableCount` | Số dòng không mua được (không `purchasable` hoặc hết hàng), để giao diện cảnh báo |

Dòng có `quantity > maxQuantity` (tồn giảm sau khi thêm) vẫn giữ nguyên số lượng; giao diện tự so sánh để cảnh báo.
Thứ tự dòng: theo thứ tự thêm vào (`id` tăng dần).

## Endpoint

### `GET /cart`
Trả giỏ hiện tại (giỏ rỗng: `items: []`, các số bằng 0). → **200**.

### `POST /cart/items`
Thêm hoặc cộng dồn, trả giỏ đã cập nhật. → **201**.
```json
{ "variantId": 12, "quantity": 2 }
```
`variantId`: số nguyên ≥ 1. `quantity`: số nguyên từ 1 đến 10 (số lượng **thêm**, không phải tổng).

### `PATCH /cart/items/:id`
Đặt số lượng tuyệt đối của dòng, trả giỏ. → **200**.
```json
{ "quantity": 3 }
```
Áp dụng cùng giới hạn như thêm mới: dòng đã bị ẩn hoặc hết hàng không sửa được (409), chỉ xóa được.

### `DELETE /cart/items/:id`
Xóa một dòng, trả giỏ. → **200**.

### `DELETE /cart`
Xóa mọi dòng (giữ bản ghi giỏ), trả giỏ rỗng. → **200**.

## Lỗi

| Mã | Điều kiện | Thông báo |
|---|---|---|
| 401 | Chưa đăng nhập hoặc token sai | (từ `JwtAuthGuard`) |
| 403 | Role ADMIN hoặc STAFF | `Tài khoản quản trị không dùng để mua hàng` |
| 400 | Body sai (thiếu, không phải số nguyên, `quantity` ngoài 1..10, trường thừa như `userId`) | `Dữ liệu không hợp lệ` + `errors[]`, ví dụ `Số lượng phải từ 1 đến 10` |
| 400 | `:id` không phải số | `ID không hợp lệ` |
| 404 | `variantId` không tồn tại | `Không tìm thấy sản phẩm` |
| 404 | Dòng không tồn tại **hoặc thuộc giỏ người khác** (không phân biệt, để không lộ) | `Không tìm thấy sản phẩm trong giỏ hàng` |
| 409 | Biến thể hoặc sản phẩm đã ẩn | `Sản phẩm này hiện không còn được bán` |
| 409 | `stock - reserved <= 0` | `Sản phẩm đã hết hàng` |
| 409 | Số lượng sau khi ghi > 10 | `Mỗi sản phẩm chỉ mua tối đa 10 trong một giỏ hàng (trong giỏ đã có {n})` |
| 409 | Số lượng sau khi ghi > tồn còn bán | `Chỉ còn {k} sản phẩm có thể mua` |
| 409 | Xung đột ghi đồng thời không tự giải quyết được (deadlock sau 3 lần thử, hoặc UNIQUE) | `Giỏ hàng đang được cập nhật, vui lòng thử lại` |

Thứ tự kiểm tra khi thêm/sửa: tồn tại → còn bán → hết hàng → tối đa 10 → vượt hàng còn.

## Đọc thêm

- Tồn khả dụng và `getStockStatus`: `docs/api/inventory.md`.
- Đơn hàng (chưa làm) sẽ kiểm lại tồn, giá, trạng thái bán trong transaction và chụp giá vào `OrderItem`.
