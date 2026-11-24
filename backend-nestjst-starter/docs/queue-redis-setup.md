# Hàng đợi Redis + BullMQ: cấu hình và cách thử

Tài liệu cho người mới. Hiện mới có **nền móng**: Redis, hàng đợi `email`, một worker, và job thử `ping`. Chưa có job nghiệp vụ nào (chưa gửi mail).

## 1. Hàng đợi là gì, và vì sao cần Redis

- **Hàng đợi (queue)**: danh sách việc cần làm. Code nghiệp vụ chỉ "đặt" một việc vào hàng rồi đi tiếp; việc nặng (như gửi mail) để người khác làm sau.
- **Job**: một việc trong hàng. Hiện chỉ có job `ping`.
- **Worker**: bộ phận nhặt job ra xử lý. Hiện chạy **chung tiến trình** với app (`npm run dev`).
- **Redis**: nơi lưu hàng đợi. BullMQ là thư viện dùng Redis để làm hàng đợi.
- Redis là **bắt buộc**: thiếu Redis thì app không khởi động (thà dừng rõ ràng còn hơn chạy mà âm thầm mất job).

Luồng: `EmailQueueService.addPing()` (đặt job) → Redis → `EmailProcessor` (worker) nhận và ghi log.

## 2. Bốn biến môi trường

Khai báo trong `.env.development` (dev) hoặc `.env.production` (production). Biến có sẵn trong shell luôn thắng giá trị trong file.

| Biến                   | Bắt buộc | Ý nghĩa                                                                                                                         | Dev                                                    | Production                                                                |
| ---------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------- |
| `REDIS_URL`            | Có       | Địa chỉ Redis, dạng `redis://máy:cổng` (thêm `/N` để chọn database số N)                                                        | `redis://127.0.0.1:6379` (Redis trong Docker của repo) | Địa chỉ Redis thật; dùng `rediss://` (hai chữ s) nếu nhà cung cấp bắt TLS |
| `REDIS_PASSWORD`       | Không    | Mật khẩu Redis. **Nếu có giá trị thì thắng mật khẩu nằm trong URL**                                                             | Để trống (Redis dev chỉ nghe 127.0.0.1)                | **Phải đặt, mật khẩu mạnh**                                               |
| `QUEUE_PREFIX`         | Không    | Tiền tố mọi khóa trong Redis; mặc định `ecommerce`                                                                              | Để mặc định                                            | Đặt riêng nếu nhiều môi trường dùng chung một Redis (vd `ecommerce-prod`) |
| `QUEUE_WORKER_ENABLED` | Không    | `false` = KHÔNG chạy worker trong tiến trình này (vẫn đặt được job). Không đặt hoặc `true` = chạy. Chỉ nhận đúng `true`/`false` | Bỏ trống                                               | Bỏ trống, hoặc `false` ở bản API nếu sau này có tiến trình worker riêng   |

Tên biến để thêm vào `.env.example` (không để giá trị thật):

```
REDIS_URL=redis://127.0.0.1:6379
REDIS_PASSWORD=
QUEUE_PREFIX=ecommerce
QUEUE_WORKER_ENABLED=true
```

### Mật khẩu Redis có HAI ĐẦU

Mật khẩu phải **khớp ở cả hai phía**, nếu lệch thì app báo lỗi kết nối:

1. **Phía Redis (server)**: Redis tự đặt bằng `--requirepass <mật khẩu>`, hoặc nhà cung cấp cloud tạo sẵn và cho bạn xem.
2. **Phía app (client)**: app đọc từ `REDIS_PASSWORD` (hoặc đoạn `:mật_khẩu@` trong `REDIS_URL`).

Lưu ý:

- Redis dev trong `docker-compose.yml` hiện **không có mật khẩu** (chỉ nghe `127.0.0.1`). Mật khẩu để dành cho giai đoạn deploy.
- Production **phải** đặt mật khẩu mạnh, ngẫu nhiên, dài. **Không commit** mật khẩu (kể cả `.env.production`); đặt qua biến môi trường của nơi deploy.
- Mật khẩu có ký tự đặc biệt: đặt ở `REDIS_PASSWORD` thì khỏi phải mã hóa `%`; đặt trong URL thì phải mã hóa.
- App không bao giờ ghi mật khẩu hay URL vào log hoặc thông báo lỗi (chỉ in `máy:cổng`).

## 3. Chuẩn bị

```bash
npm run db:up          # dựng MySQL + Redis trong Docker
docker ps              # thấy ecommerce_redis đang chạy (healthy)
```

Dừng/bật lại riêng Redis (dùng cho thí nghiệm bên dưới):

```bash
docker stop ecommerce_redis
docker start ecommerce_redis
```

Xem mã thoát của lệnh vừa chạy: **bash** `echo $?`; **PowerShell** `echo $LASTEXITCODE`. `0` = thành công, khác 0 = lỗi.

## 4. Các thí nghiệm

Mỗi thí nghiệm kiểm một hành vi mà **test tự động không kiểm được** (test dùng hàng đợi giả, không có Redis thật).

### a) Bật Redis, chạy app

```bash
npm run dev
```

Mong đợi: log có `Đã kết nối Redis, hàng đợi email sẵn sàng`, app lên bình thường.
Vì sao: chứng minh cấu hình đúng và app nối được Redis thật.

### b) Đặt job ping, xem worker xử lý

