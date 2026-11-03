# API Inventory (Kho)

Viết theo code (`src/inventory/`, `src/common/`, `src/auth/guards/roles.guard.ts`). Phân quyền (401/403), validate, định dạng
response và lỗi có e2e với service giả (`test/inventory.e2e-spec.ts`); quy tắc đổi tồn, xây câu SQL thô và ánh xạ dữ liệu có
unit test với Prisma giả (`src/inventory/*.spec.ts`). **Các câu SQL thô và việc khóa dòng chưa được test tự động trên MySQL
thật**, cần chạy thử tay.

- Base URL dev: `http://localhost:3000` (đọc `PORT` từ env, mặc định 3000)
- Content-Type: `application/json`
- CORS: origin `http://localhost:5173`, bật `credentials`
- Dạng response thành công/lỗi chung: xem `docs/api/users.md` (mục "Dạng response chung").
- Xác thực: header `Authorization: Bearer <accessToken>` (lấy từ `POST /auth/login`, xem `docs/api/auth.md`).

## Quyền

Toàn bộ endpoint `/admin/inventory...` chỉ cho **ADMIN và STAFF** (kiểm ở server theo role hiện tại trong DB).
Không có token (hoặc token sai/hết hạn) → **401**. CUSTOMER → **403** `Bạn không có quyền thực hiện thao tác này`.

## Khái niệm

- Tồn kho tính theo **biến thể** (size × màu). Biến thể mới tạo qua `/admin/products` có `stock = 0`; `stock` chỉ đổi qua
  module này (API sản phẩm không nhận `stock`, `reserved`, `minStock`).
- `stock`: tồn thực tế trong kho. `reserved`: đang giữ cho đơn chưa xuất kho (**chỉ đọc** ở module này, do module đơn hàng quản lý).
- **Tồn khả dụng**: `available = stock - reserved` (tính ra, không có cột trong DB).
- **Trạng thái tồn** (`stockStatus`), theo `available` và `minStock` (`minStock` mặc định 0):

| `stockStatus` | Điều kiện |
|---|---|
| `out` | `available <= 0` |
| `low` | `0 < available <= minStock` |
| `in_stock` | `available > minStock` và `available > 0` (còn lại) |

  Với `minStock = 0` không bao giờ có `low`: còn 1 cái là `in_stock`, hết là `out`.
  Danh sách sản phẩm công khai dựa vào trạng thái `low` này để báo `lowStock` (huy hiệu "Sắp hết"): xem
  `lowStock` trong `docs/api/products.md` (mục "Public: item trong danh sách").

- **Bất biến** (luôn đúng sau mọi thao tác): `stock` là số nguyên, `0 <= reserved <= stock`, `stock <= 2147483647`.
  Thao tác nào làm vỡ bất biến bị từ chối (409 hoặc 400) và **không ghi gì**.

### Quy tắc ẩn (`includeHidden`)

- Mặc định, **danh sách** và **summary** chỉ gồm biến thể đang bán (`isActive = true`) của sản phẩm đang hiện (`isActive = true`).
- `includeHidden=true` thì gồm cả biến thể/sản phẩm đã ẩn (cờ `isHidden` trong item cho biết).
- Nhập, xuất, điều chỉnh, đặt ngưỡng và xem lịch sử **không lọc theo `isActive`**: biến thể hoặc sản phẩm đã ẩn vẫn thao tác
  được khi biết `variantId` (hàng vẫn tồn tại thật trong kho). Chỉ `variantId` không tồn tại mới trả 404.

### Quy ước movement (lịch sử)

Mỗi lần **`stock` thay đổi** (nhập, xuất, điều chỉnh) ghi đúng một dòng `StockMovement` trong **cùng transaction** với việc đổi tồn.
Đặt ngưỡng (`min-stock`) và giữ/nhả chỗ (`reserved`) **không** ghi movement. Movement không bao giờ bị sửa hoặc xóa.

