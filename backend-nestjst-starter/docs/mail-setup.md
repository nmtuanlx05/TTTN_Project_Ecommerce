# Gửi mail (SMTP): cấu hình và cách thử

Có **hạ tầng gửi mail** (`MailService` dùng nodemailer, lệnh thử `npm run mail:test`) và **ba mail nghiệp vụ**, đều gửi qua hàng đợi `email` (xem `docs/queue-redis-setup.md`):

| Thư                              | Job                  | Khi nào đặt job                                                                   | Mục |
| -------------------------------- | -------------------- | --------------------------------------------------------------------------------- | --- |
| Chào mừng                        | `welcome`            | Sau khi `POST /auth/register` lưu user                                            | 6   |
| Đã nhận đơn hàng (COD và ONLINE) | `order-confirmation` | Sau khi transaction đặt đơn **commit**, chỉ với đơn **vừa tạo**                   | 7   |
| Đã nhận thanh toán (chỉ ONLINE)  | `payment-received`   | Sau khi xác nhận chuyển khoản **commit** và đơn **vừa** chuyển sang đã thanh toán | 8   |

Cùng một code chạy với **Mailpit** (dev, thư không ra khỏi máy) và **Gmail SMTP** (demo thật) chỉ bằng đổi biến môi trường.

## 1. Sáu biến môi trường

Khai báo trong `.env.development` (dev) hoặc `.env.production`. Biến có sẵn trong shell luôn thắng giá trị trong file. Mẫu ở `.env.example`.

| Biến            | Bắt buộc | Ý nghĩa                                                                                                         |
| --------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| `MAIL_HOST`     | Có       | Máy chủ SMTP, không có khoảng trắng                                                                             |
| `MAIL_PORT`     | Có       | Cổng SMTP (1-65535)                                                                                             |
| `MAIL_FROM`     | Có       | Người gửi: `no-reply@example.com` hoặc `Tên <no-reply@example.com>`                                             |
| `FRONTEND_URL`  | Có       | Địa chỉ **trang web (frontend)** dùng làm link trong mail, `http://` hoặc `https://`. Không phải URL backend    |
| `MAIL_USER`     | Không    | Tên đăng nhập SMTP. Rỗng/khoảng trắng = chưa đặt (Mailpit)                                                      |
| `MAIL_PASSWORD` | Không    | Mật khẩu SMTP. **Có `MAIL_USER` thì bắt buộc có `MAIL_PASSWORD`** (và ngược lại), nếu không app không khởi động |

Không có biến `MAIL_SECURE`. Cách suy ra:

- Cổng **465** → TLS ngay từ đầu (`secure: true`).
- Cổng khác → kết nối thường rồi nâng cấp **STARTTLS** (`secure: false`).
- Host **không phải máy cục bộ** (`127.0.0.1`, `localhost`, `::1`) → bắt buộc nâng cấp TLS (`requireTLS`): server không hỗ trợ TLS thì **từ chối gửi** chứ không gửi mật khẩu dạng rõ.

Thiếu/sai bất kỳ biến bắt buộc nào thì app dừng lúc khởi động, thông báo chỉ nêu **tên biến**, không in giá trị.

> **Đổi tên biến:** `APP_PUBLIC_URL` (nghĩa cũ: URL backend để ghép URL ảnh local) đã bỏ cùng driver ảnh local. `FRONTEND_URL` là biến mới, nghĩa khác.

## 2. Cấu hình mẫu 1: Mailpit (dev)

Mailpit là SMTP giả: nhận thư và hiện ở giao diện web, **không gửi ra Internet**. Dịch vụ `mailpit` nằm trong `docker-compose.yml` nên `npm run db:up` dựng cùng MySQL và Redis.

```
MAIL_HOST=127.0.0.1
MAIL_PORT=1025
MAIL_FROM=no-reply@example.com
MAIL_USER=
MAIL_PASSWORD=
FRONTEND_URL=http://localhost:5173
```

