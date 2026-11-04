import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { COLOR_HEX_MAP, COLOR_HEX_REGEX, lookupColorHex } from './color-hex';

const MIGRATIONS_DIR = join(__dirname, '../../prisma/migrations');

describe('color-hex', () => {
  it('mọi hex trong bảng tra đúng dạng #RRGGBB in hoa', () => {
    for (const hex of Object.values(COLOR_HEX_MAP)) {
      expect(hex).toMatch(COLOR_HEX_REGEX);
    }
  });

  it('COLOR_HEX_REGEX từ chối chữ thường, thiếu #, sai độ dài, ký tự lạ', () => {
    for (const bad of [
      '#ffffff',
      'FFFFFF',
      '#FFF',
      '#FFFFFFF',
      '#GGGGGG',
      '',
    ]) {
      expect(COLOR_HEX_REGEX.test(bad)).toBe(false);
    }
    expect(COLOR_HEX_REGEX.test('#0A1B2C')).toBe(true);
  });

  describe('lookupColorHex', () => {
    it('khớp tên có dấu', () => {
      expect(lookupColorHex('Trắng')).toBe('#FFFFFF');
      expect(lookupColorHex('Xanh đậm')).toBe('#1F3A5F');
    });

    it('bỏ qua dấu, hoa thường và khoảng trắng thừa', () => {
      expect(lookupColorHex('trang')).toBe('#FFFFFF');
      expect(lookupColorHex('  XANH   DAM ')).toBe('#1F3A5F');
      expect(lookupColorHex('Đen')).toBe('#111111');
      expect(lookupColorHex('den')).toBe('#111111');
    });

    it('"Xanh" không bị nhầm với "Xanh navy" hay "Xanh nhạt"', () => {
      expect(lookupColorHex('Xanh')).toBe('#4F7CAC');
      expect(lookupColorHex('Xanh navy')).toBe('#2C3E5C');
      expect(lookupColorHex('Xanh nhạt')).toBe('#A9C1D9');
    });

    it('tên lạ → null', () => {
      expect(lookupColorHex('Vàng chanh')).toBeNull();
      expect(lookupColorHex('')).toBeNull();
    });
  });

  // Migration phải lặp lại bảng tra trong SQL tĩnh: hai nơi lệch nhau thì test này đỏ.
  describe('đối chiếu với migration add_product_images_color_hex', () => {
    const dir = readdirSync(MIGRATIONS_DIR).find((d) =>
      d.endsWith('_add_product_images_color_hex'),
    );
    const sql = dir
      ? readFileSync(join(MIGRATIONS_DIR, dir, 'migration.sql'), 'utf8')
      : '';
    const pairs = [
      ...sql.matchAll(/WHEN '([^']+)' THEN '(#[0-9A-F]{6})'/g),
    ].map((m) => [m[1], m[2]] as const);

    it('tìm thấy file migration', () => {
      expect(dir).toBeDefined();
    });

    it('mỗi dòng bảng tra có đúng một WHEN ... THEN tương ứng trong SQL', () => {
      expect(Object.fromEntries(pairs)).toEqual(COLOR_HEX_MAP);
      expect(pairs).toHaveLength(Object.keys(COLOR_HEX_MAP).length);
    });
  });
});
