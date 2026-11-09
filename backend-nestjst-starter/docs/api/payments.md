# API thanh toán online (chuyển khoản VietQR)

Code ở `src/payments/`. Đơn hàng và trạng thái xem `docs/api/orders.md`. Dạng response chung xem `docs/api/users.md`.
Lỗi có thêm trường `code` (máy đọc được).

## Tổng quan

- Khách chọn `paymentMethod: "ONLINE"` khi đặt đơn → đơn vào `PENDING_PAYMENT` (đã **giữ chỗ tồn kho và lượt voucher** như đơn COD), có hạn
  thanh toán `paymentExpiresAt = lúc tạo + PAYMENT_EXPIRE_MINUTES` (mặc định 30 phút).
- Khách chuyển khoản theo QR (hoặc nhập tay) với **nội dung chuyển khoản = mã đơn bỏ ký tự đặc biệt** (`MS-261105-PKGA` → `MS261105PKGA`).
- Backend **không** gọi ngân hàng. Tiền vào được báo qua **hai cửa vào dùng chung một hàm xác nhận**
  (`PaymentsService.confirmBankTransfer`, nguồn sự thật duy nhất):
  1. **Webhook dịch vụ đối soát** (SePay), đường chính: `POST /payments/webhook/sepay`.
  2. **Admin xác nhận thủ công**, dự phòng: `POST /admin/orders/:id/confirm-payment` (webhook không tới, giao dịch thiếu tiền, không khớp).
- **Không có endpoint giả lập thanh toán** (không có cờ bật/tắt nào). Muốn thử webhook ở máy dùng script curl bên dưới.
- Đơn quá hạn mà chưa trả bị tự hủy mỗi phút (xem "Hết hạn").

```
Khách đặt đơn ONLINE ──► PENDING_PAYMENT (giữ chỗ, hạn 30 phút)
        │                      │
        │  chuyển khoản        │ quá hạn (tác vụ mỗi phút)
        ▼                      ▼
 SePay ─► webhook ─┐        CANCELLED ("Hết hạn thanh toán": nhả tồn, hoàn lượt voucher)
 Admin  ─ confirm ─┴─► confirmBankTransfer
                          ├ đủ/thừa tiền ► PENDING (paymentStatus=PAID) ─► (staff xác nhận như đơn COD)
                          ├ thiếu tiền   ► giao dịch NEEDS_REVIEW (UNDERPAID), đơn giữ nguyên
                          ├ đơn đã đóng  ► NEEDS_REVIEW (ORDER_CLOSED), KHÔNG mở lại đơn
                          ├ đã trả rồi   ► NEEDS_REVIEW (DUPLICATE_PAID)
                          └ không khớp   ► NEEDS_REVIEW (UNMATCHED)
```

## Cấu hình

Biến môi trường (mẫu ở `.env.example`, **không commit giá trị thật**; app không bao giờ in giá trị vào log):

| Biến | Ý nghĩa | Khi thiếu/sai |
| --- | --- | --- |
| `VIETQR_BANK_BIN` | BIN ngân hàng nhận tiền, 6 chữ số | Tắt ONLINE |
| `VIETQR_ACCOUNT_NO` | Số tài khoản, 6-19 chữ số | Tắt ONLINE |
| `VIETQR_ACCOUNT_NAME` | Tên chủ tài khoản hiển thị cho khách | Tắt ONLINE |
| `VIETQR_BANK_NAME` | Tùy chọn: ghi đè tên ngân hàng hiển thị | Dùng tên tra theo BIN |
| `PAYMENT_EXPIRE_MINUTES` | Hạn thanh toán, 1-1440, mặc định 30 | Giá trị sai → tắt ONLINE; bỏ trống → 30 |
| `SEPAY_WEBHOOK_API_KEY` | Khóa API của webhook SePay | Bỏ trống → webhook **tắt hẳn** (404) |

