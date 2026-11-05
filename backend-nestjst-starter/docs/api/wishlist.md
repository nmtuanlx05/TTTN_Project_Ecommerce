# API Wishlist (Sản phẩm yêu thích)

Viết theo code (`src/wishlist/`, `src/products/products.mapper.ts`, `src/common/`). Phân quyền (401/403), validate, định dạng
response và lỗi có e2e với service giả (`test/wishlist.e2e-spec.ts`); quy tắc thêm/bỏ/trần/`isAvailable` có unit test với Prisma
giả (`src/wishlist/wishlist.service.spec.ts`).

> **Chưa kiểm chứng trên MySQL thật:** khóa dòng `users` (`SELECT ... FOR UPDATE`) trong `POST /wishlist/:productId`, chống vượt
> trần 100 và chống trùng khi hai request đồng thời (UNIQUE + bắt P2002) mới chỉ được bảo vệ bằng thiết kế và test Prisma giả.
> Cần chạy thử tay trên DB dev sau khi áp migration `add_wishlist_items`.

- Base URL dev: `http://localhost:3000`
- Dạng response thành công/lỗi chung: xem `docs/api/users.md` (mục "Dạng response chung").
- Xác thực: header `Authorization: Bearer <accessToken>` (xem `docs/api/auth.md`).

## Quyền

Toàn bộ `/wishlist...` chỉ cho **CUSTOMER** (kiểm ở server theo role hiện tại trong DB). Người dùng luôn lấy từ token, không có
tham số `userId`.

| Tình huống | Kết quả |
| --- | --- |
| Không có token / token sai / hết hạn | **401** |
| ADMIN hoặc STAFF | **403** `Tài khoản quản trị không dùng danh sách yêu thích` |
| Guest | Không có wishlist ở backend; frontend yêu cầu đăng nhập khi bấm tim |

## Quy tắc

- Wishlist theo **sản phẩm**, không theo biến thể. Duy nhất theo (khách, sản phẩm).
- Tối đa **100** sản phẩm mỗi khách (`WISHLIST_MAX_ITEMS`). Thêm sản phẩm mới khi đã đủ → **409** `WISHLIST_FULL`. Thêm lại sản phẩm
  **đã có** khi đang đủ 100 vẫn thành công (`added: false`).
- Chỉ **thêm** được sản phẩm đang bật **và** có ít nhất một biến thể đang bán (cùng điều kiện với trang chi tiết `GET /products/:slug`).
  Không thì **404** `Không tìm thấy sản phẩm` (không có trường `code`).
- Sản phẩm **đã tắt / hết biến thể bán / hết hàng sau khi thêm** vẫn nằm trong wishlist và vẫn hiện ở `GET /wishlist` với
  `isAvailable: false` (và `isListed: false` nếu ngừng kinh doanh), để khách tự bỏ. **Bỏ** (DELETE) luôn được, kể cả sản phẩm đã tắt.
- `POST` và `DELETE` đều **idempotent**: lặp lại không lỗi, không tạo bản trùng.
- Không có trường `isFavorite` trong API sản phẩm công khai: frontend gọi `GET /wishlist/ids` rồi tự ghép để tô tim.

## `GET /wishlist?page=1&limit=12`

Danh sách có phân trang, **mới thêm trước** (`addedAt` giảm dần).

| Query | Kiểu | Mặc định | Giới hạn |
| --- | --- | --- | --- |
| `page` | số nguyên | 1 | ≥ 1 |
| `limit` | số nguyên | 12 | 1–48 |

Query không khai báo (vd `x=1`) hoặc ngoài giới hạn → **400** `Dữ liệu không hợp lệ` kèm `errors`.

Mỗi phần tử là **đúng thẻ sản phẩm của `GET /products`** (xem `docs/api/products.md`) cộng thêm ba trường:

- `addedAt`: thời điểm thêm vào wishlist (ISO 8601, UTC).
- `isListed`: `true` khi sản phẩm đang bật **và** có ít nhất một biến thể đang bán. Đúng điều kiện để trang chi tiết
  `GET /products/:slug` xem được và để `POST /wishlist/:productId` thêm được. `false` = "ngừng kinh doanh": trang chi tiết **404**
  (kể cả sản phẩm bật nhưng mọi biến thể bị ẩn). Không dùng `inStock` để suy ra điều này.
- `isAvailable`: `true` khi sản phẩm đang bật **và** còn hàng (`inStock`). `isAvailable = true` luôn kéo theo `isListed = true`.

Cách hiển thị gợi ý (`inStock` là trường sẵn có của thẻ sản phẩm; nó chỉ tính trên biến thể đang bán, **không** xét sản phẩm bật hay tắt):

| Tình huống | `isListed` | `inStock` | `isAvailable` | Hiển thị gợi ý |
| --- | --- | --- | --- | --- |
| Bình thường | true | true | true | Thẻ bình thường, link tới trang chi tiết, cho thêm vào giỏ |
| Bật nhưng hết hàng | true | false | false | Nhãn "Hết hàng"; **vẫn link tới trang chi tiết** (xem được) |
| Sản phẩm tắt (còn tồn) | false | true | false | Nhãn "Ngừng kinh doanh"; **không link** (chi tiết 404); chỉ cho bỏ khỏi danh sách |
| Bật nhưng mọi biến thể bị ẩn | false | false | false | Như "Ngừng kinh doanh" (chi tiết 404) |
| Tắt và hết hàng | false | false | false | Như "Ngừng kinh doanh" |

Quy tắc ngắn: kiểm `isListed` trước. `false` → "Ngừng kinh doanh", không link. `true` rồi mới xét `isAvailable`: `false` → "Hết hàng".

Thẻ **không có khoảng giá**: chỉ có `price` (giá niêm yết, VND).

