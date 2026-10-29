# API Uploads

Viết theo code (`src/uploads/`). Phân quyền, giới hạn dung lượng, kiểm chữ ký file, mã lỗi và việc phục vụ file tĩnh có e2e với
Multer, ServeStatic và ổ đĩa thật (thư mục tạm, không DB): `test/uploads.e2e-spec.ts`. Nhận diện loại ảnh, đặt tên file, `deleteByUrl`
và cấu hình env có unit test (`src/uploads/*.spec.ts`, `src/config/env.validation.spec.ts`).

Module này **chỉ nhận và lưu file, trả về URL**. Việc gắn URL vào dữ liệu (ví dụ `imageUrl` của sản phẩm) do endpoint khác làm:
frontend upload trước, lấy `url`, rồi gửi `url` đó khi tạo/sửa sản phẩm.

**Luồng đổi avatar**: (1) `POST /uploads/avatars` với file → nhận `data.url`; (2) `PATCH /users/me/avatar` với body
`{ "avatarUrl": "<url vừa nhận>" }` (xem `users.md`) → server lưu vào `User.avatarUrl` và xóa file avatar cũ. Bước 1 một mình
**chưa** đổi avatar: file chỉ nằm trên đĩa cho tới khi bước 2 gắn nó vào user. Muốn xóa ảnh: `PATCH /users/me/avatar` với `{ "avatarUrl": null }`.

- Base URL dev: `http://localhost:3000` (đọc `PORT` từ env, mặc định 3000)
- Content-Type: `multipart/form-data`
- Dạng response thành công/lỗi chung: xem `docs/api/users.md` (mục "Dạng response chung").
- Xác thực: header `Authorization: Bearer <accessToken>` (lấy từ `POST /auth/login`, xem `docs/api/auth.md`).

## Endpoint

| Endpoint | Ai gọi được | Dung lượng tối đa | Thư mục lưu |
|---|---|---|---|
| `POST /uploads/products` | ADMIN, STAFF | 5 MB | `<UPLOAD_DIR>/products/` |
| `POST /uploads/avatars` | Mọi người đã đăng nhập (ADMIN, STAFF, CUSTOMER) | 2 MB | `<UPLOAD_DIR>/avatars/` |
| `GET /uploads/<loại>/<tên file>` | Mọi người, **không cần token** | - | - |

### Quy tắc gửi file (frontend phải theo)

- Gửi **đúng một trường multipart tên `file`**, **không kèm bất kỳ trường text nào khác** (server cấu hình `fields: 0`: có trường
  text, dù chỉ một, là bị từ chối 400). Muốn gửi thêm thông tin thì dùng request khác.
- **Một file mỗi request.** Gửi nhiều file hoặc sai tên trường → 400.
- Chỉ nhận **JPEG, PNG, WebP**. Server kiểm **nội dung thật** (chữ ký byte đầu file), không tin đuôi file hay `Content-Type` do client khai.
  Đổi đuôi `.txt` thành `.png` vẫn bị từ chối. Không nhận GIF, SVG, PDF.
- Không resize, không nén: ảnh được lưu nguyên bản.
- Tên file gốc **bị bỏ qua**; server tự đặt tên `<uuid>.<jpg|png|webp>` theo loại ảnh đã xác thực.

### Thành công (201)

```json
{
  "success": true,
  "data": { "url": "http://localhost:3000/uploads/products/3f2b8c1e-5d7a-4c0e-9b1a-2e6f4a7d8c90.webp" }
}
```

- `url` là URL **đầy đủ**: `<APP_PUBLIC_URL>/uploads/<loại>/<uuid>.<ext>`, dùng trực tiếp trong `<img src>`.
- `url` luôn **≤ 191 ký tự** (vừa cột `Product.imageUrl` VARCHAR(191)): server kiểm độ dài `APP_PUBLIC_URL` (tối đa 132 ký tự) khi khởi động.
  Với mặc định `http://localhost:3000`, URL dài 80 ký tự.
- Lưu **nguyên chuỗi `url`** vào `imageUrl` khi tạo/sửa sản phẩm (xem `docs/api/products.md`).

## Response lỗi

Dạng chung `{ "success": false, "statusCode": ..., "message": "..." }`.