- SMTP: `127.0.0.1:1025`; giao diện xem thư: <http://127.0.0.1:8025>. Cả hai chỉ bind `127.0.0.1`.
- Thư chỉ nằm trong bộ nhớ container (tối đa 500 thư); tắt container là mất, đúng ý cho dev.

## 3. Cấu hình mẫu 2: Gmail + App Password (demo thật)

Gmail không cho dùng mật khẩu đăng nhập thường với SMTP. Cần **App Password** (mật khẩu ứng dụng):

1. Bật **xác minh 2 bước** cho tài khoản Google.
2. Vào <https://myaccount.google.com/apppasswords>, tạo mật khẩu ứng dụng (tên tùy ý). Google hiện chuỗi 16 ký tự (có thể có dấu cách).
3. Điền vào `.env.development` (hoặc `.env.production`):

```
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_FROM=Mono Studio <ten-ban@gmail.com>
MAIL_USER=ten-ban@gmail.com
MAIL_PASSWORD=<16 ký tự App Password, viết liền không dấu cách>
FRONTEND_URL=http://localhost:5173
```

- `MAIL_FROM` nên dùng đúng địa chỉ Gmail của `MAIL_USER`; Gmail thường ghi đè người gửi khác bằng chính địa chỉ đăng nhập.
- **Không bao giờ** commit `.env*` có mật khẩu thật. Lộ App Password thì thu hồi ngay ở trang App Passwords.
- Cổng 465 cũng dùng được (`MAIL_PORT=465`, TLS ngay từ đầu).
- Gmail cá nhân có hạn mức gửi mỗi ngày (khoảng vài trăm thư) và có thể khóa tạm nếu gửi dồn; chỉ phù hợp demo.

> **Chưa kiểm chứng:** hành vi với Gmail thật (xác thực, `requireTLS`, thư vào Spam) mới dựa trên tài liệu nodemailer/Google, chưa chạy thật. Chạy bước 4 và ghi lại kết quả.

## 4. Thử bằng tay: `npm run mail:test`

```
npm run mail:test -- someone@example.com
```

In ra cấu hình **không bí mật** (host:cổng, `secure`, `requireTLS`, có đăng nhập hay không), `messageId` và kết quả. **Không in** mật khẩu, `MAIL_USER`, `MAIL_FROM` hay địa chỉ người nhận. Mã thoát `0` = SMTP đã nhận thư; `1` = lỗi.

| Tình huống                                                 | Kết quả mong đợi                                                                                           |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Mailpit đang chạy                                          | Mã thoát 0; thư hiện ở <http://127.0.0.1:8025>                                                             |
| Tắt Mailpit (`docker stop ecommerce_mailpit`) rồi chạy lại | Mã thoát 1, dòng `Gửi mail thất bại qua 127.0.0.1:1025 (code=ECONNECTION...)`, trong vài giây (không treo) |
| Gmail, đúng App Password                                   | Mã thoát 0; thư tới hộp thư (có thể ở Spam)                                                                |
| Gmail, sai App Password                                    | Mã thoát 1, log có `code=EAUTH` `responseCode=535`; **không có** mật khẩu trong output                     |
| Thiếu `MAIL_HOST`                                          | Mã thoát 1, thông báo nêu tên biến thiếu                                                                   |

`mail:test` đọc `.env.development` (hoặc `.env.production` nếu `NODE_ENV=production`) như app.

## 5. Bảo mật và log

