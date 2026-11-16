# Test trên MySQL thật

Tài liệu này dành cho người mới: giải thích bộ test chạy trên **MySQL thật** (không dùng Prisma giả), cách chạy ở máy
dev và cách đọc kết quả.

## 1. Vì sao cần bộ test này?

Các lệnh `npm test` (unit) và `npm run test:e2e` đều dùng **Prisma giả**: chúng kiểm tra logic code nhưng KHÔNG kiểm tra
được những thứ chỉ MySQL thật mới làm:

- migration có chạy được từ đầu không, có tạo đúng bảng và ràng buộc `CHECK` không;
- khóa dòng `SELECT ... FOR UPDATE` khi nhiều request đặt đơn cùng lúc (chống bán vượt tồn, chống dùng quá lượt voucher);
- ràng buộc `CHECK`/`UNIQUE` của database có thật sự chặn dữ liệu sai không.

Bộ test này nằm **tách riêng** khỏi `npm test` và `npm run test:e2e` (thư mục `test/db/`, đuôi file `.db-spec.ts`), nên hai
lệnh cũ vẫn chạy nhanh và không cần Docker.

> Tiến độ: **PR A** (đã merge) gồm hạ tầng, chốt chặn an toàn và kiểm tra migration. **PR B** thêm các test
> chống bán vượt tồn, voucher, `Idempotency-Key`, ràng buộc dữ liệu và mức cô lập transaction (mục 9).

## 2. Các thành phần

| File | Vai trò |
|---|---|
| `docker-compose.test.yml` | Dựng MySQL 8.0 tạm, cổng **3308**, DB `ecommerce_test`, dữ liệu trên RAM (tmpfs) |
| `scripts/assert-test-db.ts` | Chốt chặn an toàn: từ chối nếu `DATABASE_URL` có vẻ trỏ vào DB đang dùng |
| `test/db/jest-db.json` | Cấu hình Jest riêng cho bộ test này |
| `test/db/global-setup.ts` | Chạy một lần trước mọi test: kiểm tra chốt chặn và thử kết nối |
| `test/db/helpers/prisma-client.ts` | Tạo `PrismaClient` thật nối vào DB test (luôn qua chốt chặn) |
| `test/db/guard.db-spec.ts` | Test cho chính chốt chặn |
| `test/db/schema-migrations.db-spec.ts` | Kiểm tra migration trên DB trống |
| `test/db/setup-env.ts` | Đặt biến JWT giả trước khi nạp ứng dụng (không đặt `DATABASE_URL`) |
| `test/db/helpers/reset-db.ts` | Xóa sạch dữ liệu giữa các test (qua chốt chặn và kiểm `SELECT DATABASE()`) |
| `test/db/helpers/factories.ts` | Dựng dữ liệu thật: sản phẩm, biến thể, người mua kèm giỏ, voucher |
| `test/db/helpers/app.ts`, `auth.ts` | Dựng `AppModule` thật (ghi đè hai cron), ký JWT giả |
| `test/db/helpers/checkout.ts` | Gọi `POST /orders` qua HTTP và đếm phản hồi (`tally`) |
| `test/db/checkout-overselling.db-spec.ts` | Chống bán vượt tồn, deadlock |
| `test/db/checkout-voucher.db-spec.ts` | Lượt voucher cuối |
| `test/db/checkout-idempotency.db-spec.ts` | `Idempotency-Key` trùng đồng thời |
| `test/db/constraints.db-spec.ts` | Ràng buộc CHECK và UNIQUE |
| `test/db/transaction-isolation.db-spec.ts` | Mức cô lập transaction của adapter |

DB test **tách hẳn** DB dev: khác project Docker (`ecommerce_test`), khác container (`ecommerce_mysql_test`), không có
volume bền, nên `npm run db:test:down` không thể xóa dữ liệu dev.

## 3. Chốt chặn an toàn

Test sẽ ghi và xóa dữ liệu, nên nó **tự từ chối chạy** nếu `DATABASE_URL`:

1. chưa được đặt (không bao giờ tự đọc `.env*`, để khỏi nhầm sang DB dev);
2. không trỏ về máy cục bộ (`127.0.0.1`, `localhost`, `::1`);
3. dùng cổng **3307** (DB dev) hoặc **3306** (MySQL cài sẵn trên máy), kể cả khi không ghi cổng (mặc định là 3306);
4. có tên DB không **kết thúc bằng `_test`** (ví dụ `ecommerce_test` hợp lệ; `ecommerce`, `test_ecommerce` thì không).

Chốt chặn chạy ở ba nơi: trước `prisma migrate deploy` (`db:test:migrate`), trong `global-setup.ts`, và trong mọi helper
truy cập DB. Thông báo lỗi chỉ in host, cổng, tên DB, **không bao giờ in mật khẩu**.

Đây là lớp phòng thủ, không phải bảo đảm tuyệt đối: nếu ai cố tình đặt tên DB production kết thúc bằng `_test` và trỏ
vào cổng lạ trên máy cục bộ thì vẫn lọt. Hãy luôn kiểm tra `DATABASE_URL` trước khi chạy.

## 4. Chạy ở máy dev

Cần Docker. Chạy trong thư mục `backend-nestjst-starter`. `DATABASE_URL` đặt **ngay trước lệnh** (không sửa file `.env`):

```bash
# 1) Dựng MySQL tạm và chờ tới khi healthy (lần đầu kéo image khoảng vài chục giây)
npm run db:test:up

# 2) Áp toàn bộ migration lên DB trống (prisma migrate deploy, KHÔNG phải migrate dev)
DATABASE_URL='mysql://root:test_only_password@127.0.0.1:3308/ecommerce_test' npm run db:test:migrate

# 3) Chạy bộ test trên MySQL thật
DATABASE_URL='mysql://root:test_only_password@127.0.0.1:3308/ecommerce_test' npm run test:db

# 4) Dọn dẹp (xóa container tạm và dữ liệu của nó)
npm run db:test:down
```

`test_only_password` là mật khẩu **giả** của DB tạm trong `docker-compose.test.yml`, không phải secret thật.
Cú pháp đặt biến ngay trước lệnh chạy trên Linux/macOS (giống `start:prod`).

Muốn chạy lại từ DB trống: `npm run db:test:down` rồi lại làm từ bước 1 (dữ liệu nằm trên RAM nên mỗi lần dựng là một DB mới).

## 5. Chạy trên GitHub Actions

Job `integration` trong `.github/workflows/backend-ci.yml` làm đúng các bước ở mục 4 trên runner (dựng compose, migrate,
`test:db`). Khi lỗi, log của MySQL được in ra để dễ tìm nguyên nhân; DB tạm luôn được dọn.

## 6. Test migration kiểm tra những gì?

`schema-migrations.db-spec.ts` kiểm tra DB sau khi áp migration từ đầu:

- máy chủ là MySQL 8.0, `utf8mb4` / `utf8mb4_unicode_ci` giống `docker-compose.yml`;
- bảng `_prisma_migrations` có đủ **mọi thư mục trong `prisma/migrations`**, tất cả đã hoàn tất và không bị rollback
  (số lượng được đếm theo thư mục, không ghi cứng);
- có đúng các bảng của `schema.prisma` (mỗi `@@map` một bảng) cộng `_prisma_migrations`;
- mọi bảng nghiệp vụ dùng `utf8mb4_unicode_ci`;
- có đúng **20 ràng buộc CHECK** viết tay (so theo danh sách tên) và tất cả đang `ENFORCED`. Prisma không khai báo được
  CHECK trong schema nên danh sách nằm trong test; khi thêm CHECK bằng migration mới, phải cập nhật danh sách đó
  **có chủ đích**;
- chạy lại `migrate deploy` lần hai không áp thêm gì, và `migrate status` báo khớp;
- không có drift giữa DB và `schema.prisma` (`prisma migrate diff --exit-code`, không cần shadow database).

## 7. Cách đọc kết quả

Thành công trông như:

```
PASS test/db/guard.db-spec.ts
PASS test/db/schema-migrations.db-spec.ts
Test Suites: 2 passed, 2 total
```

Khi lỗi, gặp nhiều nhất:

| Thông báo | Nguyên nhân và cách xử lý |
|---|---|
| `Từ chối chạy: chưa đặt DATABASE_URL` | Quên đặt biến ngay trước lệnh |
| `Từ chối chạy: cổng 3307 ...` / `cổng 3306 ...` | URL đang trỏ vào DB dev hoặc MySQL cài sẵn. **Dừng lại** và sửa URL về cổng 3308 |
| `Từ chối chạy: tên DB ... phải kết thúc bằng "_test"` | Tên DB sai |
| `Không kết nối được DB test ...` | Chưa chạy `npm run db:test:up`, container chưa healthy, hoặc cổng 3308 bị chiếm |
| `relation/table ... doesn't exist` hoặc lệch số bảng | Chưa chạy `npm run db:test:migrate` trước `test:db` |
| `migrate diff (CÓ LỆCH ...)` | `schema.prisma` và các migration không khớp nhau: đây là phát hiện thật, đừng nới test; xem nội dung diff in kèm |
| Lệch danh sách CHECK | Một migration đã thêm/bớt CHECK: kiểm tra có chủ đích rồi cập nhật danh sách trong test |

Nếu test tìm ra hành vi khác tài liệu hoặc lỗi thật của hệ thống, **đừng sửa test cho qua**: ghi lại log và báo để quyết
định xử lý nghiệp vụ.

## 8. Chạy riêng một file

Thêm tên file (hoặc một phần tên) sau `--`:

```bash
DATABASE_URL='mysql://root:test_only_password@127.0.0.1:3308/ecommerce_test' npm run test:db -- checkout-voucher
```

`npm run db:test:up` và `db:test:migrate` chỉ cần chạy một lần cho mỗi lần dựng DB; chạy `test:db` nhiều lần liên tiếp được
(mỗi file tự dọn dữ liệu trước từng test).

## 9. Các test đồng thời và ràng buộc (PR B)

### 9.1 Cách một test đồng thời hoạt động

1. `reset-db.ts` xóa sạch dữ liệu, `factories.ts` dựng sản phẩm, biến thể (có tồn), N người mua mỗi người một giỏ.
2. `app.ts` khởi động **ứng dụng thật** (cùng `AppModule`, cùng pool 10 kết nối tới MySQL như khi chạy thật), chỉ thay hai tác vụ
   định kỳ (hủy đơn hết hạn, dọn ảnh) để chúng không tự chạy trong lúc test.
3. Test bắn `POST /orders` của TẤT CẢ người mua **cùng lúc** (`Promise.all`) qua HTTP.
4. Test đếm phản hồi bằng `tally`, rồi **đọc lại DB** để kiểm tra tồn kho, số đơn, lượt voucher, giỏ hàng.

Vì sao qua HTTP chứ không gọi thẳng service? Vì lỗi như hết kết nối trong pool hay timeout transaction chỉ lộ ra ở đường đi thật,
và mã phản hồi (201 / 409 / không có 500) chính là thứ cần khẳng định.

### 9.2 Đọc thông báo lỗi của test đồng thời

Mỗi ca so sánh **nguyên bảng đếm** `mã HTTP[:mã lỗi] -> số lượng`. Ví dụ kỳ vọng:

```
{ '201': 5, '409:CART_ITEMS_UNAVAILABLE': 20 }   // 5 người mua được, 20 người bị báo hết hàng
```

Khi lỗi, Jest in phần khác biệt. Cách đọc:

| Thấy trong khác biệt | Ý nghĩa |
|---|---|
| `'201': 6` thay vì 5 | **Bán vượt tồn** (nghiêm trọng): dừng lại và báo |
| `'500': n` | Lỗi không lường trước (vd hết kết nối pool, P2028): đọc log của ứng dụng |
| `'409:SYSTEM_BUSY': n` | Deadlock/xung đột xảy ra quá 3 lần thử lại |
| `'400:VOUCHER_USAGE_LIMIT'` ít hơn kỳ vọng | Có đơn dùng vượt lượt voucher |
| `'201': 2` thay vì 1 ở test Idempotency | Một khách có 2 đơn từ cùng một khóa |

Đừng sửa số kỳ vọng cho test xanh. Test đỏ là phát hiện cần xử lý có chủ đích.

### 9.3 Nhóm test và điều mỗi nhóm chứng minh

