# Báo cáo phân tích – Website E-commerce thời trang (Bước 1)

## Mục tiêu và bối cảnh

Dự án xây dựng website thương mại điện tử bán hàng cho một brand thời trang, gồm khu vực mua sắm cho khách và khu vực quản trị cho nội bộ. Bản MVP tập trung vào một luồng trọn vẹn: khách xem hàng, đặt đơn, nhân viên xử lý đơn và quản lý kho, admin theo dõi doanh thu.

Tài liệu này là kết quả của **Bước 1: Nắm bắt nghiệp vụ** trong quy trình 3 bước (Nắm bắt nghiệp vụ, Phân rã tính năng, Xác định MVP).

## Các quyết định nghiệp vụ đã chốt

| Chủ đề | Quyết định |
| --- | --- |
| Tách biến thể sản phẩm | `ProductVariant` (size + màu + SKU) tách khỏi `Product`; tồn kho tính theo biến thể |
| Giữ hàng | Cơ chế `reserved`: tăng khi khách đặt đơn, giảm khi Staff xuất kho hoặc đơn bị hủy; tồn khả dụng = `stock - reserved` |
| Thêm vào giỏ | Không trừ, không giữ tồn kho; chỉ kiểm tra tồn khi thêm giỏ và khi đặt đơn |
| Nhập kho | Staff tự nhập kho, không cần Admin duyệt; mọi lần nhập được ghi vào `InventoryTransaction` |
| Khách mua hàng | Cho phép guest checkout (không cần đăng ký) |
| Thanh toán | COD và một cổng thanh toán online |
| Hủy đơn chưa thanh toán | Staff được hủy, bắt buộc ghi lý do |
| Hủy hoặc hoàn tiền đơn đã thanh toán | Staff chỉ tạo yêu cầu, Admin duyệt |
| Kho | Một kho duy nhất |
| Phạm vi | Mức tối thiểu cho MVP; Voucher, sổ địa chỉ, đánh giá, đổi trả để V2 |

Các phương án còn để mặc định (thời gian giữ hàng đơn online là 30 phút, khách tự hủy được đến hết trạng thái CONFIRMED) có thể chỉnh lại ở Bước 2.

## Phạm vi MVP và phần để V2

MVP gồm 10 model dữ liệu và ba nhóm người dùng: Customer (kèm Guest), Staff, Admin.

| | MVP | Để V2 |
| --- | --- | --- |
| Khách hàng | Xem, tìm, lọc sản phẩm; giỏ hàng; guest checkout; đặt đơn COD/online; theo dõi và tự hủy đơn | Sổ địa chỉ, mã giảm giá, đổi/trả, đánh giá, wishlist |
| Staff | CRUD sản phẩm, biến thể, danh mục; nhập kho, điều chỉnh tồn; xử lý đơn; tra cứu khách | Phiếu nhập theo nhà cung cấp, phân quyền chi tiết theo nhóm Staff |
| Admin | Quản lý Staff, khóa khách, dashboard, báo cáo doanh thu, duyệt hoàn tiền, cấu hình hệ thống | Nhật ký thao tác, khuyến mãi, banner, báo cáo lợi nhuận |
| Dữ liệu | User, Category, Product, ProductVariant, Cart, CartItem, Order, OrderItem, OrderStatusHistory, InventoryTransaction | Address, Voucher, Supplier, Review, AuditLog |

## Cấu trúc tài liệu

- `01-actor-phan-quyen.md`: actor và ma trận quyền giữa Customer, Staff, Admin.
- `02-business-flow.md`: hai luồng cốt lõi và quy tắc chuyển trạng thái.
- `03-yeu-cau-nghiep-vu.md`: yêu cầu nghiệp vụ (mã BR-) theo ba phía, kèm mức ưu tiên MVP hoặc V2.
- `04-yeu-cau-he-thong.md`: yêu cầu chức năng (FR-) và phi chức năng (NFR-).
- `05-data-models.md`: schema Prisma cho MVP và quy tắc tồn kho.
- `06-thiet-ke-database.md`: quan hệ, ràng buộc, index cho MySQL.