- Mật khẩu SMTP, `MAIL_USER` và địa chỉ người nhận **không bao giờ** xuất hiện trong log hay thông báo lỗi. Log lỗi gửi chỉ có `host:cổng` và các trường `code`/`responseCode`/`command` đã lọc theo dạng cho phép.
- `MailService` luôn ném lỗi **đã làm sạch** (câu cố định, không giữ lỗi gốc). Lý do: khi chạy qua hàng đợi, BullMQ lưu `failedReason` và stack của job lỗi vào Redis tới 7 ngày.
- Mọi lỗi gửi (kể cả quá hạn) đều làm lần gửi thất bại để hàng đợi thử lại theo cấu hình có sẵn (3 lần, giãn cách tăng dần).
- Thời gian chờ: nối 10 giây, lời chào SMTP 10 giây, socket im lặng 20 giây; hàng rào ngoài 30 giây cho cả lần gửi.
- Test tự động không bao giờ gửi mail thật: `nodemailer` bị thay bằng bản giả, và các test nạp `AppModule` chỉ có `MAIL_PORT=1` (không ai nghe).

## 6. Mail chào mừng sau đăng ký

**Luồng**

1. `POST /auth/register` tạo user ([auth.service.ts](../src/auth/auth.service.ts)), **sau khi đã lưu DB** thì đặt job `welcome` vào hàng đợi rồi trả 201 ngay (kiểu "bắn rồi quên"). Lỗi hàng đợi/Redis chỉ ghi log (mã lỗi), **không làm hỏng đăng ký**.
2. Chỉ đăng ký công khai mới gửi. **Admin tạo user bằng `POST /users` không gửi mail** (không hook ở `UsersService.create`).
3. Job chỉ chứa `{ userId }`, `jobId = welcome-<userId>`. Email/tên không nằm trong Redis.
4. Worker (`EmailProcessor`, chạy chung tiến trình khi `QUEUE_WORKER_ENABLED` khác `false`):
   - `userId` sai kiểu → bỏ qua (`{ skipped: 'INVALID_DATA' }`).
   - User không còn hoặc `isActive = false` → bỏ qua (`{ skipped: 'USER_GONE' }`), **không throw**.
   - Đọc voucher `MONO10` từ DB. Còn dùng được (bật, đúng khoảng thời gian, còn lượt; dùng lại `getVoucherStatus` của `src/orders/vouchers.rules.ts`) thì thư có khối voucher; **không tồn tại/không dùng được thì vẫn gửi, chỉ bỏ khối này**.
   - Dựng thư bằng hàm thuần `renderWelcome` (`src/mail/templates/welcome.template.ts`), gửi qua `MailService`.
   - Lỗi DB hoặc lỗi gửi mail → **throw**, BullMQ thử lại theo cấu hình có sẵn (3 lần, giãn cách 5s rồi 10s); hết lần thì job vào `failed` (giữ 7 ngày).
   - Kết quả job chỉ có cờ (`{ sent: true, voucherShown }`), không chứa email.

**Nội dung thư:** chỉ nói điều hệ thống làm thật. Ngưỡng miễn phí vận chuyển lấy từ `FREE_SHIPPING_THRESHOLD` (`src/orders/orders.constants.ts`). Thanh toán: COD hoặc chuyển khoản QR. Link dùng `FRONTEND_URL`: nút "Khám phá bộ sưu tập" và "Sản phẩm" → `/products`, "Đơn hàng của tôi" → `/tai-khoan/don-hang`. Lời chào: tên trống hoặc trùng phần trước `@` của email (BE tự đặt tên đó khi khách không nhập) thì "Xin chào bạn."; tên bị escape và cắt tối đa 60 ký tự. Mẫu gốc để tham chiếu thiết kế: `docs/mail-templates/welcome.design.html` (không sửa).

**Hằng số nội dung** (`src/mail/templates/mail-assets.ts`): `WELCOME_VOUCHER_CODE = 'MONO10'`, `HERO_IMAGE_URL = ''`.

> `MONO10` là voucher mẫu tạo bởi `prisma/seed.ts`; DB nào chưa seed thì thư không có khối voucher (không lỗi). Đây là **mã công khai dùng chung**, nên thư không ghi "quà riêng"/"đơn đầu tiên".

### Thêm ảnh hero từ Cloudinary

Mặc định không có ảnh hero. Muốn thêm:

1. Tải ảnh lên Cloudinary (kèm `https://res.cloudinary.com/<cloud>/image/upload/v<số>/<đường dẫn>.<đuôi>`).
2. Chèn đoạn biến đổi ngay sau `/upload/`: `f_jpg,q_auto,c_fill,w_1040,h_600/`, ví dụ `https://res.cloudinary.com/<cloud>/image/upload/f_jpg,q_auto,c_fill,w_1040,h_600/v<số>/<đường dẫn>.jpg`.
3. Dán URL đó vào `HERO_IMAGE_URL`.

Lưu ý: **không dùng `f_auto`, webp hay avif** (nhiều ứng dụng mail không hiển thị). Chỉ nhận URL `https`; giá trị khác bị bỏ và thư không có ảnh. Ảnh tĩnh ở `frontent-react-starter/public/home/` là webp và chỉ truy cập được khi `FRONTEND_URL` là địa chỉ công khai, nên không dùng cho mail.

### Thí nghiệm tay

Chuẩn bị: `npm run db:up` (Redis, MySQL, Mailpit), `.env.development` có `MAIL_*`, `FRONTEND_URL`, `REDIS_URL`, rồi `npm run dev`. Voucher `MONO10` cần có trong DB (`npx prisma db seed` nếu chưa; chạy lại an toàn). Xem thư ở <http://127.0.0.1:8025>.

| Thí nghiệm                                                                                                 | Kết quả mong đợi                                                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Đăng ký tài khoản mới (qua giao diện hoặc `POST /auth/register`)                                           | 201 ngay; vài giây sau có thư "Chào mừng bạn đến với MONO STUDIO" ở Mailpit; có khối mã `MONO10`; log worker `Đã gửi mail chào mừng userId=...`                                                       |
| Đăng ký với tên để trống                                                                                   | Thư "Xin chào bạn."                                                                                                                                                                                   |
| Dừng Mailpit (`docker stop ecommerce_mailpit`) rồi đăng ký                                                 | Vẫn 201. Worker log `Gửi mail thất bại qua 127.0.0.1:1025 (code=...)`, thử lại (5s rồi 10s), sau 3 lần job vào `failed`. `docker start ecommerce_mailpit` trước khi hết lần thử thì thư tới ở lần sau |
| Dừng Redis (`docker stop ecommerce_redis`) rồi đăng ký                                                     | Vẫn 201. Log cảnh báo `Không đặt được job mail chào mừng ... (code=...)`. **Không có thư** (job không được đặt). Kết nối Redis chập chờn thì thư có thể đến chậm                                      |
| Admin tạo user bằng `POST /users`                                                                          | Không có thư                                                                                                                                                                                          |
| Tắt `MONO10` (`PATCH /admin/vouchers/:id/status` `{ "isActive": false }`) hoặc đặt hạn đã qua, rồi đăng ký | Có thư nhưng **không có khối voucher**. Bật lại thì thư mới có khối                                                                                                                                   |

Xem job trong Redis: `docker exec -it ecommerce_redis redis-cli -a "$REDIS_PASSWORD" hgetall ecommerce:email:welcome-<userId>` (có `returnvalue` là đã xử lý).

## 7. Thư "Đã nhận đơn hàng"

**Khi nào bắn**

```
POST /orders ─► runWithRetry(transaction đặt đơn) ─► commit
                     │                                 │
                     ├─ replay Idempotency-Key ────────┼─► created=false ─► KHÔNG đặt job
                     └─ đơn mới ───────────────────────┴─► created=true  ─► addOrderConfirmation(id, mã)
lưới an toàn P2002 (trả đơn đã có) ──────────────────────────────────────► KHÔNG đặt job
```