- Thiếu hoặc sai biến thì **app vẫn khởi động**; log cảnh báo nêu **tên** biến (không nêu giá trị). `POST /orders` với `ONLINE` trả 400
  `PAYMENT_METHOD_NOT_SUPPORTED` (thông báo cho khách không nêu tên biến), và `availablePaymentMethods.online.enabled = false` ở preview.
- Bảng BIN → tên ngân hàng ở `src/payments/banks.ts`. **Chỉ MB (970422) đã được kiểm chứng**; các BIN khác ghi từ trí nhớ và đánh dấu
  "chưa kiểm chứng" trong code: đối chiếu danh sách NAPAS hoặc tự quét thử QR trước khi dùng.
- Giữ `PAYMENT_EXPIRE_MINUTES` nhỏ hơn thời gian khách có thể mong đợi; hạn được ghi vào từng đơn (`paymentExpiresAt`) lúc tạo nên đổi cấu hình
  không ảnh hưởng đơn cũ.

## Endpoint của khách

### `POST /orders/preview` (bổ sung)

Response thêm `availablePaymentMethods`:

```json
"availablePaymentMethods": {
  "cod": { "enabled": true },
  "online": { "enabled": false, "reason": "Đơn hàng 0đ không cần thanh toán online, vui lòng chọn COD" }
}
```

`online.enabled = false` khi chưa cấu hình ONLINE hoặc khi `totalAmount = 0`. Frontend ẩn lựa chọn ONLINE và hiển thị `reason`.

### `POST /orders` với `paymentMethod: "ONLINE"`

Giống COD (cùng khóa, cùng giữ chỗ, cùng voucher, cùng `Idempotency-Key`), khác: `status = "PENDING_PAYMENT"`, `paymentStatus = "UNPAID"`,
`paymentExpiresAt` có giá trị. **Tổng tiền = 0** → 400 `PAYMENT_NOT_REQUIRED` (từ chối trước khi giữ chỗ/tăng lượt voucher; chọn COD).

### `GET /orders/:code/payment`

Chỉ `CUSTOMER` và chỉ chủ đơn (đơn người khác → 404 `ORDER_NOT_FOUND`; đơn COD → 409 `ORDER_NOT_ONLINE`). Luôn 200 cho đơn online để frontend chuyển
màn theo `state`: `AWAITING_PAYMENT` | `PAID` | `EXPIRED` | `CANCELLED`. `EXPIRED` được **tính khi đọc** (`now >= paymentExpiresAt`), không ghi DB.

Đang chờ:

```json
{ "success": true, "data": {
  "state": "AWAITING_PAYMENT",
  "orderCode": "MS-261105-PKGA",
  "amount": 350000,
  "expiresAt": "2026-11-05T10:30:00.000Z",
  "paidAt": null,
  "transfer": {
    "content": "MS261105PKGA",
    "bank": { "bin": "970422", "code": "MB", "name": "MB Bank (Quân đội)" },
    "accountNo": "0123456789",
    "accountName": "CUA HANG",
    "qrPayload": "00020101021238540010A00000072701240006970422011001234567890208QRIBFTTA530370454063500005802VN62160812MS261105PKGA6304F85E"
  } } }
```

Frontend vẽ `qrPayload` thành mã QR (vd bằng thư viện QR phía client). Chỉ khi `AWAITING_PAYMENT` mới có `transfer` (thông tin tài khoản và QR).

```json
{ "success": true, "data": { "state": "PAID", "orderCode": "MS-261105-PKGA", "amount": 350000,
                              "expiresAt": "2026-11-05T10:30:00.000Z", "paidAt": "2026-11-05T10:12:41.000Z" } }
```

Nếu ONLINE bị tắt trong lúc đơn còn chờ → 409 `PAYMENT_METHOD_NOT_SUPPORTED`.

### `POST /orders/:code/cancel`

