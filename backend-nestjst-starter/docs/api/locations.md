# API Locations (Địa chỉ hành chính)

Viết theo code (`src/locations/`). Có unit test (`src/locations/locations.service.spec.ts`) và e2e với dữ liệu thật
(`test/locations.e2e-spec.ts`); route công khai được quét bởi `test/route-permissions.e2e-spec.ts`.

- Base URL dev: `http://localhost:3000`
- Dạng response thành công/lỗi chung: xem `docs/api/users.md` (mục "Dạng response chung").
- **Công khai, chỉ đọc**, không cần đăng nhập, không phân trang, không tìm kiếm (frontend tự lọc).
- Header `Cache-Control: public, max-age=86400` (dữ liệu gần như bất biến).

## Dữ liệu

- Nạp từ file JSON trong repo (`src/locations/data/vn-admin-units.json`) vào bộ nhớ khi khởi động; **không gọi API ngoài lúc chạy**,
  không dùng bảng DB, không cần migration.
- **Chuẩn CŨ**: 63 tỉnh/thành phố, 696 quận/huyện, 10.047 phường/xã (3 cấp), **trước** đợt sắp xếp lại đơn vị hành chính từ
  01/07/2025. Nâng lên chuẩn mới (bỏ cấp huyện) để V2: chỉ cần thay file dữ liệu và sửa `src/locations/locations.data.ts`; đơn cũ
  không bị ảnh hưởng vì đơn lưu cả mã lẫn tên từng cấp.
- Nguồn: **dvhcvn** (https://github.com/daohoangson/dvhcvn), tag `v20250301`, commit `eaddcea` (đầy đủ
  `eaddcea82fc336d59e908989f04178c336a9db10`), ngày dữ liệu 01/03/2025, giấy phép **GPL-3.0**. Chi tiết và các thay đổi định dạng ở
  `src/locations/data/NOTICE.md`.
- Mỗi phần tử gồm `code` (chuỗi) và `name`; sắp xếp theo tên tiếng Việt, `localeCompare('vi', { numeric: true })`
  (vd "Quận 3", "Quận 10", "Quận 12").
- **5 huyện đảo không có phường/xã trong nguồn** (đã đối chiếu): Bạch Long Vĩ (`318`), Cồn Cỏ (`471`), Hoàng Sa (`498`), Côn Đảo
  (`755`) trống ở mọi phiên bản kiểm tra; **Lý Sơn (`536`) có 3 xã (An Vĩnh `21541`, An Hải `21544`, An Bình `21547`) ở các bản
  trước 01/06/2020 nhưng nguồn đã bỏ từ commit `e806feb71c`**. Việc trống là do nguồn gốc, không phải do cách dựng file; dữ liệu
  chưa được sửa hay bổ sung.

## Endpoint

| Method | Đường dẫn | Mô tả |
| --- | --- | --- |
| GET | `/locations/provinces` | 63 tỉnh/thành phố |
| GET | `/locations/provinces/:provinceCode/districts` | Quận/huyện của một tỉnh |
| GET | `/locations/districts/:districtCode/wards` | Phường/xã của một quận/huyện |

```json
{ "success": true, "data": [ { "code": "01", "name": "Thành phố Hà Nội" } ] }
```

Lỗi:

| HTTP | `code` | Thông báo |
| --- | --- | --- |
| 404 | `PROVINCE_NOT_FOUND` | Không tìm thấy tỉnh/thành phố |
| 404 | `DISTRICT_NOT_FOUND` | Không tìm thấy quận/huyện |

**NOTE cho frontend:** quận/huyện không có phường/xã thì `/wards` trả **200 và mảng rỗng** (không phải 404). Khi mảng phường/xã
rỗng thì **bỏ bước chọn phường/xã** và không gửi `wardCode` khi đặt đơn (gửi lên sẽ bị 400 `WARD_NOT_ALLOWED`). Ngược lại, nếu quận/huyện
có ít nhất 1 phường/xã thì `wardCode` là bắt buộc.

## Kiểm tra địa chỉ khi đặt đơn

`POST /orders` kiểm mã tồn tại và đúng quan hệ cha-con; xem bảng lỗi ở `docs/api/orders.md`. Đơn lưu mã **và** tên của từng cấp
(tỉnh, huyện, phường/xã nếu có) cùng `addressLine`; chuỗi `shippingAddress` ghép bỏ qua phường/xã khi không có.