1. `OrdersService.create` ([orders.service.ts](../src/orders/orders.service.ts)): `createInTransaction` trả `{ order, created }`. Chỉ khi `created` mới gọi hook, và gọi **sau** `runWithRetry` (đặt trong transaction thì bị lặp khi P2034 làm chạy lại cả transaction).
2. Hook kiểu "bắn rồi quên" như mail chào mừng: lỗi đồng bộ hay reject của hàng đợi chỉ ghi log `orderId` + mã lỗi đã lọc (`src/queue/safe-error-code.ts`), **không làm hỏng đặt hàng**. Không log email, tên, địa chỉ, SĐT.
3. Job chỉ chứa `{ orderId }`; `jobId = order-confirmation-<mã đơn>` (`src/queue/job-ids.ts`, nối bằng `-` vì BullMQ cấm `:` và jobId dạng số nguyên).
4. Worker đọc lại đơn và dòng hàng (snapshot `order_items`), **không đọc** `customerPhone`, `addressLine`, `note`, `shippingAddress`. Người nhận là `orders.customerEmail` (chụp lúc đặt), không đọc `User.email`. Thứ tự kiểm (bỏ qua = `{ skipped }`, không throw):
   - `orderId` sai kiểu → `INVALID_DATA`; không có đơn → `ORDER_NOT_FOUND`; `customerEmail` rỗng → `NO_EMAIL`; không có dòng hàng → `NO_ITEMS`;
   - đơn đã `CANCELLED` lúc worker chạy → `ORDER_CANCELLED`;
   - ONLINE chưa trả: thiếu `paymentExpiresAt` (dữ liệu hỏng; đơn ONLINE luôn có hạn lúc tạo) → `NO_PAYMENT_DEADLINE`; đã quá hạn mà tác vụ hết hạn chưa kịp hủy → `PAYMENT_EXPIRED`.
5. Khối thanh toán theo trạng thái **lúc gửi**: COD → "Thanh toán khi nhận hàng"; ONLINE chưa trả → khung vàng "Vui lòng chuyển khoản trước `dd/MM/yyyy HH:mm` (giờ VN). Quá hạn, đơn sẽ tự hủy." + nút "Thanh toán ngay" (`/thanh-toan-online/<mã>`); ONLINE đã trả → ghi chú "Đã thanh toán", không link, không hạn. Thư **không** có số tài khoản hay QR.
6. Mọi số tiền là giá trị đã lưu trong đơn (không tính lại). Địa chỉ rút gọn: phường/xã, quận/huyện, tỉnh/thành có giá trị (không số nhà, không SĐT, không ghi chú). Ảnh sản phẩm lấy từ `order_items.imageUrl`, chỉ `https`; URL Cloudinary dạng `/image/upload/v<số>/` được chèn `f_jpg,q_auto,c_fill,w_168,h_210` (`src/mail/email-image-url.ts`); không có ảnh hợp lệ thì dòng chỉ có chữ.
7. Lỗi DB, `FRONTEND_URL` sai hoặc lỗi gửi → **throw**, BullMQ thử lại. Kết quả job: `{ sent: true, payment: 'COD' | 'ONLINE_PENDING' | 'ONLINE_PAID' }`.

Mẫu: `src/mail/templates/order-confirmation.template.ts`, thiết kế gốc `docs/mail-templates/order-confirmation.design.html` (không sửa). Phần dùng chung với thư thanh toán ở `order-mail-parts.ts`.

## 8. Thư "Đã nhận thanh toán"

**Khi nào bắn**

```
webhook SePay ──────────────┐
                            ├─► confirmBankTransfer ─► runWithRetry(transaction) ─► commit
admin confirm-payment ──────┘          │                        │
                                       │                        ├─ CONFIRMED (đủ hoặc THỪA tiền) ─► addPaymentReceived(id, mã)
                                       │                        └─ NEEDS_REVIEW (thiếu tiền, đã trả, đơn đóng, không khớp) ─► KHÔNG
                                       └─ trùng (provider, providerTxnId) ─► DUPLICATE ─► KHÔNG
```