Khách hủy được đơn `PENDING_PAYMENT` chưa trả (nhả tồn, hoàn voucher). Đơn **đã thanh toán** (`paymentStatus = PAID`) → 409
`ORDER_NOT_CANCELLABLE_BY_CUSTOMER` ("đã thanh toán, vui lòng liên hệ cửa hàng").

## Webhook SePay

### `POST /payments/webhook/sepay`

- **Đường dẫn đầy đủ:** `<địa chỉ công khai của backend>/payments/webhook/sepay`. Backend **không** dùng tiền tố toàn cục (`/api`...).
- **Xác thực:** header `Authorization: Apikey <SEPAY_WEBHOOK_API_KEY>`; so sánh hằng thời gian (hash SHA-256 + `timingSafeEqual`). Không có/sai
  → 401, không ghi gì. Chưa đặt khóa → 404 (như không có route). Route `@Public` (không dùng JWT) nhưng **chỉ khóa này** mới vào được.
- **Chỉ xử lý tiền VÀO** (`transferType = "in"`); tiền ra và giá trị lạ → 200 `{ processed: false }`, không làm gì.
- **Khớp đơn** theo trường `content` gốc: viết hoa, bỏ mọi ký tự không phải chữ/số, rồi tìm đúng một mã dạng `MS` + 6 số + 4 ký tự
  (`MS261105PKGA`), bỏ qua chữ ngân hàng thêm vào trước/sau. Có hai mã khác nhau trong cùng nội dung → coi là không khớp. **Không phụ thuộc** cấu
  hình "mã thanh toán" (trường `code`) phía SePay.
- **Không kiểm `accountNumber`** của payload (bỏ qua có chủ đích). Bật lại việc so sánh với `VIETQR_ACCOUNT_NO` nếu sau này dùng tài khoản ảo
  (VA) hoặc nhiều tài khoản.
- Payload không có ràng buộc trường thừa (SePay có thể thêm trường mới). Chỉ cần `id`, `transferType`, `transferAmount` (số nguyên dương), `content`.
  Thiếu/sai `id` hoặc `transferAmount` → 400 `WEBHOOK_PAYLOAD_INVALID`.

Request mẫu (định dạng theo tài liệu SePay):

```json
{ "id": 92704, "gateway": "MBBank", "transactionDate": "2026-11-09 11:08:33", "accountNumber": "0123456789",
  "code": null, "content": "MS261105PKGA", "transferType": "in", "transferAmount": 350000,
  "accumulated": 19077000, "subAccount": null, "referenceCode": "FT24012345678", "description": "" }
```

Response (đã bọc `success`; SePay chỉ cần `success: true`):

```json
{ "success": true, "data": { "processed": true, "result": "CONFIRMED" } }
```

`result`: `CONFIRMED` (đã xác nhận đơn), `NEEDS_REVIEW` (đã ghi giao dịch cần admin xử lý), `DUPLICATE` (id đã xử lý trước đó, không làm lại).
Lỗi hệ thống → 500 chung chung (không lộ chi tiết) để SePay gửi lại.

### Đã đối chiếu với tài liệu SePay (docs.sepay.vn/tich-hop-webhooks)

- Trường: `id`, `gateway`, `transactionDate`, `accountNumber`, `subAccount`, `code`, `content`, `transferType` (`in`/`out`), `description`,
  `transferAmount`, `accumulated`, `referenceCode`. Xác thực API Key: `Authorization: Apikey <khóa>`.
- Phản hồi mong đợi: HTTP 200/201 kèm JSON `{"success": true}`; 200 mà thiếu `success: true` bị ghi là lỗi và **không** retry.
- Gửi lại: tối đa 7 lần, cách 1, 1, 2, 3, 5, 8, 13 phút (~33 phút), timeout 30 giây, **chỉ** khi lỗi kết nối/timeout hoặc khi bạn bật tùy chọn
  "retry khi non-2xx". Tài liệu khuyên kiểm trùng theo `id`: đây là ràng buộc duy nhất `(provider, providerTxnId)` ở DB.