Giữ `npm run dev` chạy, mở terminal khác:

```bash
npm run queue:ping
```

Mong đợi:

- Terminal script in `Đã đặt job ping ... id = N` kèm lệnh `redis-cli hgetall` và **tự thoát** (mã 0).
- Terminal `npm run dev` in `Nhận job ping id=N`.
- Chạy lệnh `docker exec ... hgetall ecommerce:email:N` mà script in ra: thấy `finishedOn` và `returnvalue` (có `handledAt`) = đã xử lý. (Job xong chỉ giữ 1 giờ rồi tự dọn.)

Vì sao: chứng minh cả đường đi đặt job → Redis → worker. Script là tiến trình riêng và **không có worker**, nên log xử lý nằm ở `npm run dev`.

### c) Tắt Redis rồi mới chạy app

```bash
docker stop ecommerce_redis
npm run dev
echo $?        # PowerShell: echo $LASTEXITCODE
```

Mong đợi: sau khoảng 5 giây app dừng, in lỗi "Không dùng được Redis (127.0.0.1:6379)..." kèm cách sửa, mã thoát **1**. (Với `npm run dev` ở chế độ watch, tiến trình `nest` có thể vẫn chờ sửa code; để kiểm mã thoát chính xác hơn có thể dùng `npm run start` rồi `echo $?`.)
Vì sao: thà dừng sớm với thông báo rõ còn hơn chạy mà không có hàng đợi.

Thử thêm: `queue:ping` lúc Redis tắt cũng phải in lỗi rõ và thoát mã 1 trong vài giây (đã kiểm bằng cổng chết).

### d) Tắt Redis khi app đang chạy

Bật Redis, `npm run dev`, rồi:

```bash
docker stop ecommerce_redis
```

Chờ ít phút, sau đó `docker start ecommerce_redis`.
Mong đợi:

- App **vẫn sống** (các API không dùng hàng đợi vẫn chạy).
- Log lỗi **thưa**: dòng đầu in ngay, các dòng sau cách nhau ~30 giây, có dạng `(đã ẩn N lỗi tương tự)`; không bị ngập log.
- Bật lại Redis thì tự nối lại; `npm run queue:ping` lại dùng được, worker xử lý tiếp.

Vì sao: Redis có thể sập giữa chừng khi chạy thật; app không được chết theo, cũng không được làm đầy log đến mức không đọc nổi.

### e) Ctrl+C phải tắt gọn

1. Redis đang chạy, `npm run dev`, bấm **Ctrl+C**. Mong đợi: tiến trình thoát trong vài giây.
2. Redis đang chạy, `npm run dev`, `docker stop ecommerce_redis`, rồi bấm **Ctrl+C** khi Redis đang chết. Mong đợi: vẫn thoát, **không treo**.

Vì sao: có tùy chọn `forceDisconnectOnShutdown` của `@nestjs/bullmq` làm app treo vĩnh viễn khi tắt lúc Redis chết (đã đo), nên dự án cố ý **không** bật. Thí nghiệm này xác nhận lựa chọn đó với Redis thật. Nếu treo: bấm Ctrl+C lần nữa và báo lại kèm log, đừng tự sửa.

### f) Tắt worker, job nằm chờ, bật lại thì được xử lý

1. Đặt `QUEUE_WORKER_ENABLED=false` bằng **một trong hai cách**:
   - trong `.env.development`; hoặc
   - ngoài dòng lệnh: `QUEUE_WORKER_ENABLED=false npm run dev` (PowerShell: `$env:QUEUE_WORKER_ENABLED='false'; npm run dev`).
2. Chạy `npm run dev`, rồi `npm run queue:ping`.
   Mong đợi: script vẫn báo đặt job thành công (id N), nhưng `npm run dev` **không** in `Nhận job ping`. `hgetall ecommerce:email:N` không có `finishedOn` (job chờ trong Redis).
3. Dừng app, bỏ cấu hình đó (xóa dòng hoặc đặt `true`), chạy lại `npm run dev`.
   Mong đợi: ngay khi khởi động worker nhận job cũ N và in `Nhận job ping id=N`.

Vì sao: chứng minh "đặt job" và "xử lý job" tách rời nhau, và job không mất khi chưa có worker (nền tảng để sau này tách worker thành tiến trình riêng). Lưu ý biến ngoài dòng lệnh thắng giá trị trong file `.env.development`.

## 5. Redis dev đã được cấu hình thế nào (`docker-compose.yml`)

- `--maxmemory 256mb` + `--maxmemory-policy noeviction`: đầy bộ nhớ thì **từ chối ghi**, không tự xóa key, nên không mất job âm thầm. Vì vậy job xong/lỗi được dọn định kỳ (`DEFAULT_JOB_OPTIONS`: giữ job xong 1 giờ/1000 job, job lỗi 7 ngày/5000 job).
- `--appendonly yes` + `--appendfsync everysec`: ghi đĩa mỗi giây, khởi động lại Redis vẫn còn job (sập nguồn mất tối đa ~1 giây).
- Cổng chỉ mở ở `127.0.0.1`, volume `redis_data` giữ dữ liệu.

## 6. Mất kết nối thì job ra sao

- Mỗi job tự thử lại tối đa 3 lần, chờ 5 giây rồi tăng gấp đôi.
- Job nằm trong Redis; lỗi kết nối chỉ ảnh hưởng việc đặt job mới, job đã lưu không mất.
