import {
  adminProductListSelect,
  publicProductDetailSelect,
  publicProductListSelect,
  toAdminListItem,
  toPublicDetail,
  toPublicListItem,
} from './products.mapper';

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

    it('inStock = true khi có biến thể còn tồn khả dụng (stock - reserved > 0)', () => {
      const item = toPublicListItem({
        ...base,
        variants: [
          { stock: 5, reserved: 5 },
          { stock: 5, reserved: 2 },
        ],
      });
      expect(item.inStock).toBe(true);
    });

    it('inStock = false khi mọi biến thể đã hết (kể cả đang được giữ hết)', () => {
      const item = toPublicListItem({
        ...base,
        variants: [
          { stock: 0, reserved: 0 },
          { stock: 3, reserved: 3 },
        ],
      });
      expect(item.inStock).toBe(false);
    });

    it('không lộ số liệu tồn kho hay trường nội bộ', () => {
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
    });
  });

  describe('toPublicDetail', () => {
    const detail = toPublicDetail({
      id: 1,
      name: 'Áo thun basic',
      slug: 'ao-thun-basic',
      description: 'Mô tả',
      price: 199000,
      imageUrl: null,
      category,
      variants: [
        {
          id: 10,
          sku: 'ATB-M-DEN',
          size: 'M',
          color: 'Đen',
          stock: 4,
          reserved: 4,
        },
        {
          id: 11,
          sku: 'ATB-L-DEN',
          size: 'L',
          color: 'Đen',
          stock: 4,
          reserved: 1,
        },
      ],
    });

    it('inStock theo từng biến thể và cả sản phẩm', () => {
      expect(detail.variants.map((v) => v.inStock)).toEqual([false, true]);
      expect(detail.inStock).toBe(true);
    });

    it('biến thể chỉ có id, sku, size, color, inStock', () => {
      for (const variant of detail.variants) {
        expect(Object.keys(variant).sort()).toEqual(
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
