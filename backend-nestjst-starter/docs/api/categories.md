# API Categories

Viết theo code (`src/categories/`, `src/common/`, `src/auth/guards/roles.guard.ts`). Phân quyền (401/403), validate, định dạng
response và lỗi đã có e2e với service giả (`test/categories.e2e-spec.ts`). **Logic truy vấn trên database thật (phân trang,
tìm kiếm, trùng tên/slug, xóa danh mục không rỗng) chưa được test tự động**, cần chạy thử tay.

- Base URL dev: `http://localhost:3000` (đọc `PORT` từ env, mặc định 3000)
- Content-Type: `application/json`
- CORS: origin `http://localhost:5173`, bật `credentials`
- Dạng response thành công/lỗi chung: xem `docs/api/users.md` (mục "Dạng response chung").
- Xác thực: header `Authorization: Bearer <accessToken>` (lấy từ `POST /auth/login`, xem `docs/api/auth.md`).
  `JwtAuthGuard` bật toàn cục: endpoint không đánh dấu public mà thiếu token → 401.

## Quyền

| Nhóm | Đường dẫn | Ai gọi được |
|---|---|---|
| Public | `GET /categories` | Mọi người, không cần token |
| Admin (xem, sửa) | `GET /admin/categories`, `GET /admin/categories/:id`, `PATCH /admin/categories/:id` | ADMIN, STAFF |
| Admin (tạo, xóa) | `POST /admin/categories`, `DELETE /admin/categories/:id` | Chỉ ADMIN |

- Không có token (hoặc token sai/hết hạn) → **401**. Có token nhưng role không đủ (CUSTOMER, hoặc STAFF gọi endpoint chỉ ADMIN)
  → **403** `Bạn không có quyền thực hiện thao tác này`.
- Quyền luôn được kiểm tra ở server theo role hiện tại trong DB (đổi role có hiệu lực ngay).

## Đối tượng

Danh mục public (`GET /categories`):

```json
{ "id": 2, "name": "Áo thun", "slug": "ao-thun", "parentId": 1 }
```

- `parentId`: `number | null` (`null` = danh mục gốc). Danh mục phẳng, frontend tự dựng cây theo `parentId`.

Danh mục admin (danh sách và chi tiết):

```json
{
  "id": 2,
  "name": "Áo thun",
  "slug": "ao-thun",
  "parentId": 1,
  "parent": { "id": 1, "name": "Áo" },
  "productCount": 12,
  "childCount": 0
}
```

- `parent`: `{ id, name } | null`. `productCount`: số sản phẩm thuộc danh mục (tính cả sản phẩm đang ẩn).
  `childCount`: số danh mục con trực tiếp.
- Chi tiết (`GET /admin/categories/:id`, và response của POST/PATCH) có thêm `children`:
  `[{ "id": 5, "name": "Áo thun nam", "slug": "ao-thun-nam" }]`, sắp theo tên tăng dần.
- Danh mục **chưa có** `isActive`, `createdAt`, `updatedAt` (theo schema hiện tại).

## Endpoint

| Method | Đường dẫn | Mô tả | Quyền |
|---|---|---|---|
| GET | `/categories` | Toàn bộ danh mục (không phân trang) | Public |
| GET | `/admin/categories` | Danh sách: tìm kiếm, lọc, sắp xếp, phân trang | ADMIN, STAFF |
| GET | `/admin/categories/:id` | Chi tiết | ADMIN, STAFF |
| POST | `/admin/categories` | Tạo | ADMIN |
| PATCH | `/admin/categories/:id` | Sửa `name`, `parentId`, `slug` | ADMIN, STAFF |
| DELETE | `/admin/categories/:id` | Xóa cứng (chỉ khi rỗng) | ADMIN |

`:id` phải là số nguyên; sai (vd `/admin/categories/abc`) → **400** `ID không hợp lệ`.

### GET /categories

- **200**, `data` là mảng danh mục public, sắp theo `name` tăng dần. Không phân trang, không có `meta`.

### GET /admin/categories

Query params (đều tùy chọn):

| Tên | Kiểu | Mặc định | Ràng buộc / ý nghĩa |
|---|---|---|---|
| `q` | chuỗi | — | Tìm gần đúng (chứa) trong `name`, `slug`; bỏ khoảng trắng đầu/cuối. Không phân biệt hoa/thường và dấu tiếng Việt (do collation DB) |
| `parentId` | số nguyên | — | ≥ 1; chỉ lấy danh mục con trực tiếp của danh mục này |
| `sortBy` | enum | `id` | `id`, `name` |
| `order` | enum | `desc` | `asc`, `desc` |
| `page` | số nguyên | 1 | ≥ 1 |
| `limit` | số nguyên | 10 | 1–100 |

- Các điều kiện kết hợp bằng AND; `total` đếm theo cùng điều kiện lọc.
- Mặc định `id` giảm dần (mới tạo trước, vì chưa có `createdAt`).
- Query param không khai báo (vd `foo=1`) → **400**. Trang vượt quá `totalPages` trả `data: []`.
- Chưa có tham số lọc "chỉ danh mục gốc".