| `type` | `quantity` (có dấu) | `reason` | Khi nào |
|---|---|---|---|
| `IMPORT` | `+n` | `null` | Nhập kho |
| `EXPORT` | `-n` | **Mã** `DAMAGED`, `LOST` hoặc `OTHER` | Xuất kho thủ công |
| `ADJUST` | `số đếm - tồn cũ` (khác 0) | **Chữ tự do** do người dùng nhập | Điều chỉnh theo số đếm thực tế |

- `stockBefore` / `stockAfter`: tồn trước và sau, luôn thỏa `stockAfter = stockBefore + quantity`.
- **Frontend phải ánh xạ mã sang nhãn** khi `type = EXPORT`: `DAMAGED` → "Hư hỏng", `LOST` → "Thất lạc/mất", `OTHER` → "Khác"
  (kèm `note`). Khi `type = ADJUST`, `reason` là chuỗi hiển thị nguyên văn, **không** ánh xạ. Khi `type = IMPORT`, `reason = null`.
- Loại `SALE`, `RETURN` (và cột `orderId`) sẽ được thêm ở bước đơn hàng; frontend nên xử lý `type` lạ bằng cách hiển thị
  nguyên giá trị.

## Đối tượng

Thời gian là chuỗi ISO 8601. Số lượng là số nguyên (JSON number).

### Item tồn kho (`GET /admin/inventory`, và trường `variant` của các thao tác đổi tồn / `min-stock`)

```json
{
  "id": 10,
  "sku": "ATB-S-TRANG",
  "size": "S",
  "color": "Trắng",
  "stock": 20,
  "reserved": 3,
  "minStock": 5,
  "isActive": true,
  "product": {
    "id": 1,
    "name": "Áo thun basic cổ tròn",
    "imageUrl": "https://picsum.photos/seed/ao-thun-basic-co-tron/600/800",
    "isActive": true,
    "category": { "id": 3, "name": "Áo thun" }
  },
  "available": 17,
  "stockStatus": "in_stock",
  "isHidden": false
}
```

- `isHidden = !isActive || !product.isActive`. `product.imageUrl`: `string | null`.

### Movement (`movement` của thao tác đổi tồn, và item của `GET .../movements`)

```json
{
  "id": 55,
  "type": "IMPORT",
  "quantity": 50,
  "stockBefore": 20,
  "stockAfter": 70,
  "reason": null,
  "note": "Nhập đợt 3",
  "createdAt": "2026-10-31T03:00:00.000Z",
  "createdBy": { "id": 2, "name": "Nhân viên A" }
}
```

- `createdBy` chỉ có `id` và `name` (không lộ email hay mật khẩu). `name` có thể `null`: frontend tự hiển thị thay thế.
- `reason`, `note`: `string | null`.

## Endpoint

| Method | Path | Mô tả | Thành công |
|---|---|---|---|
| GET | `/admin/inventory` | Danh sách biến thể, phân trang, lọc, sắp xếp | 200 |
| GET | `/admin/inventory/summary` | Tổng biến thể và số lượng theo trạng thái | 200 |
| POST | `/admin/inventory/:variantId/import` | Nhập kho | **201** |
| POST | `/admin/inventory/:variantId/export` | Xuất kho thủ công | **201** |
| POST | `/admin/inventory/:variantId/adjust` | Điều chỉnh theo số đếm thực tế | **201** |
| PATCH | `/admin/inventory/:variantId/min-stock` | Đặt ngưỡng cảnh báo | 200 |
| GET | `/admin/inventory/:variantId/movements` | Lịch sử đổi tồn, mới nhất trước | 200 |

`:variantId` phải là số nguyên, nếu không → 400 `ID không hợp lệ`.

### GET /admin/inventory

Query (tất cả tùy chọn):

