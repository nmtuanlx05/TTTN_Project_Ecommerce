# API Users

Viết theo code sau khi sửa (`src/users/`, `src/common/`, `src/app.setup.ts`). Các ví dụ lỗi/response suy ra từ code;
chưa chạy thử trên server có database thật.

- Base URL dev: `http://localhost:3000` (đọc `PORT` từ env, mặc định 3000)
- Content-Type: `application/json`
- CORS: chỉ cho origin `http://localhost:5173`
- **Phân quyền**: mọi endpoint `/users/*` **bắt buộc có token** (`Authorization: Bearer`) và **chỉ ADMIN** được gọi
  (STAFF, CUSTOMER nhận 403; không token nhận 401), trừ `PATCH /users/me/avatar` mở cho mọi role đã đăng nhập (xem mục bên dưới).
  Chỉ ADMIN được đặt hoặc đổi `role`.
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
  "avatarUrl": "http://localhost:3000/uploads/avatars/3f2b8c1e-5d7a-4c0e-9b1a-2e6f4a7d8c90.webp",
  "role": "CUSTOMER",
  "isActive": true,
  "createdAt": "2026-10-06T17:08:50.335Z",
  "updatedAt": "2026-10-07T01:59:16.573Z"
}
```

- `avatarUrl`: `string | null`, URL đầy đủ của ảnh đại diện (dùng thẳng trong `<img src>`); `null` = chưa có ảnh. Đặt/đổi/xóa qua
  `PATCH /users/me/avatar`.
- `phone`: `string | null`. `name`: `string | null` với dữ liệu cũ; user mới luôn có `name`.
- `role`: `"ADMIN" | "STAFF" | "CUSTOMER"`.
- **`password` không bao giờ có trong response**: service chỉ `select` 9 trường trên, và interceptor toàn cục xóa
  mọi key `password` ở bất kỳ độ sâu nào.

## Endpoint

| Method | Đường dẫn | Mô tả | Quyền |
|---|---|---|---|
| POST | `/users` | Tạo user | ADMIN |
| GET | `/users` | Danh sách: tìm kiếm, lọc, sắp xếp, phân trang | ADMIN |
| GET | `/users/:id` | Chi tiết | ADMIN |
| PATCH | `/users/:id` | Cập nhật `name`, `phone`, `role` | ADMIN |
| PATCH | `/users/:id/status` | Khóa / mở khóa | ADMIN |
| PATCH | `/users/me/avatar` | Tự đổi hoặc xóa ảnh đại diện của chính mình | Mọi role đã đăng nhập (ADMIN, STAFF, CUSTOMER) |

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
- Lỗi: 400 (validate, kể cả gửi trường lạ), 401, 403, 409 `Email này đã được sử dụng`.

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
  "data": [ { "id": 7, "email": "nguyen@gmail.com", "name": "Nguyen A", "phone": null, "avatarUrl": null, "role": "STAFF", "isActive": true, "createdAt": "2026-10-07T02:22:11.906Z", "updatedAt": "2026-10-07T02:22:11.906Z" } ],
  "meta": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
}
```

### GET /users/:id

- Thành công: **200**, `data` là object User.
- Lỗi: 400 (id sai), 401, 403, 404 `Không tìm thấy người dùng với ID #<id>`.

### PATCH /users/:id

Body (mọi trường tùy chọn): `{ "name": "Tên mới", "phone": "0911111111", "role": "STAFF" }`

- Thành công: **200**, `data` là User sau cập nhật.
- **Chỉ `name`, `phone`, `role` được sửa.** Gửi `email` hoặc `password` → 400 (không bị bỏ qua âm thầm nữa).
- **Không được tự hạ vai trò**: ADMIN gọi với `id` là chính mình và `role` khác role hiện tại → **403**
  `Bạn không thể tự thay đổi vai trò của chính mình`. Gửi lại đúng `role` hiện tại, hoặc chỉ sửa `name`/`phone` của chính mình thì vẫn được.
  ADMIN vẫn hạ được role của ADMIN khác.
- Lỗi: 400, 401, 403, 404.

### PATCH /users/me/avatar

Người dùng tự đổi hoặc xóa ảnh đại diện **của chính mình**. Header `Authorization: Bearer <accessToken>`.
Mọi role (ADMIN, STAFF, CUSTOMER) đều dùng được. `id` lấy từ token: **không có id trong đường dẫn hay body**, ADMIN cũng không
sửa được avatar của người khác bằng endpoint này.

