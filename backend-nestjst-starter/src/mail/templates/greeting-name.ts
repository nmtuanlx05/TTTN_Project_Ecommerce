// Số ký tự tối đa của tên trong lời chào (tên rất dài làm vỡ bố cục)
export const GREETING_NAME_MAX_LENGTH = 60;

// Tên dùng trong lời chào, hoặc null nếu nên chào chung ("Xin chào bạn.").
// null khi tên rỗng/null, hoặc (không phân biệt hoa thường) trùng phần trước @ của email: đó là tên BE tự đặt khi
// khách không nhập tên (auth.service.ts), không phải tên thật. Tên dài bị cắt (theo ký tự, không cắt đôi cặp thay thế).
// Hàm trả chuỗi THÔ; nơi chèn vào HTML phải escapeHtml.
export function resolveGreetingName(
  name: string | null | undefined,
  email: string,
): string | null {
  // Gộp mọi khoảng trắng/xuống dòng/ký tự điều khiển thành một dấu cách
  const cleaned = (name ?? '').replace(/[\p{Cc}\s]+/gu, ' ').trim();
  if (!cleaned) return null;

  const localPart = email.split('@')[0]?.trim().toLowerCase();
  if (localPart && cleaned.toLowerCase() === localPart) return null;

  const cut = Array.from(cleaned)
    .slice(0, GREETING_NAME_MAX_LENGTH)
    .join('')
    .trim();
  return cut || null;
}