Ví dụ `GET /wishlist?page=1&limit=2` (**200**):

```json
{
  "success": true,
  "data": [
    {
      "id": 12,
      "name": "Áo sơ mi Oxford",
      "slug": "ao-so-mi-oxford",
      "price": 450000,
      "imageUrl": "/uploads/products/oxford-1.jpg",
      "secondImageUrl": "/uploads/products/oxford-2.jpg",
      "colors": [
        { "name": "Trắng", "hex": "#FFFFFF" },
        { "name": "Xanh", "hex": "#1E3A8A" }
      ],
      "category": { "id": 2, "name": "Áo sơ mi", "slug": "ao-so-mi" },
      "inStock": true,
      "lowStock": false,
      "addedAt": "2026-11-05T09:30:12.000Z",
      "isListed": true,
      "isAvailable": true
    },
    {
      "id": 7,
      "name": "Quần jeans ống suông",
      "slug": "quan-jeans-ong-suong",
      "price": 590000,
      "imageUrl": "/uploads/products/jeans-1.jpg",
      "secondImageUrl": null,
      "colors": [],
      "category": { "id": 3, "name": "Quần", "slug": "quan" },
      "inStock": false,
      "lowStock": false,
      "addedAt": "2026-10-28T14:02:45.000Z",
      "isListed": false,
      "isAvailable": false
    }
  ],
  "meta": { "page": 1, "limit": 2, "total": 5, "totalPages": 3 }
}
```

Phần tử thứ hai ví dụ cho sản phẩm ngừng kinh doanh (`isListed: false`): vẫn hiện để khách bỏ khỏi danh sách. `colors` là `[]` khi
không còn biến thể đang bán. Sản phẩm **bật nhưng hết hàng** sẽ là `isListed: true, inStock: false, isAvailable: false`.

Wishlist rỗng: `{ "success": true, "data": [], "meta": { "page": 1, "limit": 12, "total": 0, "totalPages": 0 } }`.

## `GET /wishlist/ids`

Mảng `productId` trong wishlist, mới thêm trước, **tối đa 100** (bằng trần wishlist nên luôn đủ; không phân trang). Gồm cả sản phẩm
đã tắt để số đếm khớp `meta.total` của `GET /wishlist`. Dùng để tô sẵn trái tim ở danh sách và trang chi tiết, và đếm ở header.

**200**:

```json
{ "success": true, "data": [12, 7, 3] }
```

Rỗng: `{ "success": true, "data": [] }`.

## `POST /wishlist/:productId`

Thêm sản phẩm vào wishlist. Không có body. `:productId` là số nguyên dương (`Product.id`, **không** phải slug).

Luôn trả **200** (cả lần thêm đầu lẫn khi đã có):

Lần đầu (**200**):

```json
{ "success": true, "data": { "productId": 12, "added": true } }
```

Đã có sẵn trong wishlist (**200**, không tạo bản trùng, không lỗi):

```json
{ "success": true, "data": { "productId": 12, "added": false } }
```

Lỗi:

| Status | Khi nào | Body |
| --- | --- | --- |
| 400 | `:productId` không phải số nguyên | `{ "success": false, "statusCode": 400, "message": "ID không hợp lệ" }` |
| 401 | Chưa đăng nhập | `{ "success": false, "statusCode": 401, "message": "..." }` |
| 403 | ADMIN/STAFF | `{ "success": false, "statusCode": 403, "message": "Tài khoản quản trị không dùng danh sách yêu thích" }` |
| 404 | Sản phẩm không tồn tại, đã tắt, hoặc không còn biến thể đang bán | `{ "success": false, "statusCode": 404, "message": "Không tìm thấy sản phẩm" }` |
| 409 | Đã đủ 100 và sản phẩm này chưa có trong danh sách | `{ "success": false, "statusCode": 409, "message": "Danh sách yêu thích đã đầy (tối đa 100 sản phẩm), hãy bỏ bớt trước khi thêm", "code": "WISHLIST_FULL" }` |
| 409 | Cập nhật đồng thời quá nhiều lần (hiếm) | `{ "success": false, "statusCode": 409, "message": "Danh sách yêu thích đang được cập nhật, vui lòng thử lại" }` (không có `code`) |

## `DELETE /wishlist/:productId`

Bỏ sản phẩm khỏi wishlist, **kể cả sản phẩm đã tắt**. Không có body. Luôn trả **200**, không bao giờ 404 (bỏ cái không có vẫn thành công).

Có trong danh sách (**200**):

```json
{ "success": true, "data": { "productId": 12, "removed": true } }
```

Không có trong danh sách (**200**):

```json
{ "success": true, "data": { "productId": 12, "removed": false } }
```

Lỗi: 400 (`ID không hợp lệ`), 401, 403 như trên.

## Mã lỗi `code`

| `code` | Status | Ý nghĩa |
| --- | --- | --- |
| `WISHLIST_FULL` | 409 | Đã đủ 100 sản phẩm; hãy bỏ bớt rồi thêm lại |

Lỗi 404 sản phẩm hiện **không** có `code` (giống trang chi tiết và giỏ hàng): frontend nhận biết bằng status 404.

## Gợi ý cho frontend

- Khi vào trang/đăng nhập xong: gọi `GET /wishlist/ids` một lần, giữ làm `Set<number>`; tim trên thẻ và trang chi tiết tô theo
  `ids.has(product.id)`. Sau `POST`/`DELETE` thành công cập nhật `Set` và làm mới `GET /wishlist` nếu đang mở.
- `POST`/`DELETE` idempotent nên có thể bấm cập nhật lạc quan, lỗi mạng thì gửi lại an toàn.
- Khách chưa đăng nhập bấm tim: chuyển tới đăng nhập (không gọi API, vì sẽ nhận 401).
