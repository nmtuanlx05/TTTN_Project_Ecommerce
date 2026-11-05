# API Voucher (quản trị)

Viết theo code (`src/vouchers/`, `src/orders/vouchers.rules.ts`). Có unit test (`src/vouchers/*.spec.ts`, `src/orders/vouchers.rules.spec.ts`) và e2e
với service giả (`test/admin-vouchers.e2e-spec.ts`). **Chưa chạy thử ghi thật trên MySQL** (khóa `FOR UPDATE` khi sửa, bắt `P2002` khi trùng mã).

- Base URL dev: `http://localhost:3000`. Dạng response chung: xem `docs/api/users.md`. Lỗi nghiệp vụ có thêm trường `code`.
- Xác thực `Authorization: Bearer <accessToken>`. **Chỉ ADMIN**; STAFF và CUSTOMER → 403, chưa đăng nhập → 401.
- **Không có `DELETE`**: voucher không bao giờ xóa cứng (FK `orders.voucherId` là `ON DELETE SET NULL` sẽ làm đơn mất liên kết). Muốn ngừng dùng thì tắt bằng `PATCH /admin/vouchers/:id/status`.
- Endpoint phía khách (`GET /vouchers/available`, `voucherCode` khi xem trước/đặt đơn) xem `docs/api/orders.md`; không đổi.

## Trạng thái suy ra (`status`, không lưu DB)

Có trong mọi phản hồi. Tính bằng `getVoucherStatus` (`src/orders/vouchers.rules.ts`), **cùng hàm** `assertVoucherUsable` của phía khách dùng.
Thứ tự ưu tiên khi nhiều điều kiện cùng đúng:

| Thứ tự | status | Điều kiện |
| --- | --- | --- |
| 1 | `INACTIVE` | `isActive = false` |
| 2 | `SCHEDULED` | `now < startsAt` |
| 3 | `EXPIRED` | `now > expiresAt` |
| 4 | `EXHAUSTED` | `usageLimit` khác null và `usedCount >= usageLimit` |
| 5 | `ACTIVE` | còn lại |

Biên: đúng `startsAt` và đúng `expiresAt` vẫn là `ACTIVE`. `minOrderValue` không phải trạng thái (phụ thuộc giá trị giỏ).
Hai câu SQL thô (`GET /vouchers/available`, `UPDATE ... usedCount + 1` khi đặt đơn) không dùng chung được hàm TS nên lặp lại cùng điều kiện;
đã đối chiếu kết quả thật trên DB dev (chỉ đọc) cho `ACTIVE/INACTIVE/EXPIRED/EXHAUSTED`; **`SCHEDULED` chưa có dữ liệu để đối chiếu thật**.

## Hình dạng một voucher

```json
{
  "id": 1, "code": "SALE10", "description": "Giảm 10%, tối đa 50.000đ",
  "discountType": "PERCENT", "discountValue": 10, "maxDiscount": 50000, "minOrderValue": 0,
  "usageLimit": 1000, "usedCount": 3, "remainingUses": 997,
  "startsAt": "2026-10-31T17:00:00.000Z", "expiresAt": "2027-06-30T16:59:59.000Z",
  "startsAtDate": "2026-11-01", "expiresAtDate": "2027-06-30",
  "isActive": true, "status": "ACTIVE", "createdAt": "...", "updatedAt": "..."
}
```

`remainingUses` là `null` khi không giới hạn lượt. `startsAtDate`/`expiresAtDate` là ngày theo lịch Việt Nam (GMT+7).

## Ngày

Request nhận `startsAtDate` và `expiresAtDate` dạng `YYYY-MM-DD` theo giờ Việt Nam: bắt đầu tính từ `00:00:00.000` của `startsAtDate`, kết thúc tính
**hết** `expiresAtDate` (`23:59:59.999`). Ngày không có thật (2026-02-31) → 400 `INVALID_DATE`.
Khi sửa, nếu ngày gửi lên **trùng ngày VN của giá trị đang lưu** thì coi là không đổi và giữ nguyên mốc giờ đã lưu (voucher seed có giờ lẻ không bị đổi giờ,
frontend gửi lại nguyên form không bị 409 oan).

## `GET /admin/vouchers`

Query: `page` (≥1, mặc định 1), `limit` (1–100, mặc định 10), `q` (khớp một phần theo mã), `status` (`ACTIVE|INACTIVE|SCHEDULED|EXPIRED|EXHAUSTED`),
`sortBy` (`createdAt|code|startsAt|expiresAt|usedCount`, mặc định `createdAt`), `order` (`asc|desc`, mặc định `desc`). Trả `{ success, data: [...], meta }`.