| Tình huống | Mã | `message` |
|---|---|---|
| Không token, token sai hoặc hết hạn | 401 | Thông điệp của `JwtAuthGuard` (xem `docs/api/auth.md`) |
| CUSTOMER gọi `POST /uploads/products` | 403 | `Bạn không có quyền thực hiện thao tác này` |
| Không có file | 400 | `Vui lòng chọn file ảnh (trường "file")` |
| Sai tên trường, gửi nhiều file, hoặc có trường text kèm theo | 400 | `Chỉ được gửi đúng 1 file ở trường "file", không kèm trường khác` |
| Vượt dung lượng | 413 | `File vượt quá dung lượng cho phép (tối đa 5 MB)` (avatars: `2 MB`) |
| Không phải JPEG/PNG/WebP, hoặc nội dung không khớp (file giả mạo) | 415 | `Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP` |

- "Tối đa 5 MB" nghĩa là file **đúng 5 MB (5 × 1024 × 1024 byte) vẫn được nhận**, lớn hơn 1 byte là 413.
- 401/403 được kiểm **trước** khi nhận file nên request bị từ chối không ghi gì lên ổ đĩa.
- File bị từ chối (413, 415, 400) không được lưu lại.

## Cách frontend dùng

```ts
// Upload ảnh sản phẩm rồi dùng url khi tạo/sửa sản phẩm
const form = new FormData();
form.append('file', fileInput.files[0]); // chỉ đúng một trường "file", không append gì khác
const res = await fetch(`${API_URL}/uploads/products`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${accessToken}` }, // KHÔNG tự đặt Content-Type, trình duyệt tự thêm boundary
  body: form,
});
const { data } = await res.json(); // data.url
// -> gửi data.url vào imageUrl của POST/PATCH /admin/products
```

- Hiển thị ảnh bằng thẻ `<img src={url}>`; ảnh xem được từ origin khác (ví dụ `localhost:5173`) vì file tĩnh trả header
  `Cross-Origin-Resource-Policy: cross-origin`. Ảnh tải bằng `fetch`/canvas (cần CORS) hiện **chưa** được cấu hình riêng.
- File tĩnh trả `Cache-Control: public, max-age=31536000, immutable` (tên file là uuid, nội dung không đổi) và `X-Content-Type-Options: nosniff`.

## File tĩnh

- `ServeStaticModule` phục vụ **chỉ** thư mục upload tại `/uploads`; không phục vụ thư mục nào khác.
- Không liệt kê thư mục (`index: false`), từ chối file/thư mục bắt đầu bằng dấu chấm (`dotfiles: deny`, gồm thư mục tạm `.tmp`),
  không đọc được file ngoài thư mục upload (`../`).
- Không qua `JwtAuthGuard`: **ai biết URL đều xem được ảnh**. Không đưa ảnh riêng tư vào đây.
- URL không có file → 404 theo dạng lỗi chung.

## Cấu hình (env)

Cả hai biến đều **tùy chọn**: không khai báo thì dùng mặc định, không làm backend lỗi khi khởi động.

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `UPLOAD_DIR` | `uploads` | Thư mục lưu ảnh. Đường dẫn tương đối tính từ **thư mục đang chạy backend (cwd)**, được đổi ra đường dẫn tuyệt đối; cũng nhận đường dẫn tuyệt đối. Thư mục con (`products`, `avatars`, `.tmp`) tự tạo khi khởi động. |
| `APP_PUBLIC_URL` | `http://localhost:3000` | URL công khai của backend, dùng ghép `url` trả về. Phải là `http(s)://`, **tối đa 132 ký tự**, dấu `/` cuối được bỏ. Có giá trị mà sai thì backend báo lỗi và không khởi động. |

- Khi khởi động, backend ghi log đường dẫn tuyệt đối của thư mục upload (`Thư mục upload: ...`).
- Nếu đổi `PORT` thì nhớ đặt `APP_PUBLIC_URL` tương ứng, nếu không URL trả về sẽ trỏ sai cổng.
- Thư mục upload nằm trong `.gitignore` (`/uploads/*`, chỉ giữ `uploads/.gitkeep`).

## Xóa file

