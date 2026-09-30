# Yêu cầu nghiệp vụ

Yêu cầu chia theo ba phía: người dùng, Admin, Staff. Ưu tiên **MVP** là bắt buộc cho bản đầu tiên, **V2** là làm sau.

## 1. Yêu cầu phía người dùng (Guest và Customer)

| Mã | Yêu cầu | Ưu tiên |
| --- | --- | --- |
| BR-U-01 | Xem trang chủ, danh mục, danh sách sản phẩm | MVP |
| BR-U-02 | Tìm kiếm theo tên; lọc theo danh mục, size, màu, khoảng giá; sắp xếp | MVP |
| BR-U-03 | Xem chi tiết sản phẩm: ảnh, mô tả, bảng size, tình trạng còn/hết theo từng biến thể | MVP |
| BR-U-04 | Thêm, sửa số lượng, xóa sản phẩm trong giỏ; Guest giữ giỏ tạm và gộp vào giỏ tài khoản khi đăng nhập | MVP |
| BR-U-05 | Đăng ký, đăng nhập, đăng xuất, quên và đổi mật khẩu | MVP |
| BR-U-06 | Đặt hàng: nhập tên, số điện thoại, địa chỉ; chọn COD hoặc online; xem lại đơn trước khi xác nhận | MVP |
| BR-U-07 | Guest checkout (mua không cần đăng ký) | MVP |
| BR-U-08 | Nhận email xác nhận kèm mã đơn | MVP |
| BR-U-09 | Xem lịch sử đơn hàng, chi tiết và trạng thái đơn | MVP |
| BR-U-10 | Tự hủy đơn khi đơn chưa vào giai đoạn đóng gói (đến hết trạng thái CONFIRMED) | MVP |
| BR-U-11 | Quản lý hồ sơ cá nhân (tên, số điện thoại), đổi mật khẩu | MVP |
| BR-U-12 | Sổ địa chỉ nhiều địa chỉ | V2 |
| BR-U-13 | Áp mã giảm giá | V2 |
| BR-U-14 | Yêu cầu đổi/trả hàng | V2 |
| BR-U-15 | Đánh giá sản phẩm, wishlist | V2 |

## 2. Yêu cầu phía Admin

| Mã | Yêu cầu | Ưu tiên |
| --- | --- | --- |
| BR-A-01 | Toàn quyền khu vực quản trị, bao gồm mọi quyền của Staff | MVP |
| BR-A-02 | Quản lý tài khoản Staff: tạo, khóa, mở khóa, đặt lại mật khẩu | MVP |
| BR-A-03 | Phân quyền: gán role Admin, Staff, Customer | MVP |
| BR-A-04 | Khóa, mở khóa tài khoản khách hàng | MVP |
| BR-A-05 | Dashboard tổng quan: doanh thu, số đơn, đơn theo trạng thái, sản phẩm bán chạy | MVP |
| BR-A-06 | Báo cáo doanh thu theo ngày, tháng; xuất Excel | MVP |
| BR-A-07 | Duyệt yêu cầu hủy, hoàn tiền đối với đơn đã thanh toán | MVP |
| BR-A-08 | Cấu hình hệ thống: phí ship, phương thức thanh toán, thông tin liên hệ, email | MVP |
| BR-A-09 | Xem nhật ký thao tác (ai làm gì, lúc nào) | V2 |
| BR-A-10 | Tạo và quản lý khuyến mãi, voucher | V2 |
| BR-A-11 | Quản lý banner, nội dung trang chủ | V2 |
| BR-A-12 | Báo cáo lợi nhuận (cần giá vốn) | V2 |

## 3. Yêu cầu phía Staff

### 3.1 Sản phẩm

| Mã | Yêu cầu | Ưu tiên |
| --- | --- | --- |
| BR-S-01 | Thêm, sửa, ẩn/hiện sản phẩm; upload ảnh | MVP |
| BR-S-02 | Quản lý biến thể (size, màu, SKU) | MVP |
| BR-S-03 | Quản lý danh mục | MVP |

### 3.2 Kho

| Mã | Yêu cầu | Ưu tiên |
| --- | --- | --- |
| BR-S-04 | Nhập kho: chọn biến thể, số lượng, ghi chú. Staff tự nhập, không cần Admin duyệt | MVP |
| BR-S-05 | Xuất kho tự động theo đơn khi đơn chuyển sang SHIPPING | MVP |
| BR-S-06 | Điều chỉnh tồn thủ công (kiểm kê), bắt buộc nhập lý do | MVP |
| BR-S-07 | Xem tồn kho theo biến thể, lọc biến thể sắp hết hàng | MVP |
| BR-S-08 | Xem lịch sử nhập, xuất, điều chỉnh | MVP |
| BR-S-09 | Nhập kho theo phiếu, nhà cung cấp | V2 |

### 3.3 Đơn hàng

| Mã | Yêu cầu | Ưu tiên |
| --- | --- | --- |
| BR-S-10 | Xem danh sách đơn, lọc theo trạng thái, ngày, mã đơn, số điện thoại | MVP |
| BR-S-11 | Xác nhận đơn và chuyển trạng thái theo đúng chuỗi hợp lệ | MVP |
| BR-S-12 | Hủy đơn chưa thanh toán, bắt buộc ghi lý do | MVP |
| BR-S-13 | Với đơn đã thanh toán: chỉ tạo yêu cầu hủy, Admin duyệt | MVP |
| BR-S-14 | In phiếu đóng gói, phiếu giao hàng | MVP |
| BR-S-15 | Xử lý hàng hoàn về, cộng lại tồn sau khi kiểm hàng | MVP |

### 3.4 Khách hàng

| Mã | Yêu cầu | Ưu tiên |
| --- | --- | --- |
| BR-S-16 | Xem danh sách khách, tra cứu thông tin và lịch sử đơn để hỗ trợ | MVP |
| BR-S-17 | Không được sửa quyền, không được khóa tài khoản | MVP |
