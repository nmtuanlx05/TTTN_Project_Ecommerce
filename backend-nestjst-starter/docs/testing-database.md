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

> Tiến độ: **PR A** (tài liệu này) gồm hạ tầng, chốt chặn an toàn và kiểm tra migration. **PR B** sẽ thêm các test
> chống bán vượt tồn, voucher, `Idempotency-Key` và ràng buộc dữ liệu.

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

## 8. Giới hạn cần biết

- Test chỉ chạy trên Linux/macOS (cú pháp biến môi trường inline) và cần Docker.
- Image `mysql:8.0` là tag trôi: bản vá có thể đổi theo thời gian (giống `docker-compose.yml`).
- Dữ liệu trên tmpfs khác ổ đĩa thật ở độ bền, nhưng không ảnh hưởng hành vi khóa/transaction cần kiểm thử.
- Test chạy tuần tự (`--runInBand`) vì các file dùng chung một DB.
