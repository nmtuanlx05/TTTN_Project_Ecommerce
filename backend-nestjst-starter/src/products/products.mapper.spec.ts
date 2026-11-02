import {
  adminProductListSelect,
  publicProductDetailSelect,
  publicProductListSelect,
  toAdminListItem,
  toPublicDetail,
  toPublicListItem,
} from './products.mapper';

type PublicDetailInput = Parameters<typeof toPublicDetail>[0];

// Trường nội bộ không bao giờ được xuất hiện ở API public
const INTERNAL_FIELDS = [
  'stock',
  'reserved',
  'minStock',
  'isActive',
  'createdAt',
  'updatedAt',
];

describe('products.mapper', () => {
  const category = { id: 2, name: 'Áo thun', slug: 'ao-thun' };

  describe('toPublicListItem', () => {
    const base = {
      id: 1,
      name: 'Áo thun basic',
      slug: 'ao-thun-basic',
      price: 199000,
      imageUrl: null,
      category,
    };
    const inStockOf = (variants: { stock: number; reserved: number }[]) =>
      toPublicListItem({ ...base, variants }).inStock;

    it('inStock = true khi có biến thể còn tồn khả dụng (stock - reserved > 0)', () => {
      expect(
        inStockOf([
          { stock: 5, reserved: 5 },
          { stock: 5, reserved: 2 },
        ]),
      ).toBe(true);
    });

    it('biên: available = 1 → còn hàng, available = 0 → hết hàng', () => {
      expect(inStockOf([{ stock: 1, reserved: 0 }])).toBe(true);
      expect(inStockOf([{ stock: 5, reserved: 4 }])).toBe(true);
      expect(inStockOf([{ stock: 0, reserved: 0 }])).toBe(false);
      expect(inStockOf([{ stock: 5, reserved: 5 }])).toBe(false);
    });

    it('biên: available âm (dữ liệu lệch reserved > stock) → hết hàng, không bị coi là còn', () => {
      expect(inStockOf([{ stock: 2, reserved: 3 }])).toBe(false);
      // Biến thể âm không được "bù" cho biến thể khác: chỉ cần một biến thể còn hàng là đủ
      expect(
        inStockOf([
          { stock: 2, reserved: 9 },
          { stock: 1, reserved: 0 },
        ]),
      ).toBe(true);
    });

    it('inStock = false khi mọi biến thể đã hết (kể cả đang được giữ hết)', () => {
      expect(
        inStockOf([
          { stock: 0, reserved: 0 },
          { stock: 3, reserved: 3 },
          { stock: 1, reserved: 4 },
        ]),
      ).toBe(false);
    });

    it('không có biến thể nào → inStock = false', () => {
      expect(inStockOf([])).toBe(false);
    });

    it('chỉ có đúng các khóa được phép, không lộ stock, reserved, minStock, isActive', () => {
      const item = toPublicListItem({
        ...base,
        variants: [{ stock: 9, reserved: 1 }],
      });
      expect(Object.keys(item).sort()).toEqual(
        [
          'category',
          'id',
          'imageUrl',
          'inStock',
          'name',
          'price',
          'slug',
        ].sort(),
      );
      expect(Object.keys(item.category).sort()).toEqual(['id', 'name', 'slug']);
      expect(item).not.toHaveProperty('variants');
    });
  });

  describe('toPublicDetail', () => {
    const product = {
      id: 1,
      name: 'Áo thun basic',
      slug: 'ao-thun-basic',
      description: 'Mô tả',
      price: 199000,
      imageUrl: null,
      category,
    };
    const variant = (
      id: number,
      stock: number,
      reserved: number,
    ): PublicDetailInput['variants'][number] => ({
      id,
      sku: `ATB-${id}`,
      size: 'M',
      color: 'Đen',
      stock,
      reserved,
    });
    const detail = toPublicDetail({
      ...product,
      variants: [variant(10, 4, 4), variant(11, 4, 1)],
    });

    it('inStock theo từng biến thể và cả sản phẩm', () => {
      expect(detail.variants.map((v) => v.inStock)).toEqual([false, true]);
      expect(detail.inStock).toBe(true);
    });

    it('biên từng biến thể: available = 1 → true, 0 → false, âm → false', () => {
      const d = toPublicDetail({
        ...product,
        variants: [variant(1, 1, 0), variant(2, 3, 3), variant(3, 2, 5)],
      });
      expect(d.variants.map((v) => v.inStock)).toEqual([true, false, false]);
      expect(d.inStock).toBe(true);
    });

    it('mọi biến thể hết hàng → inStock sản phẩm = false', () => {
      const d = toPublicDetail({
        ...product,
        variants: [variant(1, 0, 0), variant(2, 3, 3), variant(3, 2, 5)],
      });
      expect(d.inStock).toBe(false);
      expect(d.variants.every((v) => !v.inStock)).toBe(true);
    });

    it('không có biến thể nào → inStock = false, variants rỗng', () => {
      const d = toPublicDetail({ ...product, variants: [] });
      expect(d.inStock).toBe(false);
      expect(d.variants).toEqual([]);
    });

    it('chỉ có đúng các khóa được phép ở sản phẩm', () => {
      expect(Object.keys(detail).sort()).toEqual(
        [
          'category',
          'description',
          'id',
          'imageUrl',
          'inStock',
          'name',
          'price',
          'slug',
          'variants',
        ].sort(),
      );
      expect(Object.keys(detail.category).sort()).toEqual([
        'id',
        'name',
        'slug',
      ]);
    });

    it('biến thể chỉ có đúng id, sku, size, color, inStock', () => {
      for (const v of detail.variants) {
        expect(Object.keys(v).sort()).toEqual(
          ['color', 'id', 'inStock', 'size', 'sku'].sort(),
        );
      }
    });

    it('không có trường nội bộ ở sản phẩm lẫn biến thể', () => {
      const keys = [
        ...Object.keys(detail),
        ...detail.variants.flatMap((v) => Object.keys(v)),
      ];
      for (const field of INTERNAL_FIELDS) {
        expect(keys).not.toContain(field);
      }
    });

    it('số liệu tồn không lọt ra dù nằm lẫn trong JSON', () => {
      const json = JSON.stringify(detail);
      for (const field of ['stock', 'reserved', 'minStock', 'isActive']) {
        expect(json).not.toContain(`"${field}"`);
      }
    });
  });

  describe('select cho public', () => {
    it('chỉ lấy biến thể đang bán và không chọn trường nội bộ ở cấp sản phẩm', () => {
      for (const select of [
        publicProductListSelect,
        publicProductDetailSelect,
      ]) {
        expect(select.variants.where).toEqual({ isActive: true });
        for (const field of ['isActive', 'createdAt', 'updatedAt']) {
          expect(Object.keys(select)).not.toContain(field);
        }
      }
    });

    it('select chi tiết public không lấy minStock', () => {
      expect(
        Object.keys(publicProductDetailSelect.variants.select),
      ).not.toContain('minStock');
    });

    // Thêm trường vào select là lộ ra API: test này buộc phải sửa có chủ đích
    it('tập trường được select khớp chính xác', () => {
      expect(Object.keys(publicProductListSelect).sort()).toEqual(
        [
          'category',
          'id',
          'imageUrl',
          'name',
          'price',
          'slug',
          'variants',
        ].sort(),
      );
      expect(
        Object.keys(publicProductListSelect.variants.select).sort(),
      ).toEqual(['reserved', 'stock']);
      expect(Object.keys(publicProductDetailSelect).sort()).toEqual(
        [
          'category',
          'description',
          'id',
          'imageUrl',
          'name',
          'price',
          'slug',
          'variants',
        ].sort(),
      );
      expect(
        Object.keys(publicProductDetailSelect.variants.select).sort(),
      ).toEqual(['color', 'id', 'reserved', 'size', 'sku', 'stock']);
    });
  });

  describe('toAdminListItem', () => {
    it('đếm tổng số biến thể và số biến thể đang bán, bỏ mảng variants', () => {
      const item = toAdminListItem({
        id: 1,
        name: 'Áo',
        slug: 'ao',
        price: 100,
        imageUrl: null,
        isActive: true,
        createdAt: new Date(0),
        updatedAt: new Date(0),
        category: { id: 1, name: 'Áo' },
        variants: [{ isActive: true }, { isActive: false }, { isActive: true }],
      });
      expect(item.variantCount).toBe(3);
      expect(item.activeVariantCount).toBe(2);
      expect(item).not.toHaveProperty('variants');
    });

    it('select danh sách admin không lấy description và tồn kho', () => {
      expect(Object.keys(adminProductListSelect)).not.toContain('description');
      expect(adminProductListSelect.variants.select).toEqual({
        isActive: true,
      });
    });
  });
});
