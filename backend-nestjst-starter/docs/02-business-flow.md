# Business Flow

Hai luồng cốt lõi: khách đi từ lúc xem sản phẩm đến khi đặt hàng, và Staff/Admin xử lý đơn đó cho đến khi hoàn thành.

## Luồng A: Khách hàng, từ xem sản phẩm đến đặt hàng

1. Xem, tìm, lọc sản phẩm.
2. Chọn size, màu; hệ thống hiển thị còn hàng hay hết hàng theo từng biến thể.
3. Thêm vào giỏ: hệ thống kiểm tra tồn kho tại thời điểm đó. Giỏ hàng **không giữ hàng**.
4. Xem giỏ hàng, sửa số lượng, xóa món.
5. Bấm Thanh toán: cần đăng nhập (guest checkout để V2). Đặt đơn luôn từ giỏ của Customer.
6. Nhập địa chỉ giao hàng bằng danh sách chọn 3 cấp (tỉnh/thành → quận/huyện → phường/xã; quận/huyện không có phường/xã thì bỏ bước này), chọn COD (thanh toán online chưa triển khai).
7. Nhập mã voucher (tùy chọn, tối đa một mã); hệ thống hiển thị số tiền giảm qua `POST /orders/preview`. Phí ship 30.000đ, miễn phí khi tạmTính (trước giảm giá) từ 500.000đ.
8. Xem lại đơn, bấm Đặt hàng.
9. Hệ thống kiểm tra lại tồn kho, giá và voucher (còn hiệu lực, đạt đơn tối thiểu, còn lượt dùng), tạo đơn, **giữ hàng** (tăng `reserved`) và tăng `usedCount` của voucher trong một transaction.
10. Rẽ nhánh theo phương thức thanh toán:
   - **COD:** đơn ở trạng thái PENDING, chờ Staff xử lý.
   - **Online:** chuyển sang cổng thanh toán.
     - Thanh toán thành công: đơn PENDING, `paymentStatus` = PAID.
     - Không thanh toán, hoặc quá 30 phút: đơn tự hủy, nhả hàng giữ, hoàn lại một lượt voucher.
11. Gửi email xác nhận kèm mã đơn (chưa triển khai).

## Luồng B: Staff và Admin xử lý đơn hàng

Staff đẩy đơn đi theo một chiều từ PENDING đến COMPLETED. Nhánh hủy và hoàn hàng rẽ ra từ chuỗi này. Người xác nhận đơn (Staff hoặc Admin) được gán vào `handledById` của đơn.

Chuỗi chính: `PENDING` → `CONFIRMED` → `SHIPPING` → `COMPLETED` (không có bước "đóng gói" riêng; đã bỏ `PACKING`)

Nhánh phụ: `CANCELLED`, `RETURNED`

| Trạng thái | Ý nghĩa | Tác động chính |
| --- | --- | --- |
| PENDING | Vừa đặt đơn | `reserved` tăng |
| CONFIRMED | Staff xác nhận | Gán `handledById` = người xác nhận; vẫn giữ chỗ (`reserved`), chưa trừ kho thật; đơn online chỉ được xác nhận khi `paymentStatus` là PAID |
| SHIPPING | Đã giao cho vận chuyển | Xuất kho thật: giảm `stock` và `reserved` (bước `CONFIRMED` → `SHIPPING`) |
| COMPLETED | Giao thành công | Đơn COD: ghi nhận đã thu tiền |
| CANCELLED | Đã hủy | Nhả `reserved`; hoàn lại một lượt voucher (`usedCount - 1`) |
| RETURNED | Hàng hoàn về | Kiểm hàng đạt thì cộng lại `stock`; không hoàn lượt voucher |

## Quy tắc chuyển trạng thái đơn hàng

