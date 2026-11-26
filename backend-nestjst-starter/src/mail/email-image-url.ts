import { toSafeHttpsUrl } from './escape-html';

// Biến đổi Cloudinary cho ảnh sản phẩm trong mail: khung 84x105 hiển thị ở mật độ 2x (168x210).
// JPG (không f_auto) vì nhiều ứng dụng mail không hiển thị webp/avif. Mỗi ảnh khác nhau là một lượt biến đổi tính vào
// hạn mức gói Cloudinary (giống mốc rộng cố định ở frontend, src/lib/img-url.ts).
export const EMAIL_IMAGE_TRANSFORM = 'f_jpg,q_auto,c_fill,w_168,h_210';

// Cùng quy tắc với frontend (img-url.ts): CHỈ biến đổi dạng https://res.cloudinary.com/<cloud>/image/upload/v<số>/...
// (đúng dạng secureUrl backend lưu). Không có v<số>/ ngay sau upload/ thì coi như đã có biến đổi hoặc dạng lạ: giữ nguyên.
const CLOUDINARY_UPLOAD =
  /^(https:\/\/res\.cloudinary\.com\/[^/?#]+\/image\/upload\/)(v\d+\/.+)$/;

// URL ảnh dùng được trong mail, hoặc null (không có/không hợp lệ: nơi gọi bỏ thẻ <img>).
// Chỉ https (toSafeHttpsUrl); URL https không phải Cloudinary (vd picsum) giữ nguyên. Kết quả CHƯA thoát HTML.
export function emailImageUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const safe = toSafeHttpsUrl(raw);
  if (!safe) return null;
  const match = CLOUDINARY_UPLOAD.exec(safe);
  return match ? `${match[1]}${EMAIL_IMAGE_TRANSFORM}/${match[2]}` : safe;
}
