import { pickUniqueSlug, slugify } from './slugify';

describe('slugify', () => {
  it.each([
    ['Áo Thun Nam', 'ao-thun-nam'],
    ['  Quần   Đùi!! ', 'quan-dui'],
    ['ĐẦM Dạ Hội (2026)', 'dam-da-hoi-2026'],
    ['Nón --- Lưỡi trai', 'non-luoi-trai'],
    ['!!!', ''],
  ])('%s -> %s', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it('cắt ngắn để chừa chỗ cho hậu tố và không để dấu - ở cuối', () => {
    const slug = slugify(`${'a'.repeat(179)} bbb`);
    expect(slug.length).toBeLessThanOrEqual(180);
    expect(slug.endsWith('-')).toBe(false);
  });
});

describe('pickUniqueSlug', () => {
  it('giữ nguyên khi còn trống', () => {
    expect(pickUniqueSlug('ao', [])).toBe('ao');
    expect(pickUniqueSlug('ao', ['ao-thun'])).toBe('ao');
  });

  it('thêm hậu tố nhỏ nhất còn trống khi trùng', () => {
    expect(pickUniqueSlug('ao', ['ao'])).toBe('ao-2');
    expect(pickUniqueSlug('ao', ['ao', 'ao-2', 'ao-3'])).toBe('ao-4');
    expect(pickUniqueSlug('ao', ['AO'])).toBe('ao-2');
  });
});
