# API Uploads

Viết theo code (`src/uploads/`, `src/media/`, `src/storage/`). Cấu hình Cloudinary và các giới hạn đã biết: xem `docs/cloudinary-setup.md`.
Phân quyền, giới hạn dung lượng, kiểm chữ ký file, hạn mức, mã lỗi và việc phục vụ file tĩnh có e2e với Multer, ServeStatic thật và
SDK Cloudinary giả (không DB, không mạng): `test/uploads.e2e-spec.ts`. Logic gắn/xóa ảnh có unit test (`src/media/*.spec.ts`).

Module này **nhận ảnh, đẩy lên kho lưu trữ (Cloudinary), ghi một dòng `media_assets` và trả thông tin ảnh**. Việc gắn ảnh vào dữ liệu
do endpoint khác làm: frontend tải ảnh trước, lấy `assetId`/`url`, rồi gửi vào `POST/PATCH /admin/products` (xem `products.md`) hoặc
`PATCH /users/me/avatar` (xem `users.md`). Ảnh tải lên mà chưa gắn vào đâu sẽ bị dọn sau 24 giờ (mục "Xóa và dọn ảnh").

- Base URL dev: `http://localhost:3000` (đọc `PORT` từ env, mặc định 3000)
- Content-Type: `multipart/form-data`
- Dạng response thành công/lỗi chung: xem `docs/api/users.md` (mục "Dạng response chung").
- Xác thực: header `Authorization: Bearer <accessToken>` (lấy từ `POST /auth/login`, xem `docs/api/auth.md`).

## Endpoint

| Endpoint | Ai gọi được | Dung lượng tối đa | Thư mục trên kho |
|---|---|---|---|
| `POST /uploads/products` | ADMIN, STAFF | 5 MB | `<CLOUDINARY_FOLDER_PREFIX>/products/` |
| `POST /uploads/avatars` | Mọi người đã đăng nhập (ADMIN, STAFF, CUSTOMER) | 2 MB | `<CLOUDINARY_FOLDER_PREFIX>/avatars/` |
| `GET /uploads/<loại>/<tên file>` | Mọi người, không cần token | - | Chỉ phục vụ ảnh **cũ trên đĩa** (xem "File tĩnh") |

### Quy tắc gửi file (frontend phải theo)

- Gửi **đúng một trường multipart tên `file`**, **không kèm trường text nào khác** (`fields: 0`: có trường text là bị từ chối 400).
- **Một file mỗi request.** Gửi nhiều file hoặc sai tên trường → 400.
- Chỉ nhận **JPEG, PNG, WebP**. Server kiểm **nội dung thật** (chữ ký byte đầu file), không tin đuôi file hay `Content-Type` do client khai.
  Không nhận GIF, SVG, PDF.
- Server đọc **kích thước từ phần đầu file**: ảnh hỏng/cắt cụt (không đọc được kích thước) bị từ chối 415; ảnh quá **25 triệu điểm ảnh**
  hoặc cạnh dài hơn **10.000 px** bị từ chối 413.
- Không resize, không nén ở phía server: ảnh được lưu nguyên bản; tối ưu khi hiển thị bằng biến đổi URL (xem "Hiển thị ảnh").
- Tên file gốc **bị bỏ qua**; server tự đặt `publicId` theo uuid.
- File được giữ trong **bộ nhớ** (tối đa 5 MB/2 MB mỗi request) và đẩy thẳng lên Cloudinary bằng stream; **không ghi đĩa tạm**.

### Thành công (201)

```json
{
  "success": true,
  "data": {
    "assetId": 41,
    "url": "https://res.cloudinary.com/<cloud>/image/upload/v1762740000/mono-studio/production/products/3f2b8c1e-5d7a-4c0e-9b1a-2e6f4a7d8c90.jpg",
    "publicId": "mono-studio/production/products/3f2b8c1e-5d7a-4c0e-9b1a-2e6f4a7d8c90",
    "width": 1600,
    "height": 2133,
    "format": "jpg",
    "bytes": 412345
  }
}
```

