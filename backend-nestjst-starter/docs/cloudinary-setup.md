# Cấu hình lưu trữ ảnh (Cloudinary)

Ảnh sản phẩm và ảnh đại diện lưu trên **Cloudinary**. Ổ đĩa cục bộ chỉ còn dùng cho test/CI/dev offline (`STORAGE_DRIVER=local`) và để phục vụ
ảnh **cũ** cho tới khi chuyển xong. API: `docs/api/uploads.md`. Thiết kế dữ liệu: `docs/05-data-models.md` (mục `MediaAsset`).

## Biến môi trường

Khai báo trong `.env.development` / `.env.production` (mẫu tên biến ở `.env.example`; **không commit giá trị thật**, không ghi khóa vào log hay tài liệu).

| Biến | Bắt buộc | Mặc định | Ý nghĩa |
|---|---|---|---|
| `STORAGE_DRIVER` | Không | `cloudinary` | `cloudinary` hoặc `local`. Giá trị khác → app **không khởi động** (báo rõ). |
| `CLOUDINARY_CLOUD_NAME` | Có (khi dùng cloudinary) | | Lấy ở Cloudinary Console → Dashboard. |
| `CLOUDINARY_API_KEY` | Có | | Như trên. |
| `CLOUDINARY_API_SECRET` | Có | | **Bí mật.** Chỉ để ở file env của máy chạy backend. |
| `CLOUDINARY_FOLDER_PREFIX` | Không | `mono-studio/<NODE_ENV>` | Thư mục gốc trên Cloudinary, chỉ gồm chữ, số, `_`, `-` và `/` giữa các đoạn. Ảnh nằm ở `<prefix>/products` và `<prefix>/avatars`. **Dev và production nên khác nhau** (mặc định đã khác theo `NODE_ENV`). |
| `MEDIA_QUOTA_PRODUCTS_PER_DAY` | Không | `100` | Số ảnh sản phẩm tối đa mỗi người dùng / 24 giờ. |
| `MEDIA_QUOTA_AVATARS_PER_DAY` | Không | `10` | Số avatar tối đa mỗi người dùng / 24 giờ. |
| `ALLOW_EXTERNAL_IMAGE_URLS` | Không | bật | `false` = không nhận ảnh sản phẩm từ URL ngoài (khuyến nghị ở production). Ảnh seed (picsum) là URL ngoài nên cần để bật ở dev. |
| `MEDIA_CLEANUP_ENABLED` | Không | bật | `false` = tắt tác vụ dọn ảnh định kỳ. |
| `MEDIA_ORPHAN_MIN_AGE_HOURS` | Không | `24` | Ảnh chưa gắn vào đâu phải cũ hơn số giờ này mới bị coi là mồ côi. |
| `UPLOAD_DIR`, `APP_PUBLIC_URL` | Không | `uploads`, `http://localhost:3000` | Chỉ dùng cho ảnh cũ trên đĩa và driver `local`. |

**Thiếu cấu hình Cloudinary không làm sập app.** Backend ghi một dòng cảnh báo khi khởi động (chỉ **tên** biến thiếu, không có giá trị) và mọi API tải ảnh lên
trả `503 STORAGE_NOT_CONFIGURED`. Các chức năng khác vẫn chạy. Khóa không bao giờ được ghi vào log.

## Cài đặt từng bước

1. Tạo tài khoản Cloudinary, vào Dashboard lấy Cloud name, API Key, API Secret.
2. Điền ba biến `CLOUDINARY_*` (và tùy chọn `CLOUDINARY_FOLDER_PREFIX`) vào `.env.development`.
3. Khởi động backend, xem log có dòng `Lưu trữ ảnh: Cloudinary (thư mục …)`.
4. Thử bằng `POST /uploads/products` (ví dụ curl ở `docs/api/uploads.md`); ảnh xuất hiện trong thư mục tương ứng trên Cloudinary Media Library.

Dev offline/CI: `STORAGE_DRIVER=local` (ghi vào `UPLOAD_DIR`, phục vụ qua `/uploads`). **Không dùng ở production.**

## Chuyển ảnh cũ trên đĩa lên Cloudinary (chạy một lần)

Script `scripts/migrate-local-images-to-cloudinary.ts` (logic ở `src/media/legacy-migration.ts`). **Sao lưu DB (`mysqldump`) trước khi chạy `--apply`.**
Script **không xóa file cũ**.

```bash
npm run media:migrate-legacy                         # chạy thử (mặc định): không tải lên, không ghi DB
npm run media:migrate-legacy -- --limit 5 --verbose  # thử vài ảnh, log kèm URL
npm run media:migrate-legacy -- --apply              # thực thi
npm run media:migrate-legacy -- --rollback           # chạy thử hoàn tác; thêm --apply để thực thi
```

- Quét `users.avatarUrl`, `product_images.url`, `products.imageUrl` và snapshot `order_items.imageUrl`. Khớp theo đoạn `/uploads/<products|avatars>/<uuid>.<jpg|png|webp>`
  **bất kể host/cổng**; URL khác (picsum, ảnh ngoài) bị bỏ qua và ghi lý do `external_or_unrecognized_url`.