| Tham số | Quy tắc | Mặc định |
|---|---|---|
| `q` | Tìm theo **tên sản phẩm** hoặc **SKU** (chứa chuỗi, không phân biệt hoa/thường và dấu). Tối đa 100 ký tự (sau khi trim). `%` và `_` được hiểu là ký tự thường | — |
| `categoryId` | Số nguyên ≥ 1. **Gồm cả danh mục con/cháu**. Danh mục không tồn tại → danh sách rỗng (`total: 0`), không phải lỗi | — |
| `stockStatus` | `in_stock`, `low` hoặc `out` | — |
| `sortBy` | `name`, `stock` hoặc `available` | `name` |
| `order` | `asc` hoặc `desc` | `asc` |
| `includeHidden` | `true` hoặc `false` | `false` |
| `page` | Số nguyên ≥ 1 | 1 |
| `limit` | Số nguyên 1 đến 100 | 10 |

- Sắp xếp `name`: theo tên sản phẩm, rồi id sản phẩm, rồi id biến thể (các biến thể của một sản phẩm đứng liền nhau). `stock`
  và `available` dùng id biến thể làm khóa phụ. Thứ tự luôn ổn định giữa các trang.
- Response: `{ "success": true, "data": [Item tồn kho], "meta": { "page", "limit", "total", "totalPages" } }`.

### GET /admin/inventory/summary

Query: `categoryId` (như trên, gồm danh mục con), `includeHidden` (như trên). **Không nhận** `q`, `stockStatus`, `sortBy`,
`page`... (gửi lên → 400). Cùng quy tắc ẩn và lọc danh mục với danh sách nên `total` bằng `meta.total` của danh sách khi dùng cùng
tham số.

```json
{ "success": true, "data": { "total": 120, "inStock": 90, "low": 18, "out": 12 } }
```

`total = inStock + low + out`. Danh mục không tồn tại → toàn 0.

### POST /admin/inventory/:variantId/import

Body: `{ "quantity": 50, "note": "Nhập đợt 3" }`

- `quantity`: số nguyên, 1 đến 100000. `note`: tùy chọn, chuỗi tối đa 500 ký tự (rỗng sau trim = không có).
- `stockAfter` không được vượt 2147483647, nếu không → 409.

### POST /admin/inventory/:variantId/export

Body: `{ "quantity": 2, "reason": "DAMAGED", "note": "Rách đường may" }`

- `quantity`: số nguyên, 1 đến 100000. `reason` **bắt buộc**: `DAMAGED`, `LOST` hoặc `OTHER`.
- `note`: tùy chọn, tối đa 500 ký tự; **bắt buộc (không rỗng sau khi trim) khi `reason = OTHER`**.
- Không được xuất vào phần đang giữ: cần `stock - quantity >= reserved` (tức `quantity <= available`), nếu không → 409.

### POST /admin/inventory/:variantId/adjust

Body: `{ "newStock": 14, "reason": "Kiểm kê cuối tháng", "note": "Đếm lại kệ B" }`

- `newStock`: **số đếm thực tế** (số nguyên 0 đến 2147483647), không phải độ chênh. Hệ thống tự tính `quantity = newStock - stock`.
- `reason` **bắt buộc**: chuỗi tự do, 1 đến 191 ký tự sau trim. `note`: tùy chọn, tối đa 500 ký tự.
- `newStock < reserved` → 409. `newStock` bằng tồn hiện tại (độ chênh 0) → 400 và **không ghi movement**.

### Response của import / export / adjust (201)

```json
{
  "success": true,
  "data": {
    "variant": { "…": "Item tồn kho sau khi đổi (stock mới, available mới, stockStatus mới)" },
    "movement": { "…": "Movement vừa ghi" }
  }
}
```

### PATCH /admin/inventory/:variantId/min-stock

Body: `{ "minStock": 5 }` (số nguyên 0 đến 2147483647). Không đổi tồn, **không ghi movement**. Response 200: `data` là Item tồn kho
(có `stockStatus` tính lại theo ngưỡng mới).

### GET /admin/inventory/:variantId/movements

Query: `page` (mặc định 1), `limit` (mặc định 10, tối đa 100). Sắp xếp cố định mới nhất trước (`createdAt` giảm dần, rồi `id`
giảm dần). Biến thể chưa có movement nào trả `data: []` (`total: 0`); `variantId` không tồn tại → 404.