- `url`: URL **gốc** (https, không kèm biến đổi). `url` giữ nguyên tên trường cũ nên client cũ vẫn chạy.
- `assetId`: id dùng để **gắn** ảnh vào dữ liệu (ưu tiên hơn `url`). `publicId`, `width`, `height`: dùng để dựng URL hiển thị.
- `width`/`height`/`format`/`bytes` có thể là `null` nếu kho lưu trữ không trả (hiếm).
- Với driver `local` (chỉ test/dev offline) `url` là `<APP_PUBLIC_URL>/uploads/<loại>/<uuid>.<đuôi>` và `publicId` là `<loại>/<uuid>`.

## Response lỗi

Dạng chung `{ "success": false, "statusCode": ..., "message": "..." }`; lỗi mới có thêm `code`.

| Tình huống | Mã | `code` | `message` |
|---|---|---|---|
| Không token, token sai hoặc hết hạn | 401 | | Thông điệp của `JwtAuthGuard` (xem `docs/api/auth.md`) |
| CUSTOMER gọi `POST /uploads/products` | 403 | | `Bạn không có quyền thực hiện thao tác này` |
| Không có file | 400 | | `Vui lòng chọn file ảnh (trường "file")` |
| Sai tên trường, nhiều file, hoặc có trường text | 400 | | `Chỉ được gửi đúng 1 file ở trường "file", không kèm trường khác` |
| Vượt dung lượng | 413 | | `File vượt quá dung lượng cho phép (tối đa 5 MB)` (avatars: `2 MB`) |
| Quá nhiều điểm ảnh | 413 | | `Ảnh quá lớn về kích thước (tối đa 25 triệu điểm ảnh)` |
| Không phải JPEG/PNG/WebP, hoặc nội dung không khớp | 415 | | `Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP` |
| Không đọc được kích thước (ảnh hỏng) | 415 | | `Không đọc được kích thước ảnh, file có thể bị hỏng` |
| Vượt hạn mức tải lên trong 24 giờ | 429 | `UPLOAD_QUOTA_EXCEEDED` | `Bạn đã đạt giới hạn <n> ảnh mỗi 24 giờ, vui lòng thử lại sau` |
| **Chưa cấu hình kho lưu trữ** | 503 | `STORAGE_NOT_CONFIGURED` | `Chức năng tải ảnh chưa được cấu hình trên máy chủ, vui lòng liên hệ quản trị viên` |
| Cloudinary từ chối/lỗi mạng | 502 | `STORAGE_UPLOAD_FAILED` | `Không tải được ảnh lên dịch vụ lưu trữ, vui lòng thử lại sau` (hoặc `...đang quá tải...` khi Cloudinary báo giới hạn tần suất) |

- 401/403 được kiểm **trước** khi nhận file. 413/415 và lỗi khác được trả **trước** khi gọi Cloudinary, nên request bị từ chối không tốn lượt tải.
- "Tối đa 5 MB" nghĩa là file **đúng 5 MB (5 × 1024 × 1024 byte) vẫn được nhận**, lớn hơn 1 byte là 413.
- Khi thiếu cấu hình, **ứng dụng vẫn chạy**; chỉ các API tải ảnh lên trả 503. Các API khác (kể cả ảnh đã có) không bị ảnh hưởng.
- Chi tiết lỗi của Cloudinary chỉ ghi log phía server (không có khóa/bí mật), không trả cho client.

## Hạn mức theo người dùng

Đếm số ảnh người đó đã tải trong **24 giờ gần nhất** (theo từng loại), để bảo vệ hạn mức gói Cloudinary miễn phí. Không dùng thư viện rate limit.

| Loại | Mặc định | Biến môi trường |
|---|---|---|
| Ảnh sản phẩm | 100 ảnh / người / 24 giờ | `MEDIA_QUOTA_PRODUCTS_PER_DAY` |
| Avatar | 10 ảnh / người / 24 giờ | `MEDIA_QUOTA_AVATARS_PER_DAY` |

- Vượt hạn mức → 429 `UPLOAD_QUOTA_EXCEEDED`. Ảnh đã bị xóa vẫn **tính** vào hạn mức (đếm theo lượt tải).
- Đếm rồi mới ghi, nên khi nhiều request chạy song song một người có thể vượt hạn mức vài ảnh. Đây là hạn mức chống lạm dụng, không phải ràng buộc chặt.