- Mỗi file một lần tải: `publicId` xác định từ uuid nên chạy lại không tạo trùng (asset đã có thì dùng lại, không tải lại). Sau đó tạo `media_assets` (lưu `sourceUrl`),
  cập nhật `assetId` + `url` (product_images), `avatarAssetId` + `avatarUrl` (users), `products.imageUrl` và snapshot đơn (`imageUrl` + `imagePublicId`).
- Mỗi file một dòng log JSON: `{ action, file, publicId, rows, reason? }` với `action` là `migrated | reused | would_migrate | skipped | error`.
  Lý do bỏ qua: `external_or_unrecognized_url`, `local_file_missing`, `invalid_image`, `file_too_large`, `asset_deleted`/`asset_pending_delete`.
  Dòng cuối là tổng kết `{"summary": {migrated, reused, skipped, errors, rows}}`. **Mã thoát khác 0 khi có lỗi.**
- File cục bộ không còn tồn tại: ghi `local_file_missing` (không coi là lỗi); DB vẫn giữ URL cũ cho dòng đó.

### Kế hoạch hoàn tác

- **Chưa `--apply`**: không có gì để hoàn tác.
- **Đã `--apply`, cần quay lại**: `npm run media:migrate-legacy -- --rollback --apply` trả các cột URL về `sourceUrl` và bỏ `assetId`/`imagePublicId`.
  Không xóa ảnh trên Cloudinary và không xóa dòng `media_assets` (giữ để chạy lại). Lưu ý: nhiều URL cũ khác host của cùng một file được gộp về URL đầu tiên script gặp.
  Rồi đặt `STORAGE_DRIVER=local` nếu cần chạy offline. File cũ trên đĩa không hề bị đụng tới nên ảnh hiển thị lại như trước.
- **Cách chắc chắn nhất**: khôi phục từ bản `mysqldump` sao lưu trước khi chạy.
- Prisma không có migration lùi; migration `add_media_assets` chỉ **thêm** bảng/cột nên không cần gỡ.

## Dọn ảnh

`npm run media:cleanup -- --dry-run` (đếm) hoặc `npm run media:cleanup` (thực thi). Tác vụ định kỳ chạy cùng logic mỗi giờ; xem `docs/api/uploads.md`, mục "Xóa và dọn ảnh".

## Kế hoạch bỏ cột cũ (chưa làm)

`product_images.url`, `users.avatarUrl`, `products.imageUrl` đang được **ghi kép** (bằng `secureUrl`) để code đọc cũ và việc hoàn tác không bị vỡ. Sau khi mọi client đã
đọc theo `assetId`/`publicId` và ảnh cũ đã chuyển hết, có thể bỏ ghi kép và (đợt dọn dẹp sau) bỏ `products.imageUrl`. `APP_PUBLIC_URL` hết bị giới hạn độ dài cột khi bỏ driver local.

## Giới hạn đã biết

- **Hạn mức gói miễn phí** (credit hằng tháng) bị tiêu bởi lưu trữ, băng thông và **lượt biến đổi**. Mỗi tổ hợp biến đổi của một ảnh là một lượt riêng, vì thế frontend chỉ dùng
  5 mốc chiều rộng cố định (160/320/640/960/1280) và không dùng `dpr_auto`. Hạn mức người dùng trong code chỉ chặn lạm dụng tải lên, không thay thế việc theo dõi dashboard Cloudinary.
- Nên bật cảnh báo mức sử dụng trên Cloudinary Console.
- `ALLOW_EXTERNAL_IMAGE_URLS` bật (mặc định) cho phép ảnh sản phẩm từ URL ngoài: không do hệ thống quản lý, không bị xóa, có thể chết/thay nội dung. Tắt ở production nếu không cần.
- Chưa có thu hồi theo từng người dùng khi họ bị khóa; ảnh họ tải vẫn tồn tại cho tới khi bị dọn.

## Chưa kiểm chứng

Các điểm sau dựa trên tài liệu/giả định, **chưa chạy với Cloudinary thật** (test dùng SDK giả):

- **Giới hạn của gói miễn phí**: kích thước tệp ảnh tối đa mỗi lần tải, số megapixel tối đa (code đặt 25 MP; mức này là giả định), credit/tháng, giới hạn Admin API.
- Hành vi SDK `cloudinary@2.11.0`: `upload_stream` với `overwrite:false` khi `public_id` đã tồn tại (script chuyển ảnh giả định Cloudinary trả lại ảnh sẵn có thay vì lỗi), chuỗi
  kết quả `destroy` (`ok` / `not found`), định dạng lỗi và `http_code` (420/429 khi quá hạn mức), `secure_url` có đoạn `v<version>`.
- Tài khoản dùng **dynamic folder mode**: `public_id` chứa dấu `/` có thể không tạo thư mục hiển thị trong Media Library (asset vẫn đúng `publicId`).
- Adapter MariaDB của Prisma có áp `isolationLevel: ReadCommitted` cho các transaction ghi ảnh hay không (thiết kế vẫn đúng nhờ khóa asset `FOR UPDATE` ở câu đầu transaction).
- Toàn bộ khóa `FOR UPDATE` và thứ tự khóa trên MySQL thật khi nhiều request song song (test dùng Prisma giả).
- Script chuyển ảnh chưa chạy trên dữ liệu và ảnh thật.
