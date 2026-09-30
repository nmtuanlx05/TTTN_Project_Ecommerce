# Business Flow

Hai luồng cốt lõi: khách đi từ lúc xem sản phẩm đến khi đặt hàng, và Staff/Admin xử lý đơn đó cho đến khi hoàn thành.

## Luồng A: Khách hàng, từ xem sản phẩm đến đặt hàng

1. Xem, tìm, lọc sản phẩm.
2. Chọn size, màu; hệ thống hiển thị còn hàng hay hết hàng theo từng biến thể.
3. Thêm vào giỏ: hệ thống kiểm tra tồn kho tại thời điểm đó. Giỏ hàng **không giữ hàng**.
4. Xem giỏ hàng, sửa số lượng, xóa món.
5. Bấm Thanh toán: đăng nhập hoặc mua với tư cách guest.
6. Nhập địa chỉ giao hàng, chọn COD hoặc thanh toán online.
7. Xem lại đơn, bấm Đặt hàng.
8. Hệ thống kiểm tra lại tồn kho và giá, tạo đơn và **giữ hàng** (tăng `reserved`) trong một transaction.
9. Rẽ nhánh theo phương thức thanh toán:
   - **COD:** đơn ở trạng thái PENDING, chờ Staff xử lý.
   - **Online:** chuyển sang cổng thanh toán.
     - Thanh toán thành công: đơn PENDING, `paymentStatus` = PAID.
     - Không thanh toán, hoặc quá 30 phút: đơn tự hủy, nhả hàng giữ.
10. Gửi email xác nhận kèm mã đơn.

## Luồng B: Staff và Admin xử lý đơn hàng

Staff đẩy đơn đi theo một chiều từ PENDING đến COMPLETED. Nhánh hủy và hoàn hàng rẽ ra từ chuỗi này. Mỗi lần đổi trạng thái ghi một dòng `OrderStatusHistory`.

Chuỗi chính: `PENDING` → `CONFIRMED` → `PACKING` → `SHIPPING` → `COMPLETED`

Nhánh phụ: `CANCELLED`, `RETURNED`

| Trạng thái | Ý nghĩa | Tác động chính |
| --- | --- | --- |
| PENDING | Vừa đặt đơn | `reserved` tăng |
| CONFIRMED | Staff xác nhận | Đơn online chỉ được xác nhận khi `paymentStatus` là PAID |
| PACKING | Đóng gói, in phiếu giao | Không đổi kho |
| SHIPPING | Đã giao cho vận chuyển | Xuất kho: giảm `stock` và `reserved` |
| COMPLETED | Giao thành công | Đơn COD: ghi nhận đã thu tiền |
| CANCELLED | Đã hủy | Nhả `reserved` |
| RETURNED | Hàng hoàn về | Kiểm hàng đạt thì cộng lại `stock` |

## Quy tắc chuyển trạng thái đơn hàng

| Từ | Sang | Ai thực hiện | Tác động đến kho và thanh toán |
| --- | --- | --- | --- |
| (khách đặt đơn) | PENDING | Hệ thống | `reserved` tăng theo số lượng từng biến thể |
| PENDING | CONFIRMED | Staff | Không đổi kho. Đơn ONLINE chỉ được xác nhận khi `paymentStatus` là PAID |
| CONFIRMED | PACKING | Staff | Không đổi kho |
| PACKING | SHIPPING | Staff | Xuất kho: giảm `stock` và `reserved`, ghi `InventoryTransaction` loại EXPORT |
| SHIPPING | COMPLETED | Staff | Đơn COD: ghi nhận đã thu tiền, `paymentStatus` chuyển PAID |
| SHIPPING | RETURNED | Staff | Hàng hoàn về kho; kiểm đạt thì ghi giao dịch RETURN và cộng lại `stock` |
| PENDING, CONFIRMED | CANCELLED | Customer hoặc Staff | Nhả `reserved`; bắt buộc ghi lý do |
| PACKING | CANCELLED | Staff | Nhả `reserved`; bắt buộc ghi lý do |
| Bất kỳ trước SHIPPING, đơn đã thanh toán | CANCELLED | Staff tạo yêu cầu, Admin duyệt | Nhả `reserved`; `paymentStatus` chuyển REFUNDED |
| PENDING, đơn ONLINE quá 30 phút chưa thanh toán | CANCELLED | Hệ thống | Nhả `reserved` |

## Quy tắc bắt buộc

- Không cho chuyển trạng thái ngoài chuỗi hợp lệ ở bảng trên.
- Mỗi lần đổi trạng thái ghi một dòng `OrderStatusHistory`: người đổi, thời điểm, ghi chú.
- Khi tạo đơn, kiểm tra lại tồn kho và giá trong một transaction; không bán vượt tồn khả dụng (`stock - reserved`).
- Giỏ hàng chỉ là danh sách mong muốn mua, không giữ hàng.