- **Chống bán vượt tồn** (`checkout-overselling`): tồn 5 với 25 khách (lặp 3 vòng), mua nhiều cái một đơn, không giữ chỗ một phần,
  và hai giỏ có thứ tự dòng ngược nhau (A,B) và (B,A) để thử deadlock. Cố ý dùng nhiều khách hơn pool 10 kết nối.
- **Lượt voucher** (`checkout-voucher`): mỗi khách tồn riêng nên giới hạn duy nhất là lượt voucher; đơn bị từ chối vì hết lượt
  không được giữ chỗ tồn kho; voucher không giới hạn đếm đúng 12 lượt (không "mất lượt").
- **Idempotency-Key** (`checkout-idempotency`): 10 request cùng khóa chỉ tạo 1 đơn, 1 lần giữ chỗ, 1 lượt voucher; key khác nhau
  hoặc không có key thì chỉ 1 đơn (còn lại `409 CART_EMPTY`); cùng khóa nhưng khác khách thì mỗi người có đơn riêng.
- **CHECK/UNIQUE** (`constraints`): từng ca xuất phát từ bản ghi hợp lệ rồi chỉ đổi một trường, và phải đúng **tên** ràng buộc.
  UNIQUE kiểm cả quy tắc collation (email/mã voucher khác hoa-thường, màu khác hoa-thường hoặc khác dấu thông thường coi là một)
  và việc MySQL cho nhiều giá trị `NULL` trong khóa duy nhất.
  **Ngoại lệ đã đo:** `utf8mb4_unicode_ci` KHÔNG coi `đ` = `d`, nên `Đen` và `den` là hai màu khác nhau ở DB. Test ghi nhận đúng hành
  vi này (không phải mong muốn), còn việc coi chúng là một chỉ do `fold()` ở tầng service. Đây là ví dụ test trên DB thật sửa lại một
  câu sai trong tài liệu.
  Ghi chú: `chk_product_variants_stock` (tồn không âm) về logic **dư thừa** so với `chk_product_variants_reserved`
  (`0 <= reserved <= stock`), nên khi `stock` âm MySQL có thể báo một trong hai tên; test chấp nhận cả hai.
- **Mức cô lập** (`transaction-isolation`): đo bằng **hành vi**, không đọc biến. Trong transaction, đọc hai lần quanh một thay đổi
  đã commit từ kết nối khác: `READ COMMITTED` thấy giá trị mới ở lần đọc thứ hai, `REPEATABLE READ` thì không. Nhờ đó biết
  `isolationLevel: ReadCommitted` mà `OrdersService` truyền vào có thật sự được MySQL áp dụng, và không "rò" sang transaction sau
  trên cùng kết nối.
  **Bài học đo lường:** lần chạy đầu tôi đọc `SELECT @@transaction_isolation` và nhận `REPEATABLE-READ` dù transaction đã chạy
  `READ COMMITTED`. Prisma đặt mức cho transaction bằng `SET TRANSACTION ISOLATION LEVEL` (chỉ áp cho MỘT transaction kế tiếp),
  còn biến kia là mức của phiên. Một phép đo sai có thể báo "lỗi" giả; luôn kiểm bằng hành vi khi có thể.
- **Cột có kiểu giới hạn:** `colorHex` là `VARCHAR(7)`, nên giá trị 9 ký tự bị chặn ở tầng kiểu cột (`P2000`, MySQL lỗi 1406) trước
  khi tới ràng buộc CHECK; test kiểm riêng điều này.

### 9.4 Giới hạn của test đồng thời

Chạy thấy xanh **không chứng minh** không có race, chỉ làm tăng xác suất phát hiện. Vì vậy các ca chính lặp nhiều vòng.
Hiện chưa phủ: hủy đơn đồng thời, xác nhận thanh toán đua với hết hạn thanh toán, thanh toán online (VietQR/SePay).

## 10. Giới hạn cần biết

- Test chỉ chạy trên Linux/macOS (cú pháp biến môi trường inline) và cần Docker.
- Image `mysql:8.0` là tag trôi: bản vá có thể đổi theo thời gian (giống `docker-compose.yml`).
- Dữ liệu trên tmpfs khác ổ đĩa thật ở độ bền, nhưng không ảnh hưởng hành vi khóa/transaction cần kiểm thử.
- Test chạy tuần tự (`--runInBand`) vì các file dùng chung một DB.