Luồng: (1) `POST /uploads/avatars` (xem `uploads.md`) → nhận `data.url`; (2) gửi đúng `url` đó vào endpoint này.

Body (bắt buộc đúng một trường):

```json
{ "avatarUrl": "http://localhost:3000/uploads/avatars/3f2b8c1e-5d7a-4c0e-9b1a-2e6f4a7d8c90.webp" }
```

hoặc `{ "avatarUrl": null }` để xóa ảnh đại diện.

- Thành công: **200**, `data` là object User sau cập nhật, **cùng hình dạng với `GET /auth/me`** (có `avatarUrl` mới).
- `avatarUrl` phải là `null` hoặc URL **do chính hệ thống cấp**, khớp toàn chuỗi
  `<APP_PUBLIC_URL>/uploads/avatars/<uuid>.<jpg|png|webp>` (uuid chữ thường, `APP_PUBLIC_URL` xem `uploads.md`). Bị từ chối (400):
  URL ngoài hệ thống, URL thuộc `/uploads/products/`, có `../` hoặc `%2e%2e`, có `?query`/`#hash`/khoảng trắng, chuỗi rỗng `""`,
  dài hơn 191 ký tự, không phải chuỗi, hoặc **thiếu** trường `avatarUrl` (thiếu không được hiểu là xóa; muốn xóa phải gửi `null`).
- **Server chỉ kiểm định dạng URL, không kiểm file có tồn tại**: URL đúng định dạng nhưng chưa từng được upload vẫn được lưu và
  ảnh sẽ hiển thị lỗi (404). Frontend chỉ nên gửi URL vừa nhận từ `POST /uploads/avatars`.
- **Dọn file cũ**: sau khi cập nhật thành công, nếu avatar cũ khác avatar mới (hoặc bị xóa bằng `null`) thì server xóa file cũ trong
  `<UPLOAD_DIR>/avatars/`. Việc này làm hết sức: lỗi khi xóa file chỉ ghi log, **không** làm request thất bại. Không xóa nếu URL
  mới trùng URL cũ, hoặc nếu một user khác đang dùng đúng URL đó.
- Lỗi:

| Status | Khi nào | `message` |
|---|---|---|
| 400 | `avatarUrl` sai (xem trên), trường lạ (vd `id`) | `Dữ liệu không hợp lệ`, kèm `errors: [{ "field": "avatarUrl", "message": "…" }]` |
| 401 | Không token, token sai/hết hạn, user bị khóa | Thông điệp của `JwtAuthGuard` (xem `auth.md`) |

Ví dụ 400 (URL ngoài hệ thống):

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Dữ liệu không hợp lệ",
  "errors": [
    { "field": "avatarUrl", "message": "Đường dẫn ảnh đại diện không hợp lệ, vui lòng tải ảnh lên qua /uploads/avatars rồi dùng URL nhận được" }
  ]
}
```

### PATCH /users/:id/status

Khóa / mở khóa tài khoản (xóa mềm).

Body: `{ "isActive": false }` (khóa) hoặc `{ "isActive": true }` (mở khóa)

- Thành công: **200**, `data` là User sau cập nhật.
- **Không được tự khóa**: ADMIN gửi `isActive: false` cho chính mình → **403** `Bạn không thể tự khóa tài khoản của chính mình`.
  ADMIN vẫn khóa được ADMIN khác; gửi `isActive: true` cho chính mình thì vô hại.
- Lỗi: 400 (`isActive` không phải boolean, id sai), 401, 403, 404.
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

### UpdateAvatarDto (`PATCH /users/me/avatar`)

| Trường | Bắt buộc | Quy tắc | Message khi sai |
|---|---|---|---|
| `avatarUrl` | Có (có thể là `null`) | `null`, hoặc chuỗi không rỗng ≤ 191 ký tự, đúng định dạng URL avatar của hệ thống | `avatarUrl là bắt buộc, gửi chuỗi URL ảnh hoặc null để xóa ảnh`, `avatarUrl không được để trống, gửi null để xóa ảnh`, `Đường dẫn ảnh đại diện không được vượt quá 191 ký tự`, `Đường dẫn ảnh đại diện không hợp lệ, vui lòng tải ảnh lên qua /uploads/avatars rồi dùng URL nhận được` |

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
| 401 | Không token / token sai / hết hạn / user bị khóa |
| 403 | Không đủ quyền: STAFF, CUSTOMER gọi endpoint chỉ dành cho ADMIN (`Bạn không có quyền thực hiện thao tác này`); ADMIN tự hạ role hoặc tự khóa chính mình (xem `PATCH /users/:id`, `/status`) |
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