Ví dụ `GET /admin/categories?q=ao&sortBy=name&order=asc&page=1&limit=10`:

```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "Áo", "slug": "ao", "parentId": null, "parent": null, "productCount": 0, "childCount": 2 }
  ],
  "meta": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
}
```

### GET /admin/categories/:id

- **200**, `data` là danh mục admin kèm `children`.
- Lỗi: 400 (id sai), 404 `Không tìm thấy danh mục với ID #<id>`.

### POST /admin/categories

Body:

```json
{ "name": "Áo thun", "parentId": 1, "slug": "ao-thun" }
```

- **201**, `data` là danh mục admin kèm `children` (rỗng khi mới tạo).
- Chỉ `name` bắt buộc. `parentId` bỏ trống hoặc `null` = danh mục gốc.
- **Slug**: bỏ trống thì tự sinh từ tên (bỏ dấu tiếng Việt, `đ` → `d`, kebab-case: `Áo Thun Nam` → `ao-thun-nam`).
  Slug tự sinh bị trùng thì thêm hậu tố `-2`, `-3`... Nếu client **tự gửi** `slug` mà trùng → 409.
- **Tên** không được trùng với danh mục khác **cùng cấp** (cùng `parentId`), không phân biệt hoa/thường và dấu
  (vd "Áo" và "Ao" là một). Hai cấp khác nhau được trùng tên.
- Lỗi: 400 (validate; `Danh mục cha với ID #<id> không tồn tại`;
  `Tên danh mục phải chứa ít nhất một chữ cái hoặc chữ số` khi tên chỉ có ký hiệu và không gửi `slug`), 401, 403, 409.

### PATCH /admin/categories/:id

Body (mọi trường tùy chọn): `{ "name": "Áo phông", "parentId": null, "slug": "ao-phong" }`

- **200**, `data` là danh mục sau cập nhật (như GET chi tiết).
- Chỉ `name`, `parentId`, `slug` được sửa; trường khác (vd `id`) → 400.
- `parentId: null` đưa danh mục về gốc; không gửi `parentId` thì giữ nguyên.
- **Đổi tên không tự đổi slug** (giữ URL ổn định). Muốn đổi slug phải gửi `slug` tường minh.
- Không được chọn chính nó hoặc danh mục con/cháu của nó làm danh mục cha → 400
  `Không thể chọn chính danh mục này hoặc danh mục con của nó làm danh mục cha`.
- Lỗi: 400, 401, 403, 404, 409 (trùng tên cùng cấp, trùng slug).

### DELETE /admin/categories/:id

Xóa **cứng** (danh mục không có cờ ẩn/hiện).

- **200**, `data`: `{ "message": "Xóa danh mục thành công" }`.
- Không xóa được khi danh mục còn sản phẩm (kể cả sản phẩm đang ẩn) hoặc còn danh mục con → **409**:
  - `Không thể xóa danh mục đang có <n> sản phẩm. Hãy chuyển sản phẩm sang danh mục khác trước`
  - `Không thể xóa danh mục đang có <n> danh mục con. Hãy xóa hoặc chuyển danh mục con trước`
- Lỗi: 400 (id sai), 401, 403, 404.

## Validate

Mọi message bằng tiếng Việt. Lỗi trả theo từng trường trong `errors`.

### CreateCategoryDto

| Trường | Bắt buộc | Quy tắc | Message khi sai |
|---|---|---|---|
| `name` | Có | Chuỗi, bỏ khoảng trắng hai đầu, không rỗng, tối đa 191 ký tự | `Tên danh mục phải là chuỗi`, `Tên danh mục không được để trống`, `Tên danh mục không được vượt quá 191 ký tự` |
| `parentId` | Không | Số nguyên ≥ 1 hoặc `null` | `parentId phải là số nguyên`, `parentId phải lớn hơn hoặc bằng 1` |
| `slug` | Không | Chuỗi, tối đa 191 ký tự, đúng dạng `^[a-z0-9]+(-[a-z0-9]+)*$` | `Slug phải là chuỗi`, `Slug không được vượt quá 191 ký tự`, `Slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang` |

### UpdateCategoryDto

Chỉ gồm `name`, `parentId`, `slug`, tất cả tùy chọn, giữ quy tắc như bảng trên khi có gửi (`{"name":""}` vẫn bị 400).

### Query GET /admin/categories

| Trường | Message khi sai |
|---|---|
| `q` | `Từ khóa tìm kiếm phải là chuỗi` |
| `parentId` | `parentId phải là số nguyên`, `parentId phải lớn hơn hoặc bằng 1` |
| `sortBy` | `sortBy phải là id hoặc name` |
| `order` | `order phải là asc hoặc desc` |
| `page` | `page phải là số nguyên`, `page phải lớn hơn hoặc bằng 1` |
| `limit` | `limit phải là số nguyên`, `limit phải lớn hơn hoặc bằng 1`, `limit không được vượt quá 100` |

