# API Auth

Viết theo code (`src/auth/`, `src/config/`, `src/common/`). Các ca đăng ký, đăng nhập (đúng/sai/khóa), `/auth/me`,
refresh, logout đã chạy thử tay trên server thật + MySQL và có e2e (`test/auth.e2e-spec.ts`).

- Base URL dev: `http://localhost:3000` (đọc `PORT` từ env, mặc định 3000)
- Content-Type: `application/json`
- CORS: origin `http://localhost:5173`, **bật `credentials`**
- Dạng response thành công/lỗi chung: xem `docs/api/users.md` (mục "Dạng response chung").
- **Chưa bật guard toàn cục**: các endpoint cũ (`/users`...) vẫn gọi được không cần token. Chỉ `GET /auth/me` yêu cầu token.

## Yêu cầu phía frontend

- **Mọi request tới API phải bật `withCredentials: true`** (axios) hoặc `credentials: 'include'` (fetch), nếu không
  trình duyệt không nhận/gửi cookie refresh khi frontend (`:5173`) gọi backend (`:3000`).
- Cookie refresh nằm ở **`path=/auth`**: trình duyệt chỉ gửi nó tới `/auth/*` (đủ cho `/auth/refresh` và `/auth/logout`).
- Lưu `accessToken` trong bộ nhớ (biến/state), **không** lưu `localStorage`; gửi qua header `Authorization: Bearer <accessToken>`.
- Khi API trả 401 với `Phiên đăng nhập đã hết hạn`: gọi `POST /auth/refresh` một lần, được access token mới thì gọi lại request cũ.
  Refresh cũng 401 thì đưa người dùng về trang đăng nhập.
- Nên gọi `POST /auth/refresh` khi tải lại trang để khôi phục phiên (access token không còn trong bộ nhớ).

## Token và cookie

| | Access token | Refresh token |
|---|---|---|
| Thời hạn | 15 phút (`JWT_ACCESS_EXPIRES_IN`) | 7 ngày (`JWT_REFRESH_EXPIRES_IN`) |
| Secret | `JWT_ACCESS_SECRET` | `JWT_REFRESH_SECRET` (khác access) |
| Payload | `{ sub: userId, role }` | `{ sub: userId }` |
| Nơi chứa | Body response; client gửi qua `Authorization: Bearer` | Cookie `refresh_token` |

Cookie `refresh_token`: `HttpOnly`, `SameSite=Lax`, `Path=/auth`, `Secure` chỉ khi `NODE_ENV=production`,
`Expires` = lúc refresh token hết hạn.

- **Stateless + xoay vòng**: mỗi lần `POST /auth/refresh` cấp refresh token mới và ghi đè cookie. Token cũ **vẫn dùng được
  tới khi hết hạn** (server không lưu danh sách để thu hồi).
- Mọi request có token đều được **tải lại user từ DB**: tài khoản bị khóa (`isActive=false`) hoặc bị xóa thì token cũ bị
  từ chối ngay (401), đổi `role` cũng có hiệu lực ngay.
- Thiếu một trong 4 biến `JWT_*` thì app **không khởi động** và báo rõ tên biến thiếu; hai secret trùng nhau cũng bị từ chối.

## Endpoint

| Method | Đường dẫn | Mô tả | Yêu cầu |
|---|---|---|---|
| POST | `/auth/register` | Đăng ký tài khoản CUSTOMER | Không |
| POST | `/auth/login` | Đăng nhập | Không |
| POST | `/auth/refresh` | Đổi cookie refresh lấy access token mới | Cookie `refresh_token` |
| POST | `/auth/logout` | Xóa cookie refresh | Không |
| GET | `/auth/me` | User hiện tại | `Authorization: Bearer` |

### POST /auth/register

Body:

```json
{ "email": "a@gmail.com", "password": "123456", "name": "Nguyen A", "phone": "0900000000" }
```

- Chỉ `email` và `password` bắt buộc. `name` tùy chọn: bỏ trống thì lấy phần trước `@` của email.
- **Không có `role`**: gửi `role` → 400 `Trường role không được phép gửi lên`. Tài khoản luôn là `CUSTOMER`.
- Email được chuẩn hóa (bỏ khoảng trắng, chữ thường) trước khi kiểm tra trùng và lưu.
- Thành công: **201**, `data` là object User (xem `users.md`). **Không tự đăng nhập**, không có token/cookie.
- Lỗi: 400 (validate), 409 `Email này đã được sử dụng`.

### POST /auth/login

Body: `{ "email": "a@gmail.com", "password": "123456" }`