| Từ | Sang | Ai thực hiện | Tác động đến kho và thanh toán |
| --- | --- | --- | --- |
| (khách đặt đơn ONLINE) | PENDING_PAYMENT | Hệ thống | Như đơn COD (giữ `reserved`, tăng `usedCount`); `paymentExpiresAt = now + 30 phút` |
| PENDING_PAYMENT | PENDING | Hệ thống | Nhận chuyển khoản đủ/thừa (webhook hoặc Admin xác nhận thủ công): `paymentStatus = PAID`, `paidAt`; không đổi kho |
| PENDING_PAYMENT | CANCELLED | Customer, Staff, Admin hoặc Hệ thống (quá hạn) | Nhả `reserved`; `usedCount - 1` |
| (khách đặt đơn COD) | PENDING | Hệ thống | `reserved` tăng theo số lượng từng biến thể; `usedCount` của voucher (nếu có) tăng 1 |
| PENDING | CONFIRMED | Staff | Không đổi kho; gán `handledById`. Đơn ONLINE vào PENDING chỉ sau khi đã PAID nên xác nhận như đơn COD |
| CONFIRMED | SHIPPING | Staff | Xuất kho: giảm `stock` và `reserved`, ghi `StockMovement` loại `SALE` |
| SHIPPING | COMPLETED | Staff | Đơn COD: ghi nhận đã thu tiền, `paymentStatus` chuyển PAID |
| SHIPPING | RETURNED | Staff | **Chưa triển khai (để lần sau)**: hàng hoàn về kho; kiểm đạt thì cộng lại `stock`. Không hoàn lượt voucher. Bản hiện tại `COMPLETED` là trạng thái cuối |
| PENDING | CANCELLED | Customer, Staff hoặc Admin | Nhả `reserved`; `usedCount - 1`; lý do bắt buộc với Staff/Admin (Customer mặc định "Khách tự hủy") |
| CONFIRMED | CANCELLED | Staff hoặc Admin | Nhả `reserved`; `usedCount - 1`; bắt buộc ghi lý do. **Customer không tự hủy được** (409 `ORDER_NOT_CANCELLABLE_BY_CUSTOMER`) |
| Bất kỳ trước SHIPPING, đơn đã thanh toán | CANCELLED | **Chỉ Admin** hủy trực tiếp (luồng "Staff tạo yêu cầu, Admin duyệt" chưa làm); Customer không tự hủy | Nhả `reserved`; `usedCount - 1`; `paymentStatus` **giữ PAID**, hoàn tiền xử lý ngoài hệ thống |
| PENDING_PAYMENT, đơn ONLINE quá hạn (mặc định 30 phút) chưa thanh toán | CANCELLED | Hệ thống | Nhả `reserved`; `usedCount - 1`; lý do "Hết hạn thanh toán" |

## Quy tắc bắt buộc

- Không cho chuyển trạng thái ngoài chuỗi hợp lệ ở bảng trên.
- `handledById` chỉ gán một lần, khi xác nhận đơn (PENDING → CONFIRMED), không đổi khi người khác xử lý các bước sau. Admin có quyền Staff nên `handledById` có thể là Admin. Đơn hủy trước khi xác nhận thì để trống. Mỗi lần đổi trạng thái ghi một dòng `order_status_histories` (trạng thái cũ/mới, người thao tác, lý do, thời điểm); người thao tác để trống khi hệ thống tự hủy.
- Khi tạo đơn, kiểm tra lại tồn kho và giá trong một transaction; không bán vượt tồn khả dụng (`stock - reserved`).
- Giỏ hàng chỉ là danh sách mong muốn mua, không giữ hàng.
- Đặt đơn khóa theo thứ tự cố định để tránh deadlock: giỏ → đơn → biến thể (id tăng dần) → voucher. Gửi lại cùng `Idempotency-Key` trả đúng đơn đã tạo (chống bấm hai lần).
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
- Chưa giới hạn số lần dùng cho mỗi khách: một người có thể dùng lại mã đến khi hết `usageLimit`. Để V2, cần thêm cột `perUserLimit` ở bảng `vouchers`.
- Tiền tính ở backend (`src/orders/orders.pricing.ts`): `phíShip = tạmTính >= 500.000 ? 0 : 30.000` (tính trước giảm giá); `PERCENT` làm tròn xuống rồi bị chặn bởi `maxDiscount` và `tạmTính`; `FIXED` bị chặn bởi `tạmTính` (tổng có thể bằng 0 khi tạmTính >= 500.000).
