# API Users

Viết theo code sau khi sửa (`src/users/`, `src/common/`, `src/app.setup.ts`). Các ví dụ lỗi/response suy ra từ code;
chưa chạy thử trên server có database thật.

- Base URL dev: `http://localhost:3000` (đọc `PORT` từ env, mặc định 3000)
- Content-Type: `application/json`
- CORS: chỉ cho origin `http://localhost:5173`
- **Chưa bật guard cho nhóm `/users`**: Auth đã có (xem `docs/api/auth.md`) nhưng chưa gắn vào các endpoint này, nên vẫn
  gọi được mà không cần token. Hệ quả: hiện ai cũng có thể tạo user với `role = ADMIN` qua `POST /users`. Cần đóng lại ở
  bước phân quyền (chỉ Admin được đặt/đổi `role`).
- Email được chuẩn hóa (bỏ khoảng trắng, chữ thường) trước khi kiểm tra trùng và lưu.

## Dạng response chung

Áp dụng cho mọi endpoint (xem thêm mục "Quy ước API" trong `CLAUDE.md`).

Thành công:

```json
{ "success": true, "data": { } }
```

Thành công có phân trang:

```json
{ "success": true, "data": [ ], "meta": { "page": 1, "limit": 10, "total": 25, "totalPages": 3 } }
```

Lỗi:

```json
{ "success": false, "statusCode": 400, "message": "…", "errors": [{ "field": "email", "message": "…" }] }
```

`errors` chỉ có khi lỗi validate. `message` luôn là **chuỗi** (không còn dạng mảng).

## Đối tượng User

```json
{
  "id": 1,
  "email": "manhtuan@gmail.com",
  "name": "Nguyen Manh Tuan",
  "phone": "0912345678",
  "role": "CUSTOMER",
  "isActive": true,
  "createdAt": "2026-10-06T17:08:50.335Z",
  "updatedAt": "2026-10-07T01:59:16.573Z"
}
```

- `phone`: `string | null`. `name`: `string | null` với dữ liệu cũ; user mới luôn có `name`.
- `role`: `"ADMIN" | "STAFF" | "CUSTOMER"`.
- **`password` không bao giờ có trong response**: service chỉ `select` 8 trường trên, và interceptor toàn cục xóa
  mọi key `password` ở bất kỳ độ sâu nào.

## Endpoint

| Method | Đường dẫn | Mô tả | Quyền |
|---|---|---|---|
| POST | `/users` | Tạo user | Chưa có |
| GET | `/users` | Danh sách: tìm kiếm, lọc, sắp xếp, phân trang | Chưa có |
| GET | `/users/:id` | Chi tiết | Chưa có |
| PATCH | `/users/:id` | Cập nhật `name`, `phone`, `role` | Chưa có |
| PATCH | `/users/:id/status` | Khóa / mở khóa | Chưa có |

**Không có `DELETE /users/:id`**: user không bị xóa cứng, chỉ khóa bằng `isActive = false`
(`DELETE /users/1` trả 404 như mọi đường dẫn không tồn tại).

`:id` phải là số nguyên; sai (vd `/users/abc`) → **400** `ID không hợp lệ`.

### POST /users

Body:

```json
{ "email": "a@gmail.com", "password": "12345678", "name": "Nguyen A", "phone": "0900000000", "role": "STAFF" }
```

- Thành công: **201**, `data` là object User.
- `role` tùy chọn, mặc định `CUSTOMER`. `isActive` luôn `true` khi tạo.
- Lỗi: 400 (validate, kể cả gửi trường lạ), 409 `Email này đã được sử dụng`.

### GET /users

Query params (đều tùy chọn):

| Tên | Kiểu | Mặc định | Ràng buộc / ý nghĩa |
|---|---|---|---|
| `q` | chuỗi | — | Tìm gần đúng (chứa) trong `name`, `email`, `phone`; bỏ khoảng trắng đầu/cuối |
| `role` | enum | — | `ADMIN`, `STAFF` hoặc `CUSTOMER` |
| `isActive` | boolean | — | `true` hoặc `false` (lọc user đang hoạt động / đã khóa) |
| `sortBy` | enum | `createdAt` | `createdAt`, `name`, `email` |
| `order` | enum | `desc` | `asc`, `desc` |
| `page` | số nguyên | 1 | ≥ 1 |
| `limit` | số nguyên | 10 | 1–100 |

- Các điều kiện kết hợp bằng AND; `total` đếm theo cùng điều kiện lọc.
- Mặc định: mới nhất trước (`createdAt` giảm dần).
- Query param không khai báo (vd `foo=1`) → **400** (do `forbidNonWhitelisted`).
- Trang vượt quá `totalPages` trả `data: []`.

Ví dụ `GET /users?q=nguyen&role=STAFF&isActive=true&sortBy=name&order=asc&page=1&limit=10`:

```json
{
  "success": true,
  "data": [ { "id": 7, "email": "nguyen@gmail.com", "name": "Nguyen A", "phone": null, "role": "STAFF", "isActive": true, "createdAt": "2026-10-07T02:22:11.906Z", "updatedAt": "2026-10-07T02:22:11.906Z" } ],
  "meta": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
}
```

### GET /users/:id

- Thành công: **200**, `data` là object User.
- Lỗi: 400 (id sai), 404 `Không tìm thấy người dùng với ID #<id>`.