Thành công **200** và set cookie `refresh_token`:

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOi...",
    "user": { "id": 1, "email": "a@gmail.com", "name": "Nguyen A", "phone": null, "avatarUrl": null, "role": "CUSTOMER", "isActive": true, "createdAt": "...", "updatedAt": "..." }
  }
}
```

| Status | Khi nào | `message` |
|---|---|---|
| 400 | Thiếu/sai định dạng body, trường lạ | `Dữ liệu không hợp lệ` (+ `errors`) |
| 401 | Sai mật khẩu **hoặc** email không tồn tại (cùng một câu) | `Email hoặc mật khẩu không đúng` |
| 403 | Mật khẩu đúng nhưng `isActive=false` | `Tài khoản đã bị khóa` |

Thứ tự kiểm tra: tìm user → so mật khẩu (không có user vẫn so với hash giả để thời gian phản hồi không lộ email nào tồn tại)
→ rồi mới kiểm tra khóa. Vì vậy 403 chỉ lộ ra cho người biết đúng mật khẩu. Login không đặt giới hạn độ dài mật khẩu.

### POST /auth/refresh

Không cần body. Đọc cookie `refresh_token`.

- Thành công: **200**, `data: { "accessToken": "..." }` và cookie `refresh_token` mới (xoay vòng).
- 401 `Bạn chưa đăng nhập hoặc phiên đăng nhập không hợp lệ`: thiếu cookie, token sai/giả (kể cả dùng access token làm
  refresh), user không còn tồn tại hoặc bị khóa.
- 401 `Phiên đăng nhập đã hết hạn`: refresh token hết hạn → đăng nhập lại.

### POST /auth/logout

Không cần body, không cần đăng nhập. **200**, `data: { "message": "Đăng xuất thành công" }` và xóa cookie `refresh_token`.
Access token đang cầm vẫn dùng được tới khi hết 15 phút (frontend nên bỏ nó khỏi bộ nhớ); refresh token đã bị trình duyệt
xóa, nhưng bản sao nếu bị lộ vẫn dùng được tới khi hết hạn (chưa thu hồi được, xem `CLAUDE.md` → Việc tồn đọng).

### GET /auth/me

Header `Authorization: Bearer <accessToken>`.

- Thành công: **200**, `data` là object User hiện tại (không có `password`), gồm `avatarUrl` (`string | null`).
  Đổi ảnh đại diện bằng `PATCH /users/me/avatar` (xem `users.md`), rồi gọi lại `/auth/me` sẽ thấy `avatarUrl` mới.
- 401 `Bạn chưa đăng nhập hoặc phiên đăng nhập không hợp lệ` (thiếu/sai token, user bị khóa/xóa) hoặc
  401 `Phiên đăng nhập đã hết hạn` (access token quá 15 phút → gọi `/auth/refresh`).

## Validate

Message tiếng Việt, lỗi theo từng trường trong `errors` (xem `users.md`).

### RegisterDto

| Trường | Bắt buộc | Quy tắc | Message khi sai |
|---|---|---|---|
| `email` | Có | Đúng định dạng email | `Email không đúng định dạng` |
| `password` | Có | Chuỗi, tối thiểu 6 ký tự | `Mật khẩu phải là chuỗi`, `Mật khẩu phải có ít nhất 6 ký tự` |
| `name` | Không | Chuỗi, không rỗng nếu có gửi | `Họ tên phải là chuỗi`, `Họ tên không được để trống` |
| `phone` | Không | Số di động VN như `users.md` | `Số điện thoại không đúng định dạng Việt Nam` |

### LoginDto

| Trường | Bắt buộc | Quy tắc | Message khi sai |
|---|---|---|---|
| `email` | Có | Đúng định dạng email | `Email không đúng định dạng` |
| `password` | Có | Chuỗi, không rỗng (không giới hạn độ dài tối thiểu) | `Mật khẩu phải là chuỗi`, `Mật khẩu không được để trống` |

## Dùng guard cho endpoint khác (backend)

Xem mục "Quy ước Auth" trong `CLAUDE.md`. Tóm tắt:

```ts
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'STAFF')
@Get()
findAll(@CurrentUser() user: AuthUser) { ... }
```

## Tạo ADMIN đầu tiên

Đặt `ADMIN_EMAIL`, `ADMIN_PASSWORD` trong `.env.development` rồi chạy `npx prisma db seed` (production: `.env.production` và `npm run db:seed:prod`). Chạy lại an toàn: email đã có thì bỏ qua,
không ghi đè mật khẩu.
