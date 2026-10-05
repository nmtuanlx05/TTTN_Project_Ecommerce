# Business Flow

Hai luồng cốt lõi: khách đi từ lúc xem sản phẩm đến khi đặt hàng, và Staff/Admin xử lý đơn đó cho đến khi hoàn thành.

## Luồng A: Khách hàng, từ xem sản phẩm đến đặt hàng

1. Xem, tìm, lọc sản phẩm.
2. Chọn size, màu; hệ thống hiển thị còn hàng hay hết hàng theo từng biến thể.
3. Thêm vào giỏ: hệ thống kiểm tra tồn kho tại thời điểm đó. Giỏ hàng **không giữ hàng**.
4. Xem giỏ hàng, sửa số lượng, xóa món.
5. Bấm Thanh toán: đăng nhập hoặc mua với tư cách guest.
6. Nhập địa chỉ giao hàng, chọn COD hoặc thanh toán online.
7. Nhập mã voucher (tùy chọn, tối đa một mã, guest cũng dùng được); hệ thống hiển thị số tiền giảm.
8. Xem lại đơn, bấm Đặt hàng.
9. Hệ thống kiểm tra lại tồn kho, giá và voucher (còn hiệu lực, đạt đơn tối thiểu, còn lượt dùng), tạo đơn, **giữ hàng** (tăng `reserved`) và tăng `usedCount` của voucher trong một transaction.
10. Rẽ nhánh theo phương thức thanh toán:
   - **COD:** đơn ở trạng thái PENDING, chờ Staff xử lý.
   - **Online:** chuyển sang cổng thanh toán.
     - Thanh toán thành công: đơn PENDING, `paymentStatus` = PAID.
     - Không thanh toán, hoặc quá 30 phút: đơn tự hủy, nhả hàng giữ, hoàn lại một lượt voucher.
11. Gửi email xác nhận kèm mã đơn.

## Luồng B: Staff và Admin xử lý đơn hàng

Staff đẩy đơn đi theo một chiều từ PENDING đến COMPLETED. Nhánh hủy và hoàn hàng rẽ ra từ chuỗi này. Người xác nhận đơn (Staff hoặc Admin) được gán vào `handledById` của đơn.

Chuỗi chính: `PENDING` → `CONFIRMED` → `PACKING` → `SHIPPING` → `COMPLETED`

Nhánh phụ: `CANCELLED`, `RETURNED`

| Trạng thái | Ý nghĩa | Tác động chính |
| --- | --- | --- |
| PENDING | Vừa đặt đơn | `reserved` tăng |
| CONFIRMED | Staff xác nhận | Gán `handledById` = người xác nhận; đơn online chỉ được xác nhận khi `paymentStatus` là PAID |
| PACKING | Đóng gói, in phiếu giao | Không đổi kho |
| SHIPPING | Đã giao cho vận chuyển | Xuất kho: giảm `stock` và `reserved` |
| COMPLETED | Giao thành công | Đơn COD: ghi nhận đã thu tiền |
| CANCELLED | Đã hủy | Nhả `reserved`; hoàn lại một lượt voucher (`usedCount - 1`) |
| RETURNED | Hàng hoàn về | Kiểm hàng đạt thì cộng lại `stock`; không hoàn lượt voucher |

## Quy tắc chuyển trạng thái đơn hàng

| Từ | Sang | Ai thực hiện | Tác động đến kho và thanh toán |
| --- | --- | --- | --- |
| (khách đặt đơn) | PENDING | Hệ thống | `reserved` tăng theo số lượng từng biến thể; `usedCount` của voucher (nếu có) tăng 1 |
| PENDING | CONFIRMED | Staff | Không đổi kho; gán `handledById`. Đơn ONLINE chỉ được xác nhận khi `paymentStatus` là PAID |
| CONFIRMED | PACKING | Staff | Không đổi kho |
| PACKING | SHIPPING | Staff | Xuất kho: giảm `stock` và `reserved` |
| SHIPPING | COMPLETED | Staff | Đơn COD: ghi nhận đã thu tiền, `paymentStatus` chuyển PAID |
| SHIPPING | RETURNED | Staff | Hàng hoàn về kho; kiểm đạt thì cộng lại `stock`. Không hoàn lượt voucher |
| PENDING, CONFIRMED | CANCELLED | Customer hoặc Staff | Nhả `reserved`; `usedCount - 1`; bắt buộc ghi lý do |
| PACKING | CANCELLED | Staff | Nhả `reserved`; `usedCount - 1`; bắt buộc ghi lý do |
| Bất kỳ trước SHIPPING, đơn đã thanh toán | CANCELLED | Staff tạo yêu cầu, Admin duyệt | Nhả `reserved`; `usedCount - 1`; `paymentStatus` chuyển REFUNDED |
| PENDING, đơn ONLINE quá 30 phút chưa thanh toán | CANCELLED | Hệ thống | Nhả `reserved`; `usedCount - 1` |

## Quy tắc bắt buộc

- Không cho chuyển trạng thái ngoài chuỗi hợp lệ ở bảng trên.
- `handledById` chỉ gán một lần, khi xác nhận đơn (PENDING → CONFIRMED), không đổi khi người khác xử lý các bước sau. Admin có quyền Staff nên `handledById` có thể là Admin. Đơn hủy trước khi xác nhận thì để trống. Hệ thống không lưu lịch sử đổi trạng thái, nên không truy được ai đã hủy đơn hay đổi trạng thái lúc nào (chỉ có `cancelReason`).
- Khi tạo đơn, kiểm tra lại tồn kho và giá trong một transaction; không bán vượt tồn khả dụng (`stock - reserved`).
- Giỏ hàng chỉ là danh sách mong muốn mua, không giữ hàng.
- Yêu cầu hủy/hoàn tiền đơn đã thanh toán (Staff tạo, Admin duyệt): schema MVP chưa có model hoặc trường lưu yêu cầu này, cách lưu cần chốt khi triển khai (xem `06-thiet-ke-database.md`, mục 7).

## Quy tắc voucher

- Mỗi đơn tối đa một mã. Guest dùng được.
- Chỉ Admin tạo, sửa, khóa/mở voucher.
- Điều kiện áp mã: `isActive`, thời điểm nằm trong khoảng `startsAt` đến `expiresAt`, `subtotal` >= `minOrderValue`, còn lượt dùng (`usageLimit` trống hoặc `usedCount < usageLimit`).
- Giảm trên `subtotal`, không giảm `shippingFee`. `discountAmount` không vượt `subtotal`.
- `PERCENT`: `discountValue` là số nguyên phần trăm (10 = 10%); `discountAmount` = `subtotal × discountValue / 100` làm tròn xuống, tối đa `maxDiscount` nếu có. `FIXED`: `discountAmount` = `min(discountValue, subtotal)`. `maxDiscount` chỉ áp dụng cho `PERCENT`.
- `totalAmount = subtotal + shippingFee - discountAmount`.
- Kiểm tra hiệu lực, đơn tối thiểu, số lượt và tăng `usedCount` (cập nhật có điều kiện) trong cùng transaction với việc tạo đơn.
- Đơn chuyển CANCELLED (kể cả tự hủy sau 30 phút) thì hoàn lại một lượt: `usedCount - 1`. Đơn RETURNED không hoàn lượt.
- Chưa giới hạn số lần dùng cho mỗi khách (hoặc email, số điện thoại): một người có thể dùng lại mã đến khi hết `usageLimit`.