## Hiển thị ảnh (hợp đồng với frontend)

Backend **luôn trả URL gốc** (`url`) và thêm `publicId`, `width`, `height`; **không** đổi tên trường nào đang có (`url` trong `images[]`,
`imageUrl`, `avatarUrl`...). Mọi API trả ảnh (sản phẩm, giỏ, wishlist, đơn) vẫn trả đúng một chuỗi URL gốc.

Frontend dựng URL biến đổi từ URL gốc bằng cách chèn đoạn biến đổi ngay sau `/upload/`:

```
https://res.cloudinary.com/<cloud>/image/upload/v1762/…/x.jpg
→ https://res.cloudinary.com/<cloud>/image/upload/f_auto,q_auto,c_limit,w_640/v1762/…/x.jpg
```

- `f_auto,q_auto`: định dạng và chất lượng tự động (WebP/AVIF khi trình duyệt hỗ trợ); `c_limit,w_<n>`: không phóng to quá kích thước gốc.
- **Chỉ dùng các mốc chiều rộng cố định: 160, 320, 640, 960, 1280.** Không dùng `dpr_auto` và không đặt chiều rộng tùy ý.
  Lý do: mỗi tổ hợp biến đổi (kích thước × định dạng) của một ảnh là **một lượt biến đổi riêng được tính vào hạn mức** gói Cloudinary;
  ít mốc cố định thì số biến thể bị chặn trên và CDN tái sử dụng được cache.
- Hỗ trợ `srcset` bằng cách liệt kê vài mốc: `…w_320… 320w, …w_640… 640w`.
- Chỉ biến đổi URL có host `res.cloudinary.com` và chứa `/upload/`. URL khác (ảnh ngoài như picsum, ảnh cũ chưa chuyển trên đĩa) thì **dùng nguyên URL**.
- `width`/`height` dùng để giữ tỉ lệ khung (tránh nhảy bố cục).

## Gắn ảnh vào dữ liệu

| Đích | Gửi gì | Ghi chú |
|---|---|---|
| `POST/PATCH /admin/products` → `images[]` | `{ "assetId": 41 }` hoặc `{ "url": "<url nhận được>" }` | Xem `products.md` |
| `PATCH /users/me/avatar` | `{ "assetId": 41 }` hoặc `{ "avatarUrl": "<url nhận được>" }`; `{ "avatarUrl": null }` để xóa | Xem `users.md` |

- Server kiểm asset **tồn tại, còn `ACTIVE`, đúng loại** (PRODUCT cho sản phẩm, AVATAR cho avatar). Avatar chỉ gắn được ảnh **chính người đó tải lên**.
- Ảnh gắn vào sản phẩm: ADMIN/STAFF nào cũng gắn được ảnh sản phẩm do ADMIN/STAFF khác tải.
- Ghi dữ liệu và xóa ảnh cũ: xem mục sau.

## Xóa và dọn ảnh

- **Thay hoặc gỡ ảnh** (sửa `images` của sản phẩm, đổi/xóa avatar): trong **cùng transaction** với việc ghi quan hệ mới, server đánh dấu các
  ảnh cũ **không còn ai dùng** là `PENDING_DELETE`. Chỉ **sau khi commit** mới gọi Cloudinary xóa. Xóa lỗi thì tăng `deleteAttempts`, ghi
  `lastError` và **không làm hỏng request**; lần dọn sau thử lại (tối đa 5 lần, quá thì chỉ báo trong log).
- **Không bao giờ xóa** ảnh còn được `product_images.assetId`, `users.avatarAssetId` hoặc **`order_items.imagePublicId`** (ảnh chụp trong đơn hàng) tham chiếu:
  đơn cũ vẫn thấy ảnh dù sản phẩm đã đổi ảnh.
- **Ảnh mồ côi**: ảnh `ACTIVE` không ai tham chiếu và cũ hơn **24 giờ** (`MEDIA_ORPHAN_MIN_AGE_HOURS`) bị chuyển sang `PENDING_DELETE` rồi xóa.
  Ảnh nhập từ script chuyển ảnh cũ (`sourceUrl` có giá trị) **không** bị quét mồ côi, chỉ bị xóa khi được thay thế.
