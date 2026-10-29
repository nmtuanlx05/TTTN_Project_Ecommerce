import {
  AVATAR_URL_MAX_LENGTH,
  MSG_AVATAR_URL_INVALID,
  validateAvatarUrl,
} from './avatar-url';

const PUBLIC_URL = 'http://localhost:3000';
const UUID = '3f2b8c1e-5d7a-4c0e-9b1a-2e6f4a7d8c90';
const own = (ext = 'png') => `${PUBLIC_URL}/uploads/avatars/${UUID}.${ext}`;

describe('validateAvatarUrl', () => {
  it('null (xóa ảnh) là hợp lệ', () => {
    expect(validateAvatarUrl(null, PUBLIC_URL)).toBeNull();
  });

  it.each(['jpg', 'png', 'webp'])('chấp nhận URL hệ thống cấp (.%s)', (ext) => {
    expect(validateAvatarUrl(own(ext), PUBLIC_URL)).toBeNull();
  });

  it('chấp nhận khi APP_PUBLIC_URL có ký tự đặc biệt của regex (dấu chấm, cổng)', () => {
    const publicUrl = 'https://cdn.shop.vn:8443';
    expect(
      validateAvatarUrl(`${publicUrl}/uploads/avatars/${UUID}.jpg`, publicUrl),
    ).toBeNull();
    // Dấu chấm trong host không được hiểu là "ký tự bất kỳ"
    expect(
      validateAvatarUrl(
        `https://cdnXshop.vn:8443/uploads/avatars/${UUID}.jpg`,
        publicUrl,
      ),
    ).toBe(MSG_AVATAR_URL_INVALID);
  });

  it.each<[string, string]>([
    ['chuỗi rỗng', ''],
    ['URL bên ngoài', `https://evil.com/uploads/avatars/${UUID}.png`],
    [
      'host giống nhưng thêm hậu tố',
      `${PUBLIC_URL}.evil.com/uploads/avatars/${UUID}.png`,
    ],
    [
      'URL thuộc thư mục products',
      `${PUBLIC_URL}/uploads/products/${UUID}.png`,
    ],
    ['path traversal', `${PUBLIC_URL}/uploads/avatars/../products/${UUID}.png`],
    [
      'path traversal đã mã hóa',
      `${PUBLIC_URL}/uploads/avatars/%2e%2e/${UUID}.png`,
    ],
    ['thư mục con thừa', `${PUBLIC_URL}/uploads/avatars/x/${UUID}.png`],
    ['đuôi không cho phép', `${PUBLIC_URL}/uploads/avatars/${UUID}.gif`],
    ['không phải uuid', `${PUBLIC_URL}/uploads/avatars/abc.png`],
    [
      'uuid viết hoa',
      `${PUBLIC_URL}/uploads/avatars/${UUID.toUpperCase()}.png`,
    ],
    ['có query', `${own()}?x=1`],
    ['có hash', `${own()}#x`],
    ['có khoảng trắng đầu', ` ${own()}`],
    ['có khoảng trắng cuối', `${own()} `],
    ['xuống dòng cuối', `${own()}\n`],
    ['không có http(s)', `/uploads/avatars/${UUID}.png`],
  ])('từ chối: %s', (_name, url) => {
    expect(validateAvatarUrl(url, PUBLIC_URL)).toBe(MSG_AVATAR_URL_INVALID);
  });

  it(`từ chối URL dài hơn ${AVATAR_URL_MAX_LENGTH} ký tự`, () => {
    const url = `${PUBLIC_URL}/uploads/avatars/${'a'.repeat(AVATAR_URL_MAX_LENGTH)}.png`;
    expect(validateAvatarUrl(url, PUBLIC_URL)).toBe(
      `Đường dẫn ảnh đại diện không được vượt quá ${AVATAR_URL_MAX_LENGTH} ký tự`,
    );
  });
});