1. Cả hai cửa vào (webhook `POST /payments/webhook/sepay` và `POST /admin/orders/:id/confirm-payment`) đều gọi `PaymentsService.confirmBankTransfer` ([payments.service.ts](../src/payments/payments.service.ts)), nên chỉ có **một** điểm đặt job. `confirmInTransaction` trả kết quả nội bộ `{ outcome, confirmedOrder }`; `confirmedOrder` chỉ khác `null` khi transaction vừa chuyển đơn `PENDING_PAYMENT → PENDING` (PAID). Kết quả công khai `ConfirmResult` và phản hồi HTTP **không đổi**.
2. Không dựa vào `paymentStatus`: đơn COD hoàn tất cũng thành `PAID` nhưng không đi qua hàm này, nên không bao giờ có thư này. Không hook trong `OrderWorkflowService.transition`.
3. Hook "bắn rồi quên" như mục 7: lỗi hàng đợi không làm hỏng webhook (SePay vẫn nhận phản hồi thành công) hay thao tác của admin.
4. Job chỉ chứa `{ orderId }`; `jobId = payment-received-<mã đơn>`.
5. Worker: `INVALID_DATA` → `ORDER_NOT_FOUND` → `NO_EMAIL` → `NO_ITEMS` → không phải ONLINE hoặc chưa `PAID` (`NOT_PAID`) → đơn đã `CANCELLED` (`ORDER_CANCELLED`: Admin hủy đơn đã trả và hoàn tiền ngoài hệ thống; thanh tiến độ trong thư sẽ gây hiểu lầm) → thiếu `paidAt` (`NO_PAID_AT`: dữ liệu hỏng, vì `paidAt` luôn được ghi khi xác nhận). Đơn đã được Staff xác nhận/giao khi worker chạy (vẫn `PAID`) thì **vẫn gửi**.
6. "Số tiền đã thanh toán" là `totalAmount` **đã lưu của đơn**, không phải số tiền khách chuyển. **Thừa tiền** vẫn có thư, thư không nhắc phần thừa; khoản thừa Admin xử lý ngoài hệ thống (giao dịch có `reviewReason = OVERPAID` ở `GET /admin/payments/transactions`). Thời gian lấy từ `orders.paidAt` (giờ VN). Câu tiếp theo trung tính: "Bạn có thể theo dõi trạng thái đơn trong mục Đơn hàng của tôi." (thư có thể đến sau khi đơn đã đổi trạng thái). Thư ghi rõ "không phải hóa đơn VAT".

Mẫu: `src/mail/templates/payment-received.template.ts`, thiết kế gốc `docs/mail-templates/payment-confirmation.design.html` (không sửa).

> **Trang Admin "giao dịch" chỉ liệt kê giao dịch cần xử lý** (`reviewReason` khác null). Một khoản chuyển đủ tiền, khớp đơn không bao giờ hiện ở đó; xem trạng thái đơn để biết đã thanh toán.

## 9. Thí nghiệm tay cho thư đơn hàng (Mailpit hoặc Gmail)

Chuẩn bị như mục 6 (`npm run db:up`, `npm run dev`). Gmail: đổi biến theo mục 3, thư tới hộp thư thật (có thể vào Spam). Đơn ONLINE cần cấu hình `VIETQR_*` (xem `docs/api/payments.md`).

