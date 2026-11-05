# Yêu cầu hệ thống

Hệ thống có 38 yêu cầu chức năng chia theo 11 module và 25 yêu cầu phi chức năng. Các con số phi chức năng là mục tiêu đề xuất cho shop quy mô vừa, chỉnh theo thực tế khi triển khai.

## 1. Yêu cầu chức năng

| Module | Mã | Yêu cầu chức năng |
| --- | --- | --- |
| Xác thực và phân quyền | FR-01 | Đăng ký bằng email và mật khẩu, kiểm tra trùng email |
| | FR-02 | Đăng nhập, cấp token hoặc session, đăng xuất |
| | FR-03 | Mật khẩu được băm (bcrypt hoặc argon2), không lưu plaintext |
| | FR-04 | Phân quyền theo role (ADMIN, STAFF, CUSTOMER) ở cả API và giao diện; tài khoản `isActive = false` không đăng nhập được |
| Sản phẩm | FR-05 | CRUD sản phẩm, biến thể, danh mục; slug tự sinh và duy nhất |
| | FR-06 | Phân trang, tìm kiếm, lọc, sắp xếp danh sách sản phẩm |
| | FR-07 | Upload và lưu ảnh, giới hạn dung lượng và định dạng |
| | FR-08 | Sản phẩm ẩn (`isActive = false`) không hiển thị phía khách |
| Giỏ hàng | FR-09 | Thêm, sửa, xóa item (chỉ Customer đăng nhập); kiểm tra `stock - reserved` ≥ số lượng yêu cầu và tối đa 10 mỗi dòng |
| | FR-10 | **V2** (bỏ khỏi MVP): gộp giỏ tạm của Guest vào giỏ tài khoản khi đăng nhập; backend không đổi, frontend gọi `POST /cart/items` từng món |
| | FR-11 | Khi mở giỏ, cảnh báo item đã hết hàng hoặc đã ẩn (`purchasable`, `inStock`, `unavailableCount`). Phần "đổi giá" **bỏ** vì giỏ không lưu giá nên không có mốc so sánh |
| Đặt hàng | FR-12 | Validate dữ liệu checkout (tên, số điện thoại 10 số đầu 03/05/07/08/09, địa chỉ 3 cấp: mã tồn tại và đúng quan hệ cha-con; `wardCode` bắt buộc nếu quận/huyện có phường/xã, phải bỏ trống nếu không có) |
| | FR-13 | Kiểm tra lại tồn và giá lúc đặt; tạo Order và OrderItem trong một transaction |
| | FR-14 | Sinh mã đơn duy nhất `MS-YYMMDD-XXXX` (YYMMDD theo GMT+7); snapshot giá, tên, size, màu, ảnh đầu vào OrderItem; snapshot mã và tên 3 cấp địa chỉ vào Order |
| | FR-15 | Tăng `reserved` khi đặt đơn; nhả `reserved` khi đơn bị hủy |
| | FR-16 | Tính `totalAmount = subtotal + shippingFee - discountAmount`; `discountAmount` lấy từ voucher (xem FR-36 đến FR-38), bằng 0 nếu không dùng voucher |
| | FR-17 | Gửi email xác nhận đơn (chưa triển khai) |
| Thanh toán | FR-18 | Hỗ trợ COD (đã làm); tích hợp một cổng online (VNPay hoặc MoMo): **chưa làm**, schema đã chừa chỗ (`payment_transactions`, `PENDING_PAYMENT`) |
| | FR-19 | Nhận callback từ cổng, xác minh chữ ký, cập nhật `paymentStatus`; xử lý idempotent, không cập nhật trùng |
| | FR-20 | Đơn online quá 30 phút chưa thanh toán tự hủy và nhả kho |
| Quản lý đơn | FR-21 | Chuỗi trạng thái hợp lệ PENDING, CONFIRMED, PACKING, SHIPPING, COMPLETED; chặn chuyển sai |
| | FR-22 | Khi xác nhận đơn (PENDING → CONFIRMED), gán `handledById` = người xác nhận (Staff hoặc Admin); không đổi khi người khác xử lý các bước sau |
| | FR-23 | Hủy đơn bắt buộc có lý do (Customer tự hủy mặc định "Khách tự hủy"); đơn đã thanh toán đi qua luồng duyệt của Admin (chưa phát sinh khi chỉ có COD). Mọi đổi trạng thái ghi lịch sử (`order_status_histories`) |
| | FR-24 | Khi chuyển SHIPPING: xuất kho, giảm `stock` và `reserved` có điều kiện, ghi `StockMovement` loại `SALE` |
| | FR-25 | Khi đơn RETURNED và kiểm hàng đạt: cộng lại `stock` (**hoãn**, chưa triển khai) |
| Quản lý kho | FR-26 | Nhập kho, điều chỉnh tồn bằng cách cộng/trừ trực tiếp `ProductVariant.stock`; không cho `stock` âm |
| | FR-27 | Lưu lịch sử nhập, xuất, điều chỉnh kho (`StockMovement`): mỗi giao dịch có `stockAfter` và người thực hiện; không cho sửa hoặc xóa giao dịch đã ghi |
| | FR-28 | Cảnh báo biến thể dưới ngưỡng tồn tối thiểu |
| Quản lý user | FR-29 | Danh sách, tìm kiếm khách; xem chi tiết và lịch sử đơn |
| | FR-30 | Admin khóa, mở khóa tài khoản; tạo, sửa Staff |
| Báo cáo | FR-31 | Dashboard: doanh thu, số đơn, đơn theo trạng thái, sản phẩm bán chạy |
| | FR-32 | Lọc theo khoảng thời gian; xuất Excel hoặc CSV |
| | FR-33 | Doanh thu chỉ tính đơn COMPLETED, theo `totalAmount` (đã trừ giảm giá) |
| Thông báo | FR-34 | Email: xác nhận đơn, đổi trạng thái chính, đặt lại mật khẩu |
| | FR-35 | Thông báo trong trang quản trị khi có đơn mới |
| Voucher | FR-36 | Admin tạo, sửa, khóa/mở voucher; `code` duy nhất; voucher `PERCENT` có `discountValue` từ 1 đến 100 |
| | FR-37 | Khi đặt đơn: mỗi đơn tối đa một mã; kiểm tra voucher (`isActive`, trong khoảng `startsAt` đến `expiresAt`, `subtotal` >= `minOrderValue`, còn lượt dùng), tính `discountAmount` (giảm trên `subtotal`, không giảm phí ship, không vượt `subtotal`), tăng `usedCount` bằng cập nhật có điều kiện, tất cả trong cùng transaction với việc tạo đơn |
| | FR-38 | Đơn chuyển CANCELLED (kể cả tự hủy sau 30 phút) thì hoàn lại một lượt (`usedCount - 1`); đơn RETURNED không hoàn lượt |