- Danh sách IP của SePay có thể dùng làm allowlist ở tầng proxy (xem trang tài liệu trên).

**Chưa kiểm chứng:** giá trị `transferType` ngoài `in`/`out`; hành vi retry với 4xx/5xx khi KHÔNG bật tùy chọn retry non-2xx (một nguồn cũ nói chỉ
retry lỗi mạng); `accountNumber` khi dùng tài khoản ảo/`subAccount`; hành vi ở chế độ Test của SePay; nội dung chuyển khoản thật mà ngân hàng ghi
(có thể thêm tiền tố/hậu tố hoặc cắt ngắn) trên từng ngân hàng.

### Cấu hình webhook phía SePay (làm tay)

1. Tạo khóa ngẫu nhiên và đặt vào `SEPAY_WEBHOOK_API_KEY` trong `.env.development`/`.env.production`:
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Khởi động lại backend.
2. Trong SePay: tạo webhook → URL `https://<tên miền công khai>/payments/webhook/sepay`, kiểu xác thực **API Key** với đúng khóa trên, nhận
   giao dịch **tiền vào**, gắn với tài khoản ngân hàng nhận tiền.
3. Cân nhắc bật "retry khi non-2xx" ở SePay để lỗi 500 tạm thời của backend được gửi lại.

### Thử webhook ở máy (không cần chuyển tiền thật)

Đây chỉ là **script curl mẫu**, không phải mã chạy của ứng dụng. Nó gọi vào **chính endpoint webhook thật** (đi qua xác thực khóa và hàm xác nhận
chung), khóa đọc từ biến môi trường, không ghi cứng. Tạo một đơn ONLINE thật trước, lấy mã đơn và tổng tiền (`GET /orders/:code`).

```bash
# Đặt trong shell: khóa lấy từ biến môi trường (KHÔNG dán khóa thật vào file hay lịch sử lệnh dùng chung)
#   export SEPAY_WEBHOOK_API_KEY='...'        # cùng giá trị với backend
export ORDER_CODE='MS-261105-PKGA'            # mã đơn online thật đang PENDING_PAYMENT
export AMOUNT=350000                          # đúng tổng đơn; thử 349999 (thiếu) hoặc 400000 (thừa)
export TXN_ID="$(date +%s)"                   # id giao dịch mới mỗi lần (gửi lại cùng id → DUPLICATE)
CONTENT="$(printf '%s' "$ORDER_CODE" | tr -d '-')"   # MS261105PKGA

curl -sS -X POST 'http://localhost:3000/payments/webhook/sepay' \
  -H "Authorization: Apikey ${SEPAY_WEBHOOK_API_KEY}" \
  -H 'Content-Type: application/json' \
  -d "{\"id\": ${TXN_ID}, \"gateway\": \"MBBank\", \"transactionDate\": \"$(date '+%Y-%m-%d %H:%M:%S')\",
       \"accountNumber\": \"0000000000\", \"code\": null, \"content\": \"${CONTENT}\", \"transferType\": \"in\",
       \"transferAmount\": ${AMOUNT}, \"accumulated\": 0, \"subAccount\": null,
       \"referenceCode\": \"TEST${TXN_ID}\", \"description\": \"\"}"
```

Kết quả mong đợi: `{"success":true,"data":{"processed":true,"result":"CONFIRMED"}}`. Chạy lại **cùng `TXN_ID`** → `DUPLICATE`. Bỏ header hoặc sai khóa
→ 401. Lưu ý: script này ghi dữ liệu thật vào DB mà backend đang dùng (đơn chuyển sang `PENDING`, một dòng `payment_transactions`), nên chỉ chạy
trên DB dev và với đơn thử.

### Chạy đường hầm (tunnel) khi thử với SePay thật

SePay gọi từ internet nên cần địa chỉ công khai trỏ về máy bạn, ví dụ `cloudflared tunnel --url http://localhost:3000` hoặc `ngrok http 3000`; dán
URL được cấp (kèm `/payments/webhook/sepay`) vào cấu hình webhook SePay.

