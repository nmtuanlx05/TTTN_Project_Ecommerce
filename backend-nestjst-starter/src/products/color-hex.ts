import { fold } from '../common/utils/fold';

// Bảng tra tên màu -> mã hex (in hoa). Dùng cho seed và script dev.
// Migration 20261104090000_add_product_images_color_hex phải lặp lại bảng này trong SQL tĩnh;
// color-hex.spec.ts đối chiếu hai nơi nên sửa ở đây thì phải sửa cả migration mới (migration đã áp thì thêm migration mới).
export const COLOR_HEX_MAP: Readonly<Record<string, string>> = {
  Trắng: '#FFFFFF',
  Đen: '#111111',
  Xám: '#9A9A9A',
  'Xanh navy': '#2C3E5C',
  Xanh: '#4F7CAC',
  Hồng: '#E2B4BD',
  Be: '#C9B79C',
  'Xanh rêu': '#6B7A4F',
  'Xanh đậm': '#1F3A5F',
  'Xanh nhạt': '#A9C1D9',
};

// "#RRGGBB", chữ in hoa (khớp CHECK chk_product_variants_color_hex)
export const COLOR_HEX_REGEX = /^#[0-9A-F]{6}$/;

const foldedMap = new Map(
  Object.entries(COLOR_HEX_MAP).map(([name, hex]) => [fold(name), hex]),
);

// Tra hex theo tên màu, bỏ qua dấu, hoa/thường và khoảng trắng thừa; tên lạ trả null
export function lookupColorHex(name: string): string | null {
  return foldedMap.get(fold(name.trim().replace(/\s+/g, ' '))) ?? null;
}
