import {
  adminProductDetailSelect,
  adminProductListSelect,
  buildColors,
  publicProductDetailSelect,
  publicProductListSelect,
  toAdminDetail,
  toAdminListItem,
  toPublicDetail,
  toPublicListItem,
} from './products.mapper';
import { getStockStatus } from '../inventory/inventory.mapper';

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

// Mọi tổ hợp stock/reserved/minStock trong 0..max, gồm cả reserved > stock (dữ liệu lệch)
function levelCombinations(max = 6) {
  const levels: { stock: number; reserved: number; minStock: number }[] = [];
  for (let stock = 0; stock <= max; stock++) {
    for (let reserved = 0; reserved <= max; reserved++) {
      for (let minStock = 0; minStock <= max; minStock++) {
        levels.push({ stock, reserved, minStock });
      }
    }
  }
  return levels;
}

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
      images: [] as { url: string }[],
    };
    type ListVariant = {
      stock: number;
      reserved: number;
      minStock?: number;
      color?: string;
      colorHex?: string | null;
    };
    const listOf = (variants: ListVariant[]) =>
      toPublicListItem({
        ...base,
        variants: variants.map((v) => ({
          color: 'Đen',
          colorHex: null,
          minStock: 0,
          ...v,
        })),
      });
    const inStockOf = (variants: ListVariant[]) => listOf(variants).inStock;
    const lowStockOf = (variants: ListVariant[]) => listOf(variants).lowStock;

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
      const item = listOf([{ stock: 9, reserved: 1 }]);
      expect(Object.keys(item).sort()).toEqual(
        [
          'category',
          'colors',
          'id',
          'imageUrl',
          'inStock',
          'lowStock',
          'name',
          'price',
          'secondImageUrl',
          'slug',
        ].sort(),
      );
      expect(Object.keys(item.category).sort()).toEqual(['id', 'name', 'slug']);
      expect(item).not.toHaveProperty('variants');
    });

    it('lowStock chỉ là boolean, không lọt số liệu tồn dù nằm lẫn trong JSON', () => {
      const item = listOf([{ stock: 9, reserved: 1, minStock: 10 }]);
      expect(typeof item.lowStock).toBe('boolean');
      const json = JSON.stringify(item);
      for (const field of ['stock', 'reserved', 'minStock', 'isActive']) {
        expect(json).not.toContain(`"${field}"`);
      }
    });

    describe('ảnh', () => {
      const withImages = (urls: string[], imageUrl: string | null = null) =>
        toPublicListItem({
          ...base,
          imageUrl,
          images: urls.map((url) => ({ url })),
          variants: [],
        });

      it('imageUrl = ảnh đầu, secondImageUrl = ảnh thứ hai', () => {
        const item = withImages(['a', 'b']);
        expect(item.imageUrl).toBe('a');
        expect(item.secondImageUrl).toBe('b');
      });

      it('chỉ một ảnh → secondImageUrl = null', () => {
        const item = withImages(['a']);
        expect(item.imageUrl).toBe('a');
        expect(item.secondImageUrl).toBeNull();
      });

      it('chưa có dòng ảnh: dự phòng bằng cột imageUrl cũ, secondImageUrl = null', () => {
        const item = withImages([], 'legacy');
        expect(item.imageUrl).toBe('legacy');
        expect(item.secondImageUrl).toBeNull();
      });

      it('có dòng ảnh thì ưu tiên ảnh thật, bỏ qua cột cũ', () => {
        expect(withImages(['a'], 'legacy').imageUrl).toBe('a');
      });

      it('không ảnh nào → imageUrl = null', () => {
        expect(withImages([]).imageUrl).toBeNull();
      });
    });

    describe('colors', () => {
      it('trả tên và hex, giữ thứ tự xuất hiện, bỏ trùng', () => {
        const item = listOf([
          { stock: 1, reserved: 0, color: 'Trắng', colorHex: '#FFFFFF' },
          { stock: 1, reserved: 0, color: 'Trắng', colorHex: '#FFFFFF' },
          { stock: 1, reserved: 0, color: 'Đen', colorHex: '#111111' },
        ]);
        expect(item.colors).toEqual([
          { name: 'Trắng', hex: '#FFFFFF' },
          { name: 'Đen', hex: '#111111' },
        ]);
      });

      it('bỏ trùng không phân biệt hoa thường, dấu và khoảng trắng hai đầu', () => {
        expect(
          buildColors([
            { color: 'Đen', colorHex: '#111111' },
            { color: ' den ', colorHex: '#111111' },
            { color: 'ĐEN', colorHex: null },
          ]),
        ).toEqual([{ name: 'Đen', hex: '#111111' }]);
      });

      it('hex có thể null; cùng màu thì lấy hex của biến thể sau nếu biến thể đầu chưa có', () => {
        expect(
          buildColors([
            { color: 'Be', colorHex: null },
            { color: 'Xám', colorHex: null },
            { color: 'be', colorHex: '#C9B79C' },
          ]),
        ).toEqual([
          { name: 'Be', hex: '#C9B79C' },
          { name: 'Xám', hex: null },
        ]);
      });

      it('không biến thể → mảng rỗng', () => {
        expect(buildColors([])).toEqual([]);
      });

      it('colors không lộ số liệu tồn', () => {
        const json = JSON.stringify(
          listOf([{ stock: 9, reserved: 1, minStock: 10, color: 'Đen' }])
            .colors,
        );
        for (const field of ['stock', 'reserved', 'minStock']) {
          expect(json).not.toContain(`"${field}"`);
        }
      });
    });

    describe('lowStock', () => {
      it('một biến thể sắp hết (0 < available <= minStock) → true', () => {
        expect(lowStockOf([{ stock: 3, reserved: 0, minStock: 5 }])).toBe(true);
      });

      it('biên: available đúng bằng minStock → true', () => {
        expect(lowStockOf([{ stock: 5, reserved: 0, minStock: 5 }])).toBe(true);
        expect(lowStockOf([{ stock: 8, reserved: 3, minStock: 5 }])).toBe(true);
      });

      it('biên: available = minStock + 1 → false', () => {
        expect(lowStockOf([{ stock: 6, reserved: 0, minStock: 5 }])).toBe(
          false,
        );
        expect(lowStockOf([{ stock: 9, reserved: 3, minStock: 5 }])).toBe(
          false,
        );
      });

      it('minStock = 0 → không bao giờ sắp hết (còn 1 cái vẫn là in_stock)', () => {
        expect(lowStockOf([{ stock: 1, reserved: 0, minStock: 0 }])).toBe(
          false,
        );
        expect(lowStockOf([{ stock: 100, reserved: 0, minStock: 0 }])).toBe(
          false,
        );
      });

      it('một biến thể sắp hết nhưng biến thể khác còn nhiều → false', () => {
        expect(
          lowStockOf([
            { stock: 2, reserved: 0, minStock: 5 },
            { stock: 50, reserved: 0, minStock: 5 },
          ]),
        ).toBe(false);
      });

      it('mọi biến thể còn hàng đều sắp hết → true', () => {
        expect(
          lowStockOf([
            { stock: 2, reserved: 0, minStock: 5 },
            { stock: 4, reserved: 1, minStock: 5 },
          ]),
        ).toBe(true);
      });

      it('biến thể hết hàng cộng biến thể sắp hết → true (hết hàng không tính)', () => {
        expect(
          lowStockOf([
            { stock: 0, reserved: 0, minStock: 5 },
            { stock: 3, reserved: 0, minStock: 5 },
          ]),
        ).toBe(true);
        // available âm cũng là hết hàng
        expect(
          lowStockOf([
            { stock: 2, reserved: 3, minStock: 5 },
            { stock: 3, reserved: 0, minStock: 5 },
          ]),
        ).toBe(true);
      });

      it('mọi biến thể hết hàng → false (không phải "sắp hết")', () => {
        expect(
          lowStockOf([
            { stock: 0, reserved: 0, minStock: 5 },
            { stock: 3, reserved: 3, minStock: 5 },
          ]),
        ).toBe(false);
      });

      it('không có biến thể (hoặc mọi biến thể ẩn nên select trả rỗng) → false', () => {
        expect(lowStockOf([])).toBe(false);
      });

      it('mỗi biến thể dùng minStock riêng của nó', () => {
        expect(
          lowStockOf([
            { stock: 4, reserved: 0, minStock: 5 }, // low
            { stock: 4, reserved: 0, minStock: 3 }, // in_stock
          ]),
        ).toBe(false);
      });

      it('lowStock = true kéo theo inStock = true (quét nhiều tổ hợp)', () => {
        for (const level of levelCombinations()) {
          const item = listOf([level]);
          if (item.lowStock) expect(item.inStock).toBe(true);
        }
        for (const a of levelCombinations(3)) {
          for (const b of levelCombinations(3)) {
            const item = listOf([a, b]);
            if (item.lowStock) expect(item.inStock).toBe(true);
          }
        }
      });

      // Hai nơi định nghĩa "còn hàng": isAvailable (products.mapper) và getStockStatus (inventory.mapper).
      // Test này chặn hai công thức lệch nhau: nếu ai sửa một bên, inStock của danh sách công khai và
      // trạng thái 'low' ở trang kho sẽ không còn nhất quán, và test đỏ.
      it('inStock (products) khớp getStockStatus !== "out" (inventory) với mọi tổ hợp stock/reserved/minStock', () => {
        for (const level of levelCombinations()) {
          expect(inStockOf([level])).toBe(
            getStockStatus({ minStock: 0, ...level }) !== 'out',
          );
        }
      });

      it('lowStock của một biến thể khớp getStockStatus === "low" (inventory)', () => {
        for (const level of levelCombinations()) {
          expect(lowStockOf([level])).toBe(
            getStockStatus({ minStock: 0, ...level }) === 'low',
          );
        }
      });
    });
  });

  describe('toPublicDetail', () => {
    const product = {
      id: 1,
      name: 'Áo thun basic',
      slug: 'ao-thun-basic',
      description: 'Mô tả',
      price: 199000,
      imageUrl: null as string | null,
      category,
      images: [] as { url: string }[],
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
      colorHex: '#111111',
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
          'images',
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

    it('biến thể chỉ có đúng id, sku, size, color, colorHex, inStock', () => {
      for (const v of detail.variants) {
        expect(Object.keys(v).sort()).toEqual(
          ['color', 'colorHex', 'id', 'inStock', 'size', 'sku'].sort(),
        );
      }
    });

    describe('ảnh', () => {
      const withImages = (urls: string[], imageUrl: string | null = null) =>
        toPublicDetail({
          ...product,
          imageUrl,
          images: urls.map((url) => ({ url })),
          variants: [],
        });

      it('images đúng thứ tự đã sắp xếp, chỉ có url; imageUrl = ảnh đầu', () => {
        const d = withImages(['a', 'b', 'c']);
        expect(d.images).toEqual([{ url: 'a' }, { url: 'b' }, { url: 'c' }]);
        expect(d.imageUrl).toBe('a');
      });

      it('chưa có dòng ảnh nhưng cột imageUrl có giá trị → images = [{ url: imageUrl }]', () => {
        const d = withImages([], 'legacy');
        expect(d.images).toEqual([{ url: 'legacy' }]);
        expect(d.imageUrl).toBe('legacy');
      });

      it('không có ảnh nào và imageUrl null → images = [], imageUrl = null', () => {
        const d = withImages([]);
        expect(d.images).toEqual([]);
        expect(d.imageUrl).toBeNull();
      });

      it('imageUrl là chuỗi rỗng cũng không tạo ảnh dự phòng', () => {
        expect(withImages([], '').images).toEqual([]);
      });

      it('có dòng ảnh thì bỏ qua cột imageUrl cũ', () => {
        const d = withImages(['a'], 'legacy');
        expect(d.images).toEqual([{ url: 'a' }]);
        expect(d.imageUrl).toBe('a');
      });
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
          'images',
          'name',
          'price',
          'slug',
          'variants',
        ].sort(),
      );
      expect(
        Object.keys(publicProductListSelect.variants.select).sort(),
      ).toEqual(['color', 'colorHex', 'minStock', 'reserved', 'stock']);
      expect(Object.keys(publicProductDetailSelect).sort()).toEqual(
        [
          'category',
          'description',
          'id',
          'imageUrl',
          'images',
          'name',
          'price',
          'slug',
          'variants',
        ].sort(),
      );
      expect(
        Object.keys(publicProductDetailSelect.variants.select).sort(),
      ).toEqual([
        'color',
        'colorHex',
        'id',
        'reserved',
        'size',
        'sku',
        'stock',
      ]);
    });

    // Chống N+1: ảnh và biến thể lấy cùng truy vấn danh sách; danh sách chỉ lấy tối đa 2 ảnh, sắp theo sortOrder
    it('ảnh public: danh sách take 2 sắp theo sortOrder; chỉ chọn url', () => {
      expect(publicProductListSelect.images.take).toBe(2);
      expect(publicProductListSelect.images.orderBy[0]).toEqual({
        sortOrder: 'asc',
      });
      expect(publicProductListSelect.images.select).toEqual({ url: true });
      expect(publicProductDetailSelect.images.select).toEqual({ url: true });
    });

    it('biến thể public sắp theo id để thứ tự màu ổn định', () => {
      expect(publicProductListSelect.variants.orderBy).toEqual({ id: 'asc' });
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
        images: [],
        variants: [{ isActive: true }, { isActive: false }, { isActive: true }],
      });
      expect(item.variantCount).toBe(3);
      expect(item.activeVariantCount).toBe(2);
      expect(item).not.toHaveProperty('variants');
      expect(item).not.toHaveProperty('images');
    });

    it('imageUrl = ảnh đầu; chưa có dòng ảnh thì giữ cột cũ', () => {
      const row = {
        id: 1,
        name: 'Áo',
        slug: 'ao',
        price: 100,
        isActive: true,
        createdAt: new Date(0),
        updatedAt: new Date(0),
        category: { id: 1, name: 'Áo' },
        variants: [],
      };
      expect(
        toAdminListItem({ ...row, imageUrl: 'old', images: [{ url: 'a' }] })
          .imageUrl,
      ).toBe('a');
      expect(
        toAdminListItem({ ...row, imageUrl: 'old', images: [] }).imageUrl,
      ).toBe('old');
    });

    it('select danh sách admin không lấy description và tồn kho', () => {
      expect(Object.keys(adminProductListSelect)).not.toContain('description');
      expect(adminProductListSelect.variants.select).toEqual({
        isActive: true,
      });
    });
  });

  describe('toAdminDetail', () => {
    const row = {
      id: 1,
      name: 'Áo',
      slug: 'ao',
      description: null,
      price: 100,
      imageUrl: 'legacy' as string | null,
      isActive: true,
      createdAt: new Date(0),
      updatedAt: new Date(0),
      category: { id: 1, name: 'Áo', slug: 'ao' },
      variants: [],
    };

    it('trả images thật (id, url, sortOrder) và imageUrl = ảnh đầu', () => {
      const images = [
        { id: 31, url: 'a', sortOrder: 0 },
        { id: 32, url: 'b', sortOrder: 1 },
      ];
      const detail = toAdminDetail({ ...row, images });
      expect(detail.images).toEqual(images);
      expect(detail.imageUrl).toBe('a');
    });

    it('không dự phòng images từ imageUrl; imageUrl giữ giá trị cột cũ khi chưa có dòng ảnh', () => {
      const detail = toAdminDetail({ ...row, images: [] });
      expect(detail.images).toEqual([]);
      expect(detail.imageUrl).toBe('legacy');
    });

    it('select chi tiết admin có images (id, url, sortOrder) và colorHex ở biến thể', () => {
      expect(adminProductDetailSelect.images.select).toEqual({
        id: true,
        url: true,
        sortOrder: true,
      });
      expect(adminProductDetailSelect.variants.select.colorHex).toBe(true);
    });
  });
});