**Cảnh báo an toàn khi mở địa chỉ công khai:**
- Chỉ dùng khóa ngẫu nhiên dài (≥ 32 byte hex), **không** dùng khóa mẫu; đổi khóa nếu nghi bị lộ (đổi cả hai phía).
- Đường hầm công khai toàn bộ backend (không chỉ webhook): **tắt đường hầm ngay khi thử xong**, không để chạy qua đêm. Nếu công cụ cho phép, chỉ
  cho phép đường dẫn `/payments/webhook/sepay` và/hoặc giới hạn theo IP của SePay.
- Không commit URL đường hầm, khóa hay `.env*`. URL thay đổi mỗi lần chạy (gói miễn phí), nhớ cập nhật bên SePay.
- Dùng DB dev và số tiền nhỏ khi thử với tiền thật; mọi webhook hợp lệ đều thật sự xác nhận đơn.
- Không log payload/khóa/số tài khoản; backend chỉ log id giao dịch và kết quả.

## Hàm xác nhận chung (`confirmBankTransfer`)

Cả webhook và admin xác nhận thủ công đều gọi hàm này; không có đường nào khác đổi `paymentStatus` của đơn online thành `PAID`.

1. **Idempotent theo `(provider, providerTxnId)`**: đã có → trả `DUPLICATE`, không xử lý lại. Hai webhook cùng id đến đồng thời: ràng buộc duy nhất ở
   DB chặn lần hai (bắt P2002 rồi trả `DUPLICATE`).
2. Tìm đơn theo mã trong nội dung (webhook) hoặc theo id (admin).
3. Trong `$transaction` (retry P2034): **khóa dòng đơn `FOR UPDATE`** (chỉ khóa đơn, không khóa biến thể/voucher nên không đảo thứ tự khóa
   giỏ → đơn → biến thể → voucher) → quyết định theo bảng dưới → ghi `payment_transactions` → (nếu xác nhận) `OrderWorkflowService.transition`.
4. An toàn khi đua với tác vụ hết hạn: cả hai khóa đơn, ai khóa trước thắng; bên sau kiểm lại trạng thái sau khi khóa.

### Quy tắc số tiền và trạng thái

| Tình huống | Đơn | `payment_transactions` |
| --- | --- | --- |
| `amount = totalAmount`, đơn `PENDING_PAYMENT` | `PENDING`, `paymentStatus = PAID`, `paidAt`, `paymentRef = providerTxnId`; lịch sử "Đã nhận chuyển khoản" | `SUCCESS` |
| `amount > totalAmount` (thừa) | Như trên | `SUCCESS` + `reviewReason = OVERPAID` (admin xem để hoàn phần thừa **ngoài hệ thống**) |
| `amount < totalAmount` (thiếu) | **Không đổi** | `NEEDS_REVIEW` + `UNDERPAID` |
| Đơn đã `CANCELLED` (kể cả tự hủy do hết hạn) | **Không mở lại** | `NEEDS_REVIEW` + `ORDER_CLOSED` |
| Đơn đã `PAID` (nhận thêm khoản nữa) | Không đổi | `NEEDS_REVIEW` + `DUPLICATE_PAID` |
| Không tìm thấy đơn / mã mơ hồ | — | `NEEDS_REVIEW` + `UNMATCHED`, `orderId = null` |
| Mã thuộc đơn COD | Không đổi | `NEEDS_REVIEW` + `UNMATCHED`, gắn `orderId` |

- **Tiền về muộn:** nếu đơn **vẫn còn** `PENDING_PAYMENT` dù quá `paymentExpiresAt` (tác vụ chưa chạy tới) thì vẫn xác nhận vì tồn kho vẫn đang giữ.
  Đã bị hủy thì rơi vào dòng `ORDER_CLOSED`.