## 2. Yêu cầu phi chức năng

| Nhóm | Mã | Yêu cầu |
| --- | --- | --- |
| Hiệu năng | NFR-01 | Trang danh sách, chi tiết tải dưới 3 giây trên 4G; API thường dưới 500 ms ở tải bình thường |
| | NFR-02 | Đánh index các cột tìm kiếm, lọc (slug, categoryId, status, createdAt, code) |
| | NFR-03 | Nén, resize ảnh, lazy loading; dùng CDN nếu có |
| Đồng thời và toàn vẹn dữ liệu | NFR-04 | Xử lý race condition khi hai khách mua cùng món cuối cùng (transaction, cập nhật có điều kiện), không bán vượt tồn |
| | NFR-05 | Thao tác nhiều bước (đặt đơn, xuất kho, hủy đơn) phải nguyên tử |
| | NFR-06 | Dữ liệu tài chính có dấu vết kiểm toán (đơn hàng lưu snapshot giá và `discountAmount`), không xóa cứng đơn hàng. Mỗi lần đổi tồn ghi `StockMovement` (không sửa, không xóa) |
| Bảo mật | NFR-07 | HTTPS toàn bộ; cookie `HttpOnly`, `Secure` hoặc token có thời hạn |
| | NFR-08 | Chống SQL injection (Prisma tham số hóa), XSS, CSRF |
| | NFR-09 | Kiểm tra phân quyền ở server cho mọi API quản trị, không chỉ ẩn nút trên giao diện |
| | NFR-10 | Giới hạn số lần đăng nhập sai; rate limit các API nhạy cảm |
| | NFR-11 | Không lưu dữ liệu thẻ; xác minh chữ ký callback từ cổng thanh toán |
| | NFR-12 | Không để lộ secret trong mã nguồn; dùng biến môi trường |
| Tuân thủ | NFR-13 | Bảo vệ dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP: có chính sách quyền riêng tư, chỉ thu thập dữ liệu cần thiết |
| Sẵn sàng và sao lưu | NFR-14 | Uptime mục tiêu 99% (nâng sau nếu cần) |
| | NFR-15 | Sao lưu database hằng ngày, thử khôi phục định kỳ |
| Khả năng mở rộng | NFR-16 | Kiến trúc tách lớp (UI, API, DB) để dễ mở rộng; API stateless |
| | NFR-17 | Schema cho phép bổ sung đa kho, review mà không phải làm lại |
| Khả dụng (UX) | NFR-18 | Responsive, ưu tiên mobile vì đa số khách thời trang mua trên điện thoại |
| | NFR-19 | Checkout tối đa 3 bước; thông báo lỗi rõ ràng bằng tiếng Việt |
| | NFR-20 | Giao diện quản trị dùng được trên desktop; thao tác đơn hàng không quá 3 click |
| Tương thích | NFR-21 | Hỗ trợ Chrome, Safari, Edge, Firefox bản mới; iOS và Android trình duyệt phổ biến |
| SEO | NFR-22 | URL thân thiện (slug), thẻ meta, sitemap, dữ liệu có cấu trúc sản phẩm |
| Bảo trì và vận hành | NFR-23 | Ghi log lỗi và log nghiệp vụ; có môi trường dev, staging, prod |
| | NFR-24 | Migration quản lý bằng Prisma; có tài liệu API |
| Ngôn ngữ và định dạng | NFR-25 | Giao diện tiếng Việt, tiền tệ VND, múi giờ GMT+7 |