### PATCH /users/:id

Body (mọi trường tùy chọn): `{ "name": "Tên mới", "phone": "0911111111", "role": "STAFF" }`

- Thành công: **200**, `data` là User sau cập nhật.
- **Chỉ `name`, `phone`, `role` được sửa.** Gửi `email` hoặc `password` → 400 (không bị bỏ qua âm thầm nữa).
- Lỗi: 400, 404.

### PATCH /users/:id/status

Khóa / mở khóa tài khoản (xóa mềm).

Body: `{ "isActive": false }` (khóa) hoặc `{ "isActive": true }` (mở khóa)

- Thành công: **200**, `data` là User sau cập nhật.
- Lỗi: 400 (`isActive` không phải boolean, id sai), 404.
- User bị khóa (`isActive=false`) không đăng nhập được (403) và token đang cầm bị từ chối ngay ở `/auth/*` (xem `auth.md`).

## Validate

Mọi message bằng tiếng Việt. Lỗi trả theo từng trường trong `errors`.

### CreateUserDto

| Trường | Bắt buộc | Quy tắc | Message khi sai |
|---|---|---|---|
| `email` | Có | Đúng định dạng email | `Email không đúng định dạng` |
| `password` | Có | Chuỗi, tối thiểu 6 ký tự | `Mật khẩu phải là chuỗi`, `Mật khẩu phải có ít nhất 6 ký tự` |
| `name` | Có | Chuỗi, không rỗng | `Họ tên phải là chuỗi`, `Họ tên không được để trống` |
| `phone` | Không | Số di động VN: `0xxxxxxxxx` hoặc `+84xxxxxxxxx`, đầu số 3/5/7/8/9 (10 chữ số khi viết dạng `0…`) | `Số điện thoại không đúng định dạng Việt Nam` |
| `role` | Không | `ADMIN`, `STAFF`, `CUSTOMER` | `Vai trò phải là ADMIN, STAFF hoặc CUSTOMER` |

### UpdateUserDto

Chỉ gồm `name`, `phone`, `role`, tất cả tùy chọn, giữ quy tắc như bảng trên khi có gửi
(`{"name":""}` vẫn bị 400). Không có `email`, `password`.

### UpdateUserStatusDto

| Trường | Bắt buộc | Message khi sai |
|---|---|---|
| `isActive` | Có | `isActive phải là true hoặc false` |

### Query GET /users

| Trường | Message khi sai |
|---|---|
| `q` | `Từ khóa tìm kiếm phải là chuỗi` |
| `role` | `Vai trò phải là ADMIN, STAFF hoặc CUSTOMER` |
| `isActive` | `isActive phải là true hoặc false` |
| `sortBy` | `sortBy phải là createdAt, name hoặc email` |
| `order` | `order phải là asc hoặc desc` |
| `page` | `page phải là số nguyên`, `page phải lớn hơn hoặc bằng 1` |
| `limit` | `limit phải là số nguyên`, `limit phải lớn hơn hoặc bằng 1`, `limit không được vượt quá 100` |

### Trường lạ

`ValidationPipe` bật `whitelist`, `forbidNonWhitelisted`, `transform`: trường thừa trong body hoặc query bị
**từ chối 400**, `errors` có `{ "field": "foo", "message": "Trường foo không được phép gửi lên" }`.

## Response lỗi

| Status | Khi nào |
|---|---|
| 400 | Validate sai; `ID không hợp lệ` |
| 404 | `Không tìm thấy người dùng với ID #<id>`; đường dẫn không tồn tại |
| 409 | `Email này đã được sử dụng` (POST); hoặc lỗi unique của Prisma (P2002) |
| 500 | Lỗi không lường trước: `Lỗi hệ thống, vui lòng thử lại sau` |

Ví dụ 400 validate:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Dữ liệu không hợp lệ",
  "errors": [
    { "field": "email", "message": "Email không đúng định dạng" },
    { "field": "password", "message": "Mật khẩu phải có ít nhất 6 ký tự" },
    { "field": "name", "message": "Họ tên phải là chuỗi" }
  ]
}
```

Ví dụ 400 id sai:

```json
{ "success": false, "statusCode": 400, "message": "ID không hợp lệ" }
```

Ví dụ 404:

```json
{ "success": false, "statusCode": 404, "message": "Không tìm thấy người dùng với ID #999999" }
```

Ví dụ 409:

```json
{ "success": false, "statusCode": 409, "message": "Email này đã được sử dụng" }
```

Frontend chỉ cần đọc `success`; khi `false` dùng `message`, và `errors` (nếu có) để hiện lỗi từng ô nhập.

### Ánh xạ lỗi Prisma (lớp dự phòng)

Service đã tự kiểm tra email trùng / id tồn tại; filter toàn cục chỉ là lớp bắt khi hai request chạy đua nhau:

| Mã Prisma | Trả về |
|---|---|
| P2002 (trùng unique) | 409 `Email đã được sử dụng` nếu lỗi nhắc tới email, ngược lại `Dữ liệu đã tồn tại` |
| P2025 (không tìm thấy) | 404 `Không tìm thấy dữ liệu` |

Mọi lỗi khác không lộ tên bảng, câu SQL hay stack; chi tiết chỉ ghi log server.