## Đồng thời

Mỗi thao tác đổi tồn chạy trong một transaction, khóa dòng biến thể (`SELECT ... FOR UPDATE`) rồi mới đọc `stock`/`reserved`,
kiểm bất biến, cập nhật và ghi movement. Hai request đồng thời cùng biến thể được xử lý lần lượt: không mất cập nhật, không âm tồn,
mỗi request một movement với `stockBefore`/`stockAfter` nối tiếp nhau.

## Response lỗi

Dạng: `{ "success": false, "statusCode": 400, "message": "…", "errors"?: [{ "field", "message" }] }`.

| Mã | Khi nào | `message` ví dụ |
|---|---|---|
| 400 | Lỗi validate body/query (kể cả trường lạ) | `Dữ liệu không hợp lệ` + `errors` theo từng trường |
| 400 | `:variantId` không phải số nguyên | `ID không hợp lệ` |
| 400 | Điều chỉnh với `newStock` bằng tồn hiện tại | `Số lượng thực tế trùng với tồn hiện tại, không có gì để điều chỉnh` |
| 401 | Thiếu/sai/hết hạn token | |
| 403 | CUSTOMER | `Bạn không có quyền thực hiện thao tác này` |
| 404 | `variantId` không tồn tại (mọi endpoint có `:variantId`) | `Không tìm thấy biến thể với ID #404` |
| 409 | Xuất vượt tồn khả dụng | `Tồn khả dụng không đủ để xuất: khả dụng 2, cần xuất 5` |
| 409 | Điều chỉnh xuống dưới số đang giữ | `Số lượng thực tế (5) không được nhỏ hơn số đang giữ cho đơn hàng (6)` |
| 409 | Nhập làm `stock` vượt giới hạn INT | `Tồn kho sau khi nhập (…) vượt giới hạn cho phép (2147483647)` |
| 500 | Lỗi không lường trước (chi tiết chỉ ghi log server) | `Lỗi hệ thống, vui lòng thử lại sau` |

Ví dụ lỗi validate (`reason = OTHER` thiếu ghi chú):

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Dữ liệu không hợp lệ",
  "errors": [
    { "field": "note", "message": "Xuất kho với lý do \"Khác\" phải có ghi chú" }
  ]
}
```

## Ví dụ curl

```bash
BASE=http://localhost:3000
STAFF=$(curl -s $BASE/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"staff@example.com","password":"123456"}' | jq -r .data.accessToken)
AUTH="Authorization: Bearer $STAFF"

# Danh sách: sắp hết hàng, gồm cả hàng đã ẩn, tìm "50%"
curl -s "$BASE/admin/inventory?stockStatus=low&includeHidden=true&sortBy=available&order=asc" -H "$AUTH"
curl -s -G "$BASE/admin/inventory" --data-urlencode 'q=50%' -H "$AUTH"

# Tóm tắt theo danh mục (gồm danh mục con)
curl -s "$BASE/admin/inventory/summary?categoryId=3" -H "$AUTH"

# Nhập kho 50 cái
curl -s -X POST $BASE/admin/inventory/10/import -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"quantity":50,"note":"Nhập đợt 3"}'

# Xuất hỏng 2 cái
curl -s -X POST $BASE/admin/inventory/10/export -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"quantity":2,"reason":"DAMAGED"}'

# Xuất "Khác" phải có ghi chú
curl -s -X POST $BASE/admin/inventory/10/export -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"quantity":1,"reason":"OTHER","note":"Tặng đối tác"}'

# Điều chỉnh theo số đếm thực tế
curl -s -X POST $BASE/admin/inventory/10/adjust -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"newStock":14,"reason":"Kiểm kê cuối tháng"}'

# Đặt ngưỡng cảnh báo
curl -s -X PATCH $BASE/admin/inventory/10/min-stock -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"minStock":5}'

# Lịch sử
curl -s "$BASE/admin/inventory/10/movements?page=1&limit=20" -H "$AUTH"
```