- Chạy bằng **tác vụ định kỳ** (mỗi giờ, phút 17; tắt bằng `MEDIA_CLEANUP_ENABLED=false`) hoặc chạy tay:

```bash
npm run media:cleanup -- --dry-run   # chỉ đếm, không ghi gì
npm run media:cleanup                # thực thi
```

- Tác vụ ghi log số lượng (`Dọn ảnh: xóa …, lỗi …, bỏ cuộc …, mồ côi mới đánh dấu …`); e2e không chạy tác vụ thật.
- Nếu ghi DB lỗi ngay sau khi tải lên Cloudinary, server **xóa ngay** ảnh vừa tải (best effort).

## File tĩnh (ảnh cũ trên đĩa)

- `ServeStaticModule` vẫn phục vụ thư mục `UPLOAD_DIR` tại `/uploads` **cho tới khi ảnh cũ được chuyển hết** sang Cloudinary và cho driver `local`.
  Không liệt kê thư mục, từ chối dotfiles, không đọc được file ngoài thư mục upload (`../`); không qua `JwtAuthGuard` (ai biết URL đều xem được).
- Ảnh tải lên mới (driver `cloudinary`) **không** nằm ở đây.
- Cache: `Cache-Control: public, max-age=31536000, immutable` và `X-Content-Type-Options: nosniff`, `Cross-Origin-Resource-Policy: cross-origin`.

## Cấu hình (env)

Danh sách biến, mặc định và cách lấy khóa: `docs/cloudinary-setup.md`. Tóm tắt: `STORAGE_DRIVER` (`cloudinary` mặc định | `local`),
`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_FOLDER_PREFIX`; `UPLOAD_DIR`, `APP_PUBLIC_URL`
(chỉ còn dùng cho ảnh cũ/driver local); `MEDIA_*`, `ALLOW_EXTERNAL_IMAGE_URLS`.

## Giới hạn đã biết

- Driver `local` **chỉ** cho test/CI/dev offline: không dùng được khi chạy nhiều máy, mất khi container tạo lại nếu không mount volume.
- Chỉ kiểm chữ ký và **kích thước** từ phần đầu file, không giải mã toàn bộ ảnh nên không phát hiện hỏng ở phần thân. Không có SVG nên không có rủi ro script trong ảnh.
- Hạn mức tải lên đếm rồi mới ghi (xem trên) và chưa có rate limit theo IP/tần suất ngắn.
- Mỗi biến thể kích thước hiển thị là một lượt biến đổi tính vào hạn mức Cloudinary (xem "Hiển thị ảnh" và `docs/cloudinary-setup.md`).
- Các giới hạn của gói miễn phí (kích thước ảnh tối đa, credit hằng tháng) và hành vi SDK chưa được kiểm chứng ở môi trường thật: xem mục "Chưa kiểm chứng" trong `docs/cloudinary-setup.md`.

## Ví dụ curl

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"change_me_admin"}' | jq -r .data.accessToken)

# Tải ảnh sản phẩm (ADMIN/STAFF) -> 201 { success, data: { assetId, url, publicId, width, height, format, bytes } }
curl -s -X POST http://localhost:3000/uploads/products -H "Authorization: Bearer $TOKEN" -F "file=@./ao-thun.webp"

# Tải avatar (mọi role) -> 201
curl -s -X POST http://localhost:3000/uploads/avatars -H "Authorization: Bearer $TOKEN" -F "file=@./me.png"

# Không token -> 401; CUSTOMER gọi /uploads/products -> 403
curl -s -X POST http://localhost:3000/uploads/products -F "file=@./ao-thun.webp"

# File giả mạo (nội dung văn bản, đuôi .png) -> 415
echo "khong phai anh" > fake.png
curl -s -X POST http://localhost:3000/uploads/products -H "Authorization: Bearer $TOKEN" -F "file=@./fake.png;type=image/png"

# Quá dung lượng (6 MB) -> 413
head -c 6291456 /dev/zero > big.png
curl -s -X POST http://localhost:3000/uploads/products -H "Authorization: Bearer $TOKEN" -F "file=@./big.png;type=image/png"
```
