// Mọi giá trị do người dùng/cấu hình đưa vào HTML mail phải đi qua một trong các hàm ở đây.

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

// Thoát 5 ký tự đặc biệt của HTML; dùng được cho cả nội dung lẫn giá trị thuộc tính (đã bọc dấu nháy kép)
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

function parseUrl(raw: string, protocols: readonly string[]): string | null {
  const text = raw.trim();
  // Không nhận ký tự điều khiển/khoảng trắng bên trong (chống chèn thuộc tính, xuống dòng)
  if (!text || /[\s\p{Cc}]/u.test(text)) return null;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (!protocols.includes(url.protocol)) return null;
  // Không nhận URL chứa tên người dùng/mật khẩu
  if (url.username || url.password) return null;
  return url.href;
}

// Chỉ http/https (link bấm được). Trả về href đã chuẩn hóa, CHƯA thoát HTML (gọi escapeHtml khi chèn vào thuộc tính).
export function toSafeHttpUrl(raw: string): string | null {
  return parseUrl(raw, ['http:', 'https:']);
}

// Chỉ https (ảnh nhúng trong mail: nhiều ứng dụng mail chặn ảnh http)
export function toSafeHttpsUrl(raw: string): string | null {
  return parseUrl(raw, ['https:']);
}