| Thí nghiệm                                                                                   | Kết quả mong đợi                                                                                                                 |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Đặt đơn COD                                                                                  | 201; một thư "MONO STUDIO · Đơn hàng #MS-… đã được ghi nhận", khối "Thanh toán khi nhận hàng", địa chỉ rút gọn, không SĐT/số nhà |
| Đặt đơn ONLINE                                                                               | Thư có khung vàng, hạn thanh toán giờ VN (giờ đặt + 30 phút), nút "Thanh toán ngay"; không số tài khoản, không QR                |
| `POST /orders` hai lần cùng header `Idempotency-Key`                                         | Cùng mã đơn, **chỉ một** thư xác nhận                                                                                            |
| Xác nhận thanh toán đơn ONLINE (webhook qua ngrok, xem mục 10, hoặc Admin xác nhận thủ công) | Thư "MONO STUDIO · Đã nhận thanh toán cho đơn hàng #MS-…", số tiền = tổng đơn                                                    |
| Gửi lại **cùng** webhook (cùng `id` giao dịch) hoặc Admin xác nhận lần hai                   | Webhook trả `DUPLICATE`; Admin nhận 409 `ORDER_NOT_AWAITING_PAYMENT`; **không** có thư thứ hai                                   |
| Webhook thiếu tiền                                                                           | Giao dịch `NEEDS_REVIEW` (`UNDERPAID`), **không** có thư thanh toán                                                              |
| Dừng Redis (`docker stop ecommerce_redis`) rồi đặt đơn / xác nhận thanh toán                 | Vẫn 201 / 200. Log cảnh báo `Không đặt được job thư … orderId=… (code=…)`. Không có thư                                          |
| Dừng Mailpit rồi đặt đơn                                                                     | Vẫn 201. Worker thử lại 3 lần rồi job vào `failed`; bật lại Mailpit **không** tự gửi bù                                          |

Xem job trong Redis: `hgetall ecommerce:email:order-confirmation-<mã đơn>` hoặc `ecommerce:email:payment-received-<mã đơn>` (lệnh `redis-cli` như mục 6); `returnvalue` không có email hay tên.

## 10. Webhook SePay ở máy dev (ngrok)

SePay gọi webhook từ Internet nên **không tới được `localhost`**. Không có đường hầm thì chuyển khoản thật không bao giờ làm đơn thành "đã thanh toán" (màn hình khách vẫn chờ) và trang giao dịch của Admin trống.

1. Backend chạy (`npm run dev`, cổng 3000); `.env.development` có `SEPAY_WEBHOOK_API_KEY` (thiếu thì webhook trả 404).
2. Terminal khác: `ngrok http 3000`. Lần đầu có thể cần `ngrok config add-authtoken <token>` (lấy ở dashboard ngrok). Chép URL `https://….ngrok-free.app` ở dòng `Forwarding`.
3. Trên SePay: URL webhook `https://….ngrok-free.app/payments/webhook/sepay`, xác thực **API Key** đúng giá trị `SEPAY_WEBHOOK_API_KEY`, chỉ nhận tiền vào.
4. Theo dõi request ở <http://127.0.0.1:4040>: 200 = thông; 404 = thiếu khóa ở backend; 401 = khóa trên SePay khác backend; không có request = URL trên SePay sai.
5. URL ngrok bản miễn phí **đổi mỗi lần chạy lại**: dán lại vào SePay. Tắt ngrok (Ctrl+C) ngay khi thử xong vì đường hầm công khai cả backend.

Không cần chuyển tiền thật: dùng script curl ở `docs/api/payments.md` ("Thử webhook ở máy"), thay `http://localhost:3000` bằng URL ngrok nếu muốn thử cả đường hầm.

## 11. Hạn chế đã biết

**Chung cho mọi thư qua hàng đợi**