**Giới hạn khi lọc `status`**: lọc trong bộ nhớ để dùng đúng một hàm trạng thái, nên chỉ xét tối đa **1000 voucher đầu** theo thứ tự `sortBy/order`
(`MAX_STATUS_FILTER_SCAN`); `meta.total` là số kết quả trong phạm vi đó. Không có `status` thì phân trang ở DB, không giới hạn.

## `GET /admin/vouchers/:id`

Voucher kèm `stats`:
```json
{ "stats": { "usedCount": 3, "ordersCount": 3, "totalDiscount": 120000 } }
```
`ordersCount` và `totalDiscount` tính trên các đơn có `voucherId` này và `status ≠ CANCELLED` (đơn `RETURNED` vẫn tính vì không hoàn lượt).
`usedCount` có thể lệch `ordersCount` với dữ liệu seed (voucher `HETLUOT` có `usedCount` nhưng không có đơn). Không có id → 404 `VOUCHER_NOT_FOUND`.

## `POST /admin/vouchers` (201)

| Trường | Bắt buộc | Quy tắc |
| --- | --- | --- |
| `code` | có | trim + chữ HOA; `^[A-Z0-9_-]{3,30}$`; duy nhất → 409 `VOUCHER_CODE_EXISTS` |
| `description` | không | ≤ 191 ký tự; rỗng/null = không có |
| `discountType` | có | `PERCENT` hoặc `FIXED` |
| `discountValue` | có | PERCENT: 1–100; FIXED: > 0 (VND) |
| `maxDiscount` | không | chỉ PERCENT, > 0; FIXED mà có giá trị → 400 |
| `minOrderValue` | không | ≥ 0, mặc định 0 |
| `usageLimit` | không | `null`/bỏ trống = không giới hạn, hoặc ≥ 1 |
| `startsAtDate`, `expiresAtDate` | có | `YYYY-MM-DD`, `startsAt < expiresAt`; `expiresAt` **không được ở quá khứ** khi tạo |

Voucher mới luôn `isActive = true` (tắt bằng `/status`). Không nhận trường lạ (400 kèm `errors`).

## `PATCH /admin/vouchers/:id`

Mọi trường như khi tạo, đều tùy chọn; **không** nhận `isActive`. Chạy trong transaction có `SELECT ... FOR UPDATE` dòng voucher (cùng khóa với lúc đặt đơn)
rồi đọc lại `usedCount`. Chỉ kiểm lại phần **thay đổi** (voucher cũ có mã/ngày lệch chuẩn vẫn sửa được mô tả); `expiresAt` ở quá khứ được phép khi sửa (kết thúc sớm) nhưng vẫn phải sau `startsAt`.
Không có gì đổi thì không ghi DB và trả lại bản hiện tại.

| `usedCount` | Được đổi | Bị khóa |
| --- | --- | --- |
| `0` (chưa ai dùng) | tất cả trường, kể cả `code`, loại và giá trị giảm | không |
| `> 0` | `expiresAtDate`, `usageLimit` (≥ `usedCount`), `minOrderValue`, `description` | `code`, `discountType`, `discountValue`, `maxDiscount`, `startsAtDate` |

Đổi trường bị khóa → 409 `VOUCHER_FIELD_LOCKED` (`errors` liệt kê trường); gửi lại đúng giá trị đang lưu không tính là đổi. Muốn đổi các trường đó: tắt voucher và tạo voucher mới.
`minOrderValue` chỉ ảnh hưởng các đơn sau (đơn cũ đã chụp `discountAmount`).

## `PATCH /admin/vouchers/:id/status`

Body `{ "isActive": boolean }`. Trả voucher với `status` mới. Không có id → 404 `VOUCHER_NOT_FOUND`.

## Mã lỗi

| HTTP | `code` | Khi nào |
| --- | --- | --- |
| 404 | `VOUCHER_NOT_FOUND` | không có voucher với id đó |
| 409 | `VOUCHER_CODE_EXISTS` | trùng mã (tạo hoặc đổi `code`) |
| 409 | `VOUCHER_FIELD_LOCKED` | đổi trường bị khóa khi đã có người dùng |
| 400 | `VOUCHER_INVALID_CONFIG` | sai định dạng mã, giá trị giảm, `maxDiscount`, `minOrderValue`, `usageLimit`, ngày |
| 400 | `VOUCHER_USAGE_LIMIT_TOO_LOW` | `usageLimit` thấp hơn `usedCount` hiện có |
| 400 | `INVALID_DATE` | ngày không có thật |

`VOUCHER_INVALID_CONFIG` kèm `errors: [{ field, message }]`. Lỗi định dạng kiểu dữ liệu (thiếu trường, không phải số...) là 400 "Dữ liệu không hợp lệ" của validate chung.
