# Gửi mail (SMTP): cấu hình và cách thử

Có **hạ tầng gửi mail** (`MailService` dùng nodemailer, lệnh thử `npm run mail:test`) và **một mail nghiệp vụ**: mail chào mừng sau khi đăng ký, gửi qua hàng đợi `email` (xem `docs/queue-redis-setup.md`).

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

## 7. Hạn chế đã biết

- **`MONO10` là mã công khai dùng chung**, ai cũng dùng được nhiều lần tới khi hết lượt (hệ thống chưa có voucher riêng theo user, chưa có "đơn đầu tiên"); mã còn hiện ở `GET /vouchers/available` cho mọi khách.
- **Không có hủy nhận email**: chưa có mail quảng cáo nên thư chào mừng không có liên kết hủy. Làm thật cần cột lưu đồng ý, endpoint công khai nhận token ký có hạn, và trang FE.
- **Không xác minh email, không giới hạn tốc độ đăng ký** (`/auth/register`): ai cũng có thể làm hệ thống gửi thư tới một địa chỉ bất kỳ. Thư chào mừng không chứa liên kết kích hoạt hay mật khẩu để giảm tác hại.
- **Có thể gửi trùng** khi job bị ném lại sau hơn 1 giờ (hàng đợi chỉ nhớ job đã xong 1 giờ, sau đó `jobId` cố định không còn chặn được), hoặc khi SMTP đã nhận thư nhưng lần gửi bị coi là lỗi (quá hạn trước khi nhận phản hồi) rồi thử lại.
- **Không có sổ tra cứu** thư đã gửi: chỉ biết qua log và Redis (job xong giữ 1 giờ, job lỗi 7 ngày).
- Mất job khi Redis chết đúng lúc đăng ký (lỗi chỉ ghi log): người dùng không nhận thư chào mừng.
- Chưa giới hạn tốc độ gửi theo hạn mức của nhà cung cấp.
- Đổi trả, hỗ trợ khách, địa chỉ cửa hàng không có trong thư vì hệ thống chưa làm thật (trang chính sách ở FE chưa có nội dung).
- **`FRONTEND_URL` là `localhost`** thì link trong thư chỉ mở được trên máy dev.
- **CORS đang gắn cứng `http://localhost:5173`** ([main.ts:14](../src/main.ts#L14)), chưa đọc `FRONTEND_URL`: đổi `FRONTEND_URL` sang địa chỉ khác thì phải sửa cả CORS.
- Chưa kiểm chứng với Gmail thật và với các ứng dụng mail thật (hiển thị phông chữ, ảnh): xem mục 3.

**Hướng phát triển:** bảng `email_logs` (loại thư, đối tượng, trạng thái, `messageId`, `UNIQUE(type, referenceId)`) để chống gửi trùng bền vững và tra cứu; hủy nhận email; voucher riêng theo user (cần cột `perUserLimit`/gắn user); giới hạn tốc độ đăng ký và xác minh email; trang chính sách ở FE.