`UploadService.deleteByUrl(url)` xóa file theo URL do module này tạo ra. Hiện được `PATCH /users/me/avatar` dùng để xóa avatar cũ
(ảnh sản phẩm **chưa** nối vào). Chỉ xóa khi file nằm trong
`<UPLOAD_DIR>/<products|avatars>/`; bỏ qua (không ném lỗi) với URL ngoài hệ thống, URL có `../` hoặc ký tự lạ, và file không tồn tại.
Lỗi khác (ví dụ không đủ quyền ghi) chỉ ghi log cảnh báo.

## Giới hạn đã biết

- **File lưu trên ổ đĩa của server**: không sao lưu, **không dùng được khi triển khai nhiều máy** (mỗi máy một thư mục riêng), và mất
  khi container bị tạo lại nếu không mount volume vào `UPLOAD_DIR`. Cần chuyển sang object storage (S3...) nếu mở rộng.
- **File mồ côi không tự bị xóa**: avatar cũ chỉ được xóa khi đổi/xóa qua `PATCH /users/me/avatar`. Ảnh sản phẩm bị thay, hoặc ảnh
  upload xong mà không bao giờ được gắn vào user/sản phẩm, vẫn nằm trên ổ đĩa. Chưa có job dọn file mồ côi. Nếu đổi
  `APP_PUBLIC_URL`, URL avatar cũ không còn khớp tiền tố nên file của chúng cũng không còn được xóa tự động.
- **`POST /uploads/avatars` mở cho mọi người đã đăng nhập và dự án chưa có giới hạn tần suất (rate limit)**: một tài khoản (kể cả
  CUSTOMER đăng ký mới) có thể upload liên tục, mỗi file tới 2 MB, làm đầy ổ đĩa. Hạn chế đã biết; cần thêm rate limit và/hoặc
  hạn mức dung lượng theo người dùng trước khi chạy thật.
- Chỉ kiểm chữ ký phần đầu file (JPEG `FFD8FF`, PNG `89504E470D0A1A0A`, WebP `RIFF....WEBP`), không giải mã toàn bộ ảnh nên không
  phát hiện ảnh hỏng/cắt cụt. Không có SVG nên không có rủi ro script trong ảnh.
- Không resize/nén, không tạo ảnh thu nhỏ, không upload nhiều ảnh một lần.
- Hệ thống không ghi nhận ai sở hữu file upload: `PATCH /users/me/avatar` chỉ kiểm định dạng URL, không kiểm file có tồn tại hay do
  chính user đó upload. Để tránh xóa nhầm, file cũ không bị xóa nếu user khác đang dùng cùng URL.

## Ví dụ curl

```bash
# Đăng nhập lấy accessToken (thay email/mật khẩu cho từng role)
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"change_me_admin"}' | jq -r .data.accessToken)

# Upload ảnh sản phẩm (ADMIN/STAFF) -> 201 { success, data: { url } }
curl -s -X POST http://localhost:3000/uploads/products -H "Authorization: Bearer $TOKEN" -F "file=@./ao-thun.webp"

# Upload avatar (mọi role) -> 201
curl -s -X POST http://localhost:3000/uploads/avatars -H "Authorization: Bearer $TOKEN" -F "file=@./me.png"

# Xem ảnh: không cần token
curl -sI http://localhost:3000/uploads/products/<uuid>.webp

# Không token -> 401; CUSTOMER gọi /uploads/products -> 403
curl -s -X POST http://localhost:3000/uploads/products -F "file=@./ao-thun.webp"

# Thiếu file -> 400
curl -s -X POST http://localhost:3000/uploads/products -H "Authorization: Bearer $TOKEN"

# Có trường text kèm theo -> 400
curl -s -X POST http://localhost:3000/uploads/products -H "Authorization: Bearer $TOKEN" -F "name=abc" -F "file=@./ao-thun.webp"

# File giả mạo (nội dung văn bản, đuôi .png) -> 415
echo "khong phai anh" > fake.png
curl -s -X POST http://localhost:3000/uploads/products -H "Authorization: Bearer $TOKEN" -F "file=@./fake.png;type=image/png"

# Quá dung lượng (6 MB) -> 413
head -c 6291456 /dev/zero > big.png
curl -s -X POST http://localhost:3000/uploads/products -H "Authorization: Bearer $TOKEN" -F "file=@./big.png;type=image/png"
```

> `big.png` toàn byte 0 nên cũng sai chữ ký; 413 được trả trước vì giới hạn dung lượng được kiểm lúc nhận file.
