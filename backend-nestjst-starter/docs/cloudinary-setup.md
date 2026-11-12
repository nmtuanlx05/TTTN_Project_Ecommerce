# Cấu hình lưu trữ ảnh (Cloudinary)

Ảnh sản phẩm và ảnh đại diện lưu trên **Cloudinary** (không còn lưu trên ổ đĩa). API: `docs/api/uploads.md`. Thiết kế dữ liệu: `docs/05-data-models.md` (mục `MediaAsset`).

## Biến môi trường

Khai báo trong `.env.development` / `.env.production` (mẫu tên biến ở `.env.example`; **không commit giá trị thật**, không ghi khóa vào log hay tài liệu).

| Biến | Bắt buộc | Mặc định | Ý nghĩa |
|---|---|---|---|
| `CLOUDINARY_CLOUD_NAME` | Có | | Lấy ở Cloudinary Console → Dashboard. |
| `CLOUDINARY_API_KEY` | Có | | Như trên. |
| `CLOUDINARY_API_SECRET` | Có | | **Bí mật.** Chỉ để ở file env của máy chạy backend. |
| `CLOUDINARY_FOLDER_PREFIX` | Không | `mono-studio/<NODE_ENV>` | Thư mục gốc trên Cloudinary, chỉ gồm chữ, số, `_`, `-` và `/` giữa các đoạn. Ảnh nằm ở `<prefix>/products` và `<prefix>/avatars`. **Dev và production nên khác nhau** (mặc định đã khác theo `NODE_ENV`). |
| `MEDIA_QUOTA_PRODUCTS_PER_DAY` | Không | `100` | Số ảnh sản phẩm tối đa mỗi người dùng / 24 giờ. |
| `MEDIA_QUOTA_AVATARS_PER_DAY` | Không | `10` | Số avatar tối đa mỗi người dùng / 24 giờ. |
| `ALLOW_EXTERNAL_IMAGE_URLS` | Không | bật | `false` = không nhận ảnh sản phẩm từ URL ngoài (khuyến nghị ở production). Ảnh seed (picsum) là URL ngoài nên cần để bật ở dev. |
| `MEDIA_CLEANUP_ENABLED` | Không | bật | `false` = tắt tác vụ dọn ảnh định kỳ. |
| `MEDIA_ORPHAN_MIN_AGE_HOURS` | Không | `24` | Ảnh chưa gắn vào đâu phải cũ hơn số giờ này mới bị coi là mồ côi. |

**Thiếu cấu hình Cloudinary không làm sập app.** Backend ghi một dòng cảnh báo khi khởi động (chỉ **tên** biến thiếu, không có giá trị) và mọi API tải ảnh lên
trả `503 STORAGE_NOT_CONFIGURED`. Các chức năng khác vẫn chạy. Khóa không bao giờ được ghi vào log.

## Cài đặt từng bước

1. Tạo tài khoản Cloudinary, vào Dashboard lấy Cloud name, API Key, API Secret.
2. Điền ba biến `CLOUDINARY_*` (và tùy chọn `CLOUDINARY_FOLDER_PREFIX`) vào `.env.development`.
3. Khởi động backend, xem log có dòng `Lưu trữ ảnh: Cloudinary (thư mục …)`.
4. Thử bằng `POST /uploads/products` (ví dụ curl ở `docs/api/uploads.md`); ảnh xuất hiện trong thư mục tương ứng trên Cloudinary Media Library.


## Dọn ảnh

`npm run media:cleanup -- --dry-run` (đếm) hoặc `npm run media:cleanup` (thực thi). Tác vụ định kỳ chạy cùng logic mỗi giờ; xem `docs/api/uploads.md`, mục "Xóa và dọn ảnh".

## Kế hoạch bỏ cột cũ (chưa làm)

`product_images.url`, `users.avatarUrl`, `products.imageUrl` đang được **ghi kép** (bằng `secureUrl`) để code đọc cũ không bị vỡ. Sau khi mọi client đã
đọc theo `assetId`/`publicId` , có thể bỏ ghi kép và (đợt dọn dẹp sau) bỏ `products.imageUrl`.

## Giới hạn đã biết

- **Hạn mức gói miễn phí** (credit hằng tháng) bị tiêu bởi lưu trữ, băng thông và **lượt biến đổi**. Mỗi tổ hợp biến đổi của một ảnh là một lượt riêng, vì thế frontend chỉ dùng
  5 mốc chiều rộng cố định (160/320/640/960/1280) và không dùng `dpr_auto`. Hạn mức người dùng trong code chỉ chặn lạm dụng tải lên, không thay thế việc theo dõi dashboard Cloudinary.
- Nên bật cảnh báo mức sử dụng trên Cloudinary Console.
- `ALLOW_EXTERNAL_IMAGE_URLS` bật (mặc định) cho phép ảnh sản phẩm từ URL ngoài: không do hệ thống quản lý, không bị xóa, có thể chết/thay nội dung. Tắt ở production nếu không cần.
- Chưa có thu hồi theo từng người dùng khi họ bị khóa; ảnh họ tải vẫn tồn tại cho tới khi bị dọn.

## Chưa kiểm chứng

Các điểm sau dựa trên tài liệu/giả định, chưa được kiểm chứng đầy đủ (test dùng SDK giả; việc tải ảnh lên Cloudinary thật đã được chạy tay thành công):

- **Giới hạn của gói miễn phí**: kích thước tệp ảnh tối đa mỗi lần tải, số megapixel tối đa (code đặt 25 MP; mức này là giả định), credit/tháng, giới hạn Admin API.
- Hành vi SDK `cloudinary@2.11.0`: `upload_stream` với `overwrite:false` khi `public_id` đã tồn tại, chuỗi
  kết quả `destroy` (`ok` / `not found`), định dạng lỗi và `http_code` (420/429 khi quá hạn mức), `secure_url` có đoạn `v<version>`.
- Tài khoản dùng **dynamic folder mode**: `public_id` chứa dấu `/` có thể không tạo thư mục hiển thị trong Media Library (asset vẫn đúng `publicId`).
- Adapter MariaDB của Prisma có áp `isolationLevel: ReadCommitted` cho các transaction ghi ảnh hay không (thiết kế vẫn đúng nhờ khóa asset `FOR UPDATE` ở câu đầu transaction).
- Toàn bộ khóa `FOR UPDATE` và thứ tự khóa trên MySQL thật khi nhiều request song song (test dùng Prisma giả).