### Trường lạ

`ValidationPipe` bật `whitelist`, `forbidNonWhitelisted`, `transform`: trường thừa trong body hoặc query bị **từ chối 400**,
`errors` có `{ "field": "foo", "message": "Trường foo không được phép gửi lên" }`.

## Response lỗi

| Status | Khi nào |
|---|---|
| 400 | Validate sai; `ID không hợp lệ`; danh mục cha không tồn tại; chọn cha tạo vòng lặp |
| 401 | Thiếu token / token sai: `Bạn chưa đăng nhập hoặc phiên đăng nhập không hợp lệ`; token hết hạn: `Phiên đăng nhập đã hết hạn` |
| 403 | `Bạn không có quyền thực hiện thao tác này` |
| 404 | `Không tìm thấy danh mục với ID #<id>`; đường dẫn không tồn tại |
| 409 | Trùng tên cùng cấp; trùng slug; xóa danh mục còn sản phẩm/danh mục con |
| 500 | Lỗi không lường trước: `Lỗi hệ thống, vui lòng thử lại sau` |

Ví dụ 403:

```json
{ "success": false, "statusCode": 403, "message": "Bạn không có quyền thực hiện thao tác này" }
```

Ví dụ 409 trùng tên:

```json
{ "success": false, "statusCode": 409, "message": "Tên danh mục \"Áo\" đã tồn tại trong cùng cấp" }
```

Ví dụ 409 trùng slug:

```json
{ "success": false, "statusCode": 409, "message": "Slug \"ao-thun\" đã được sử dụng" }
```

### Ánh xạ lỗi Prisma (lớp dự phòng)

Service tự kiểm tra trước; các mã dưới đây chỉ xuất hiện khi hai request chạy đua nhau:

| Mã Prisma | Trả về |
|---|---|
| P2002 (trùng unique) | 409 `Slug hoặc tên danh mục đã tồn tại` (từ service); filter toàn cục ánh xạ `Slug đã được sử dụng` / `Dữ liệu đã tồn tại` |
| P2003 (khóa ngoại) | 409 `Dữ liệu liên quan không hợp lệ hoặc đang được sử dụng` |
| P2025 (không tìm thấy) | 404 `Không tìm thấy dữ liệu` |

Tên danh mục **không có ràng buộc unique ở DB**, nên hai request tạo cùng tên cùng lúc vẫn có thể cùng lọt qua (hiếm).

## Ví dụ curl

```bash
BASE=http://localhost:3000

# Đăng nhập lấy accessToken (thay email/mật khẩu cho từng role)
ADMIN=$(curl -s $BASE/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@gmail.com","password":"<mật khẩu>"}' | jq -r .data.accessToken)
STAFF=$(curl -s $BASE/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"staff@gmail.com","password":"<mật khẩu>"}' | jq -r .data.accessToken)
CUSTOMER=$(curl -s $BASE/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"customer@gmail.com","password":"<mật khẩu>"}' | jq -r .data.accessToken)

# Public: không cần token
curl -s $BASE/categories

# Không token → 401
curl -s -i $BASE/admin/categories

# CUSTOMER → 403
curl -s -i $BASE/admin/categories -H "Authorization: Bearer $CUSTOMER"

# STAFF xem danh sách / chi tiết → 200
curl -s "$BASE/admin/categories?q=ao&sortBy=name&order=asc&page=1&limit=10" -H "Authorization: Bearer $STAFF"
curl -s $BASE/admin/categories/1 -H "Authorization: Bearer $STAFF"

# STAFF sửa → 200
curl -s -X PATCH $BASE/admin/categories/2 -H "Authorization: Bearer $STAFF" \
  -H 'Content-Type: application/json' -d '{"name":"Áo phông"}'

# STAFF tạo / xóa → 403 (chỉ ADMIN)
curl -s -i -X POST $BASE/admin/categories -H "Authorization: Bearer $STAFF" \
  -H 'Content-Type: application/json' -d '{"name":"Quần"}'
curl -s -i -X DELETE $BASE/admin/categories/2 -H "Authorization: Bearer $STAFF"

# ADMIN tạo danh mục gốc, rồi danh mục con → 201
curl -s -X POST $BASE/admin/categories -H "Authorization: Bearer $ADMIN" \
  -H 'Content-Type: application/json' -d '{"name":"Áo"}'
curl -s -X POST $BASE/admin/categories -H "Authorization: Bearer $ADMIN" \
  -H 'Content-Type: application/json' -d '{"name":"Áo thun","parentId":1}'

# ADMIN đưa danh mục về gốc → 200
curl -s -X PATCH $BASE/admin/categories/2 -H "Authorization: Bearer $ADMIN" \
  -H 'Content-Type: application/json' -d '{"parentId":null}'

# ADMIN xóa → 200 nếu rỗng, 409 nếu còn sản phẩm/danh mục con
curl -s -X DELETE $BASE/admin/categories/2 -H "Authorization: Bearer $ADMIN"
```