- **Giới hạn hoàn tiền thủ công:** khi đơn đã tự hủy mà khách vẫn chuyển tiền, hệ thống **không** hoàn tiền và **không** mở lại đơn. Giao dịch nằm trong
  danh sách cần xử lý (`ORDER_CLOSED`); admin kiểm tra, hoàn tiền cho khách **ngoài hệ thống** (ngân hàng) rồi bấm "đã xử lý" (`resolve`). Backend không
  gọi ngân hàng nên không có hoàn tiền tự động. Tương tự cho `OVERPAID`, `DUPLICATE_PAID`, `UNDERPAID` (nếu quyết định trả lại thay vì bù thêm).
- Hủy đơn đã `PAID` (chỉ ADMIN): `paymentStatus` **giữ nguyên `PAID`** (không đổi sang `REFUNDED`); hoàn tiền xử lý ngoài hệ thống và nên ghi vào lý do hủy.
  STAFF hủy đơn đã `PAID` → 403 `ORDER_PAID_ADMIN_ONLY` (luồng "Staff tạo yêu cầu, Admin duyệt" chưa làm).

## Endpoint quản trị: chỉ `ADMIN`

(STAFF nhận 403. Danh sách đơn `GET /admin/orders?status=PENDING_PAYMENT` lọc đơn chờ thanh toán; quyền xem đơn vẫn của ADMIN và STAFF.)

### `POST /admin/orders/:id/confirm-payment`

Dự phòng khi webhook không tới hoặc cần xử lý giao dịch thiếu tiền/không khớp. Body:

```json
{ "note": "FT24999888 đối chiếu sao kê MB 10:12", "transactionId": 5 }
```

- `note` **bắt buộc** (1-300 ký tự, vd mã giao dịch ngân hàng); ghi vào lịch sử đơn kèm **người xác nhận** (`actorId`).
- `transactionId` tùy chọn: giao dịch đang chờ xử lý được gắn vào đơn này và đánh dấu đã xử lý (`resolvedAt`, `resolvedById`). Giao dịch đang gắn
  đơn khác → 400 `PAYMENT_TXN_ORDER_MISMATCH`.
- Số tiền ghi nhận = **tổng đơn** (admin xác nhận đã nhận đủ). Ghi một dòng `payment_transactions` với `provider = "MANUAL"`, `providerTxnId = null`.
- Chỉ đơn online còn `PENDING_PAYMENT` và chưa `PAID`; ngược lại 409 `ORDER_NOT_AWAITING_PAYMENT` (không mở lại đơn đã hủy/hết hạn).

```json
{ "success": true, "data": { "result": "CONFIRMED", "transactionId": 12, "orderCode": "MS-261105-PKGA", "overpaid": false } }
```

### `GET /admin/payments/transactions`

Danh sách giao dịch cần xử lý. Query `review` = `pending` (mặc định, chưa xử lý) | `resolved` | `all`; `page`, `limit` (1-100). Phân trang chuẩn.
Không trả `rawData` (có thể chứa số tài khoản).

```json
{ "success": true, "data": [
  { "id": 5, "provider": "SEPAY", "providerTxnId": "92704", "amount": 100000, "content": "MS261105PKGA",
    "status": "NEEDS_REVIEW", "reviewReason": "UNDERPAID", "resolvedAt": null, "resolutionNote": null,
    "createdAt": "2026-11-09T04:08:33.000Z",
    "order": { "id": 10, "code": "MS-261105-PKGA", "status": "PENDING_PAYMENT", "totalAmount": 350000 },
    "resolvedBy": null } ],
  "meta": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 } }
```

### `POST /admin/payments/transactions/:id/resolve`

Body `{ "note": "Đã hoàn 100.000đ cho khách qua ngân hàng" }` (bắt buộc). Đánh dấu giao dịch **đã xử lý ngoài hệ thống**; không đổi trạng thái đơn.
`UPDATE ... WHERE resolvedAt IS NULL` nên hai admin bấm cùng lúc chỉ một người thành công.

