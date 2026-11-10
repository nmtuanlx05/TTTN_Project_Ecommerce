# Báo cáo phân tích – Website E-commerce thời trang (Bước 1)

## Mục tiêu và bối cảnh

Dự án xây dựng website thương mại điện tử bán hàng cho một brand thời trang, gồm khu vực mua sắm cho khách và khu vực quản trị cho nội bộ. Bản MVP tập trung vào một luồng trọn vẹn: khách xem hàng, đặt đơn, nhân viên xử lý đơn và quản lý kho, admin theo dõi doanh thu.

## Các quyết định nghiệp vụ đã chốt

| Chủ đề                               | Quyết định                                                                                                            |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Tách biến thể sản phẩm               | `ProductVariant` (size + màu + SKU) tách khỏi `Product`; tồn kho tính theo biến thể                                   |
| Giữ hàng                             | Cơ chế `reserved`: tăng khi khách đặt đơn, giảm khi Staff xuất kho hoặc đơn bị hủy; tồn khả dụng = `stock - reserved` |
| Thêm vào giỏ                         | Không trừ, không giữ tồn kho; chỉ kiểm tra tồn khi thêm giỏ và khi đặt đơn. Giỏ lưu trong DB, chỉ Customer đã đăng nhập; giỏ Guest để V2 |
| Nhập kho                             | Staff tự nhập kho, không cần Admin duyệt; cộng trực tiếp vào `ProductVariant.stock`, mỗi lần đổi tồn ghi một dòng lịch sử (`StockMovement`) |
| Khách mua hàng                       | Cho phép guest checkout (không cần đăng ký)                                                                           |
| Thanh toán                           | COD và thanh toán online. **Đã triển khai: COD và chuyển khoản VietQR** (đối soát qua webhook SePay + admin xác nhận thủ công, xem `docs/api/payments.md`); cổng thẻ/ví (VNPay sandbox) để giai đoạn sau |
| Hủy đơn chưa thanh toán              | Staff được hủy, bắt buộc ghi lý do                                                                                    |
| Hủy hoặc hoàn tiền đơn đã thanh toán | Staff chỉ tạo yêu cầu, Admin duyệt                                                                                    |
| Kho                                  | Một kho duy nhất                                                                                                      |
| Voucher                              | Thuộc MVP: mỗi đơn tối đa một mã, giảm trên `subtotal` (không giảm phí ship), guest dùng được, chỉ Admin tạo và quản lý |
| Đặt đơn                              | Đặt từ giỏ của Customer (guest checkout để V2). Tiền tính ở backend: miễn phí ship từ 500.000đ trên tạmTính **trước** giảm giá, phí 30.000đ; địa chỉ chọn theo 3 cấp (chuẩn cũ); mã đơn `MS-YYMMDD-XXXX`; có lịch sử đổi trạng thái đơn |
| Phạm vi                              | Mức tối thiểu cho MVP; sổ địa chỉ, đánh giá, đổi trả, hoàn hàng (`RETURNED`), giới hạn voucher theo khách để V2 |

## Phạm vi MVP và phần để V2

MVP gồm 14 model dữ liệu (thêm `OrderStatusHistory`, `PaymentTransaction` ở bước đặt đơn, `WishlistItem` cho sản phẩm yêu thích) và ba nhóm người dùng: Customer (kèm Guest), Staff, Admin.

|            | MVP                                                                                                                 | Để V2                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Khách hàng | Xem, tìm, lọc sản phẩm; giỏ hàng (cần đăng nhập, giỏ tạm của Guest để V2); guest checkout; đặt đơn COD/online; áp mã giảm giá; theo dõi và tự hủy đơn; sản phẩm yêu thích (wishlist, tối đa 100/khách) | Sổ địa chỉ, đổi/trả, đánh giá |                          |
| Staff      | CRUD sản phẩm, biến thể, danh mục; nhập kho, điều chỉnh tồn, xem lịch sử kho; xử lý đơn; tra cứu khách                           | Phiếu nhập theo nhà cung cấp, phân quyền chi tiết theo nhóm Staff |
| Admin      | Quản lý Staff, khóa khách, dashboard, báo cáo doanh thu, duyệt hoàn tiền, quản lý voucher, cấu hình hệ thống | Nhật ký thao tác, khuyến mãi tự động, banner, báo cáo lợi nhuận   |
| Dữ liệu    | User, Category, Product, ProductVariant, ProductImage, Cart, CartItem, Order, OrderItem, OrderStatusHistory, PaymentTransaction, Voucher, StockMovement | Address, Supplier, Review, AuditLog |

## Cấu trúc tài liệu

- `01-actor-phan-quyen.md`: actor và ma trận quyền giữa Customer, Staff, Admin.
- `02-business-flow.md`: hai luồng cốt lõi và quy tắc chuyển trạng thái.
- `03-yeu-cau-nghiep-vu.md`: yêu cầu nghiệp vụ (mã BR-) theo ba phía, kèm mức ưu tiên MVP hoặc V2.
- `04-yeu-cau-he-thong.md`: yêu cầu chức năng (FR-) và phi chức năng (NFR-).
- `05-data-models.md`: schema Prisma cho MVP và quy tắc tồn kho.
- `06-thiet-ke-database.md`: quan hệ, ràng buộc, index cho MySQL.
