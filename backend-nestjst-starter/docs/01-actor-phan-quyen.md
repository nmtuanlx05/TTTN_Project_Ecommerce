# Actor và phân quyền

Hệ thống có 4 nhóm người dùng và 2 hệ thống bên ngoài. Nguyên tắc chia quyền: Staff vận hành hằng ngày, Admin kiểm soát tiền, quyền truy cập và cấu hình.

## Danh sách Actor

| Actor | Loại | Vai trò trong hệ thống |
| --- | --- | --- |
| Guest | Người dùng | Khách chưa đăng nhập: xem sản phẩm, tìm kiếm, guest checkout (giỏ tạm ở trình duyệt để V2) |
| Customer | Người dùng | Khách có tài khoản (role `CUSTOMER`): mua hàng, theo dõi và hủy đơn, quản lý hồ sơ |
| Staff | Nội bộ | Nhân viên vận hành (role `STAFF`): sản phẩm, kho, đơn hàng, hỗ trợ khách |
| Admin | Nội bộ | Quản trị (role `ADMIN`): nhân sự, phân quyền, tài chính, báo cáo, cấu hình |
| Payment Gateway | Hệ thống ngoài | VNPay hoặc MoMo: xử lý thanh toán online, gửi kết quả về hệ thống |
| Shipping Provider | Hệ thống ngoài | GHN, GHTK hoặc tương đương: nhận đơn giao, cập nhật trạng thái vận chuyển |

MVP có thể chưa tích hợp API vận chuyển; khi đó Staff tự cập nhật trạng thái giao hàng.

## Ma trận phân quyền

Admin có mọi quyền của Staff. Bảng dưới chỉ ra ranh giới giữa các nhóm.

| Chức năng | Customer | Staff | Admin |
| --- | --- | --- | --- |
| Xem, tìm kiếm sản phẩm | Có | Có | Có |
| Mua hàng từ giỏ (áp tối đa một voucher), quản lý giỏ, xem đơn của mình | Có | Không | Không |
| Tự hủy đơn của mình (chỉ khi PENDING, chờ xác nhận) | Có | Không | Không |
| CRUD sản phẩm, biến thể, danh mục, ảnh | Không | Có | Có |
| Nhập kho, điều chỉnh tồn | Không | Có | Có |
| Xem và xử lý mọi đơn hàng | Không | Có | Có |
| Hủy đơn chưa thanh toán (bắt buộc lý do) | Không | Có | Có |
| Hủy hoặc hoàn tiền đơn đã thanh toán | Không | Chỉ tạo yêu cầu | Duyệt |
| Xem thông tin khách và lịch sử đơn để hỗ trợ | Không | Có | Có |
| Khóa, mở khóa tài khoản khách | Không | Không | Có |
| Tạo, sửa, khóa tài khoản Staff; gán role | Không | Không | Có |
| Tạo, sửa, khóa/mở voucher | Không | Không | Có |
| Báo cáo vận hành (số đơn, tồn kho) | Không | Có | Có |
| Báo cáo doanh thu, dashboard tổng quan | Không | Không | Có |
| Cấu hình hệ thống (phí ship, cổng thanh toán, email) | Không | Không | Có |

## Điều chỉnh so với bản nháp ban đầu

- Tách `Guest` khỏi `Customer` vì khách xem hàng trước khi đăng ký rất phổ biến. Giỏ hàng lưu ở DB và bắt đăng nhập, nên MVP không có giỏ Guest; giỏ tạm ở trình duyệt và gộp khi đăng nhập để V2.
- API giỏ hàng chỉ cho `CUSTOMER`: Admin và Staff nhận 403 "Tài khoản quản trị không dùng để mua hàng".
- Đổi "Staff quản lý user" thành "Staff hỗ trợ khách hàng" (chỉ xem). Khóa tài khoản và quản lý nhân sự thuộc Admin để Staff không tự nâng quyền.
- Admin chịu trách nhiệm các thao tác liên quan đến tiền (duyệt hoàn tiền, báo cáo doanh thu).