```json
{ "success": true, "data": { "id": 5, "resolved": true } }
```

## Hết hạn

- Tác vụ định kỳ **mỗi phút** (`src/payments/payment-expiry.cron.ts`, `@nestjs/schedule`, chỉ nạp qua `PaymentsSchedulerModule` của `AppModule`; test/e2e dựng
  module riêng nên **không chạy tác vụ thật**).
- Chọn tối đa 50 đơn `PENDING_PAYMENT` + `UNPAID` có `paymentExpiresAt <= now`; mỗi đơn một transaction riêng: **khóa đơn `FOR UPDATE`, kiểm lại**
  (còn chờ, chưa trả, còn quá hạn) rồi hủy bằng **đúng đường hủy hiện có** (`OrderWorkflowService`: nhả `reserved`, `usedCount - 1` đúng một lần, ghi lịch sử
  với actor hệ thống và lý do "Hết hạn thanh toán"). Một đơn lỗi không chặn các đơn khác.
- **Idempotent và chống chạy trùng:** nhiều tiến trình chạy cùng lúc vẫn đúng vì mọi tiến trình khóa đơn rồi kiểm lại trạng thái; chạy trùng chỉ tốn công. Trong một
  tiến trình có cờ chống chồng lượt. Không cần khóa phân tán ở quy mô hiện tại.
- Đọc đơn/`GET /orders/:code/payment` quá hạn trả `EXPIRED` ngay (tính khi đọc) dù tác vụ chưa chạy.

## Bảng lỗi (`code`)

| HTTP | `code` | Điều kiện |
| --- | --- | --- |
| 400 | `PAYMENT_METHOD_NOT_SUPPORTED` | `ONLINE` nhưng chưa cấu hình (hoặc đơn còn chờ khi cấu hình bị tắt: 409) |
| 400 | `PAYMENT_NOT_REQUIRED` | `ONLINE` nhưng tổng đơn = 0đ |
| 400 | `WEBHOOK_PAYLOAD_INVALID` | Webhook thiếu/sai `id` hoặc `transferAmount` |
| 400 | `PAYMENT_TXN_ORDER_MISMATCH` | `transactionId` đang gắn với đơn khác |
| 401 | (không `code`) | Webhook thiếu/sai khóa API |
| 403 | (không `code`) | STAFF/CUSTOMER gọi route quản trị thanh toán |
| 403 | `ORDER_PAID_ADMIN_ONLY` | STAFF hủy đơn đã thanh toán |
| 404 | `ORDER_NOT_FOUND` | Đơn không tồn tại (hoặc của người khác với khách) |
| 404 | `PAYMENT_TXN_NOT_FOUND` | Giao dịch không tồn tại |
| 404 | (không `code`) | Webhook khi chưa cấu hình `SEPAY_WEBHOOK_API_KEY` |
| 409 | `ORDER_NOT_ONLINE` | `GET /orders/:code/payment` cho đơn COD |
| 409 | `ORDER_NOT_AWAITING_PAYMENT` | Admin xác nhận đơn không còn chờ thanh toán online |
| 409 | `ORDER_NOT_CANCELLABLE_BY_CUSTOMER` | Khách hủy đơn đã thanh toán |
| 409 | `PAYMENT_TXN_NOT_REVIEWABLE` | Giao dịch không nằm trong danh sách cần xử lý |
| 409 | `PAYMENT_TXN_ALREADY_RESOLVED` | Giao dịch đã được xử lý |

## Chưa làm / ghi chú

- Cổng VNPay (giai đoạn B), hoàn tiền tự động, yêu cầu hủy của Staff → Admin duyệt, đối soát định kỳ bằng API giao dịch của SePay, guest checkout online.
- Nội dung chuyển khoản dài 12 ký tự (`MS261105PKGA`); việc mọi app ngân hàng hiển thị đủ và QR được quét/điền đúng số tiền cần **thử tay**.