- **Mất việc khi Redis chết đúng lúc đặt job** (chưa có outbox): lỗi chỉ ghi log `userId`/`orderId` + mã lỗi; người dùng không nhận thư, không tự gửi bù.
- **Có thể gửi trùng** khi SMTP đã nhận thư nhưng lần gửi bị coi là lỗi (quá hạn 30 giây trước khi có phản hồi) rồi BullMQ thử lại.
- **`jobId` cố định chỉ chặn trùng trong thời gian job còn trong Redis**: khoảng **1 giờ** với job đã xong, **7 ngày** với job lỗi. Thư đơn hàng không phụ thuộc vào lớp này vì job chỉ được đặt **một lần** tại đúng nơi trạng thái đổi; `jobId` chỉ là lớp chặn phụ.
- **Không có sổ tra cứu** thư đã gửi: chỉ biết qua log và Redis.
- **Gửi lỗi vĩnh viễn** (địa chỉ sai) không phân biệt với lỗi tạm thời: vẫn thử 3 lần rồi `failed`; thư bị trả về (bounce) sau khi SMTP đã nhận thì hệ thống không biết.
- **Không có hủy nhận email / đồng ý nhận mail** (chưa có mail quảng cáo). Làm thật cần cột lưu đồng ý, endpoint công khai nhận token ký có hạn và trang FE.
- **Không xác minh email, không giới hạn tốc độ đăng ký** (`/auth/register`): ai cũng có thể làm hệ thống gửi thư tới một địa chỉ bất kỳ.
- Chưa giới hạn tốc độ gửi theo hạn mức của nhà cung cấp SMTP.
- **`FRONTEND_URL` là `localhost`** thì link trong thư chỉ mở được trên máy dev. **CORS đang gắn cứng `http://localhost:5173`** ([main.ts:14](../src/main.ts#L14)), chưa đọc `FRONTEND_URL`.
- Chưa kiểm chứng với Gmail thật và các ứng dụng mail thật (phông chữ, ảnh, thư vào Spam): xem mục 3.

**Riêng thư đơn hàng**

- **Thư "Đã nhận thanh toán" có thể đến trước thư "Đã nhận đơn hàng"**, ví dụ khi thư xác nhận đơn đang chờ thử lại (5s, 10s) mà khách đã chuyển khoản; lúc đó thư xác nhận đơn hiện khối "Đã thanh toán".
- **Thừa tiền**: thư thanh toán chỉ ghi tổng tiền đơn; phần thừa Admin xử lý ngoài hệ thống.
- **Ảnh Cloudinary trong thư tạo thêm biến thể ảnh** `168x210` cho mỗi ảnh sản phẩm, tính vào hạn mức gói (chưa kiểm chứng giới hạn gói miễn phí, xem `docs/cloudinary-setup.md`). URL Cloudinary không có `v<số>/` được giữ nguyên (ảnh gốc, nặng hơn).
- **Dữ liệu hành chính đang ở chuẩn cũ 3 cấp** (63 tỉnh/696 quận huyện, trước 01/07/2025); địa chỉ rút gọn bỏ qua cấp trống nên vẫn đúng khi sau này bỏ cấp huyện.
- **Thành phần dùng chung giữa mẫu chào mừng và mẫu đơn hàng đang chép tay**: font, `<head>`/CSS, khung bảng, chân thư trong `order-mail-parts.ts` chép từ `welcome.template.ts` (có ghi chú "ĐỒNG BỘ TAY"). Sửa giao diện chung phải sửa cả hai nơi.
- **Tác vụ hết hạn không hủy đơn ONLINE có `paymentExpiresAt = null`** (lọc `paymentExpiresAt <= now`): đơn như vậy treo ở `PENDING_PAYMENT`. Đơn ONLINE luôn được đặt hạn lúc tạo nên chỉ xảy ra khi dữ liệu bị sửa tay; worker bỏ qua thư với `NO_PAYMENT_DEADLINE`.
- Thư không hứa ngày giao, mã vận đơn, đổi trả, hoàn tiền tự động hay hóa đơn vì hệ thống chưa làm những việc đó.

**Riêng thư chào mừng**

- **`MONO10` là mã công khai dùng chung**, ai cũng dùng được nhiều lần tới khi hết lượt; mã còn hiện ở `GET /vouchers/available`.
- Đổi trả, hỗ trợ khách, địa chỉ cửa hàng không có trong thư vì hệ thống chưa làm thật.

**Hướng phát triển:** bảng `email_logs` (loại thư, đối tượng, trạng thái, `messageId`, `UNIQUE(type, referenceId)`) để chống gửi trùng bền vững và tra cứu; hoặc **outbox** (ghi "việc cần gửi" trong cùng transaction với đơn/thanh toán, tiến trình riêng đẩy vào hàng đợi) để không mất thư khi Redis chết; hủy nhận email; voucher riêng theo user; giới hạn tốc độ đăng ký và xác minh email; tách phần dùng chung của các mẫu thư; trang chính sách ở FE.
