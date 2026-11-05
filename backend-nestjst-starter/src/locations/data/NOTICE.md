# NOTICE — dữ liệu đơn vị hành chính

File `vn-admin-units.json` là bản chuyển đổi định dạng của tập dữ liệu **dvhcvn**.

- **Nguồn:** https://github.com/daohoangson/dvhcvn (file `data/dvhcvn.json`)
- **Phiên bản:** tag `v20250301`, commit `eaddcea82fc336d59e908989f04178c336a9db10` (viết tắt `eaddcea`)
- **Ngày dữ liệu:** 01/03/2025 (trường `data_date` của file gốc)
- **Giấy phép:** GNU General Public License v3.0 (GPL-3.0), xem https://www.gnu.org/licenses/gpl-3.0.html
- **Nguồn gốc dữ liệu của dvhcvn:** Danh mục hành chính của Tổng cục Thống kê (https://danhmuchanhchinh.gso.gov.vn/)
  và Hệ thống bản đồ hành chính của Cổng thông tin điện tử Chính phủ (gis.chinhphu.vn), theo mô tả của dvhcvn.

## Phạm vi và chuẩn dữ liệu

- Dữ liệu theo chuẩn **CŨ**: 63 tỉnh/thành phố, 696 quận/huyện, 10.047 phường/xã (3 cấp), **trước** đợt sắp xếp
  lại đơn vị hành chính từ 01/07/2025. Nâng lên chuẩn mới (bỏ cấp huyện) để V2.
- 5 huyện đảo không có phường/xã trong nguồn: Bạch Long Vĩ (318), Cồn Cỏ (471), Hoàng Sa (498), Lý Sơn (536), Côn Đảo (755).

## Thay đổi so với file gốc

Chỉ đổi định dạng, không thêm/sửa/xóa đơn vị nào: `level1_id/level2_id/level3_id` → `code`, `level2s/level3s` →
`districts/wards`, bỏ trường `type` (Tỉnh, Quận, Phường...; loại đã nằm trong `name`), nén khoảng trắng. Số lượng và mã
được đối chiếu với file gốc khi chuyển đổi (63 / 696 / 10.047, không trùng mã).

Vì file này là bản phái sinh của dữ liệu GPL-3.0, hãy xem lại điều kiện giấy phép khi phát hành sản phẩm.
