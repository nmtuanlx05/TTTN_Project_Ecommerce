import { EMAIL_IMAGE_TRANSFORM, emailImageUrl } from './email-image-url';

const BASE = 'https://res.cloudinary.com/demo/image/upload';

describe('emailImageUrl', () => {
  it('Cloudinary chưa có biến đổi (v<số>/ ngay sau upload/): chèn biến đổi JPG 168x210', () => {
    expect(emailImageUrl(`${BASE}/v1712345678/mono-studio/a/x.webp`)).toBe(
      `${BASE}/f_jpg,q_auto,c_fill,w_168,h_210/v1712345678/mono-studio/a/x.webp`,
    );
    expect(EMAIL_IMAGE_TRANSFORM).toBe('f_jpg,q_auto,c_fill,w_168,h_210');
  });

  it('Cloudinary đã có biến đổi: giữ nguyên, không chèn lần hai', () => {
    const url = `${BASE}/c_fill,w_100/v1/x.jpg`;
    expect(emailImageUrl(url)).toBe(url);
  });

  it('Cloudinary không có phần phiên bản: giữ nguyên (không đoán được có biến đổi hay chưa)', () => {
    const url = `${BASE}/mono-studio/x.jpg`;
    expect(emailImageUrl(url)).toBe(url);
  });

  it.each([
    ['picsum', 'https://picsum.photos/seed/ao-thun-1/600/800'],
    [
      'video Cloudinary',
      'https://res.cloudinary.com/demo/video/upload/v1/x.mp4',
    ],
    [
      'host giả mạo',
      'https://res.cloudinary.com.evil.test/demo/image/upload/v1/x.jpg',
    ],
  ])('URL https khác (%s): giữ nguyên', (_label, url) => {
    expect(emailImageUrl(url)).toBe(url);
  });

  it.each([
    ['http', 'http://res.cloudinary.com/demo/image/upload/v1/x.jpg'],
    ['javascript:', 'javascript:alert(1)'],
    ['data:', 'data:image/png;base64,AAAA'],
    ['chuỗi rỗng', ''],
    ['chỉ khoảng trắng', '   '],
    ['đường dẫn tương đối', '/uploads/x.jpg'],
    ['có khoảng trắng bên trong', 'https://example.com/a b.jpg'],
    ['có thông tin đăng nhập', 'https://u:p@example.com/x.jpg'],
  ])('không hợp lệ (%s) => null', (_label, url) => {
    expect(emailImageUrl(url)).toBeNull();
  });

  it('null/undefined => null', () => {
    expect(emailImageUrl(null)).toBeNull();
    expect(emailImageUrl(undefined)).toBeNull();
  });
});
