// Hằng số nội dung dùng chung cho các mẫu mail. Cố ý là hằng số trong code (không thêm biến môi trường).

// Mã voucher giới thiệu trong mail chào mừng. Đây là mã CÔNG KHAI dùng chung (không phải mã riêng của từng người):
// worker đọc voucher này từ DB lúc gửi; không tồn tại/không còn dùng được thì mail bỏ khối voucher chứ không lỗi.
export const WELCOME_VOUCHER_CODE = 'MONO10';

// Ảnh hero đầu thư. Mặc định RỖNG = không có khối ảnh.
// Muốn dùng: tải ảnh lên Cloudinary rồi dán URL https dạng JPG đã biến đổi, xem docs/mail-setup.md ("Thêm ảnh hero").
// Chỉ nhận https. KHÔNG dùng webp/avif (nhiều ứng dụng mail không hiển thị).
export const HERO_IMAGE_URL = '';
