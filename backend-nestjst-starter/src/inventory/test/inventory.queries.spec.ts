import { BadRequestException } from '@nestjs/common';
import {
  buildCountQuery,
  buildListIdsQuery,
  buildSummaryQuery,
  ORDER_SQL,
} from '../inventory.queries';
import type { InventoryFilter } from '../inventory.queries';
import { escapeLike } from '../inventory.mapper';

// Các test này chỉ kiểm câu SQL được dựng (chuỗi và tham số), KHÔNG chạy trên database thật.
describe('inventory.queries', () => {
  const base: InventoryFilter = { includeHidden: false };
  const list = (
    filter: Partial<InventoryFilter> = {},
    sortBy: 'name' | 'stock' | 'available' = 'name',
    order: 'asc' | 'desc' = 'asc',
  ) => buildListIdsQuery({ ...base, ...filter }, sortBy, order, 10, 20);

  it('mặc định chỉ lấy biến thể đang bán của sản phẩm đang hiện; limit/offset là tham số', () => {
    const query = list();
    expect(query.sql).toContain('pv.isActive = 1 AND p.isActive = 1');
    expect(query.sql).toContain('LIMIT ? OFFSET ?');
    expect(query.values).toEqual([10, 20]);
  });

  it('includeHidden = true thì bỏ điều kiện isActive', () => {
    const query = list({ includeHidden: true });
    expect(query.sql).not.toContain('isActive');
    expect(query.sql).not.toContain('WHERE');
  });

  it('q đi qua tham số ràng buộc, không nằm trong chuỗi SQL', () => {
    const text = escapeLike("50%_!'; DROP TABLE products; --");
    const query = list({ likeText: text });
    expect(query.sql).toContain("p.name LIKE ? ESCAPE '!'");
    expect(query.sql).toContain("pv.sku LIKE ? ESCAPE '!'");
    expect(query.sql).not.toContain('DROP');
    expect(query.sql).not.toContain('50');
    expect(query.values).toEqual([`%${text}%`, `%${text}%`, 10, 20]);
    // % và _ của người dùng đã bị thoát nên không thành ký tự đại diện
    expect(text.startsWith('50!%!_!!')).toBe(true);
  });

  it('categoryIds đi qua tham số, theo đúng thứ tự', () => {
    const query = list({ categoryIds: [1, 4, 9] });
    expect(query.sql).toContain('p.categoryId IN (?,?,?)');
    expect(query.values).toEqual([1, 4, 9, 10, 20]);
  });

  it('categoryIds rỗng thì báo lỗi lập trình thay vì dựng SQL sai', () => {
    expect(() => list({ categoryIds: [] })).toThrow('categoryIds');
    expect(() => buildCountQuery({ ...base, categoryIds: [] })).toThrow();
    expect(() =>
      buildSummaryQuery({ includeHidden: false, categoryIds: [] }),
    ).toThrow();
  });

  describe('stockStatus', () => {
    it.each([
      ['out', '(pv.stock - pv.reserved) <= 0'],
      [
        'low',
        '(pv.stock - pv.reserved) > 0 AND (pv.stock - pv.reserved) <= pv.minStock',
      ],
      [
        'in_stock',
        '(pv.stock - pv.reserved) > 0 AND (pv.stock - pv.reserved) > pv.minStock',
      ],
    ] as const)('%s dùng biểu thức đầy đủ', (stockStatus, expected) => {
      const query = list({ stockStatus });
      expect(query.sql).toContain(`(${expected})`);
    });

    it('stockStatus lạ bị từ chối', () => {
      expect(() =>
        list({ stockStatus: "out' OR 1=1" as unknown as 'out' }),
      ).toThrow(BadRequestException);
    });
  });

  describe('sắp xếp (whitelist ánh xạ sang SQL cố định)', () => {
    it.each([
      ['name', 'asc', 'ORDER BY p.name ASC, p.id ASC, pv.id ASC'],
      ['name', 'desc', 'ORDER BY p.name DESC, p.id DESC, pv.id ASC'],
      ['stock', 'asc', 'ORDER BY pv.stock ASC, pv.id ASC'],
      ['stock', 'desc', 'ORDER BY pv.stock DESC, pv.id ASC'],
      ['available', 'asc', 'ORDER BY (pv.stock - pv.reserved) ASC, pv.id ASC'],
      [
        'available',
        'desc',
        'ORDER BY (pv.stock - pv.reserved) DESC, pv.id ASC',
      ],
    ] as const)('%s %s', (sortBy, order, expected) => {
      expect(list({}, sortBy, order).sql).toContain(expected);
    });

    it('không có giá trị người dùng nào lọt vào ORDER BY (bảng chỉ có đoạn viết sẵn)', () => {
      expect(Object.keys(ORDER_SQL)).toEqual(['name', 'stock', 'available']);
    });

    it.each(['constructor', '__proto__', 'name; DROP TABLE x', 'updatedAt'])(
      'sortBy "%s" bị từ chối',
      (sortBy) => {
        expect(() => list({}, sortBy as 'name')).toThrow(BadRequestException);
      },
    );

    it('order lạ bị từ chối', () => {
      expect(() => list({}, 'name', 'asc; DROP' as 'asc')).toThrow(
        BadRequestException,
      );
    });
  });

  it('không dùng alias available (MySQL không cho dùng trong WHERE/SUM)', () => {
    const all = [
      list({ stockStatus: 'low' }, 'available', 'desc'),
      buildCountQuery({ ...base, stockStatus: 'in_stock' }),
      buildSummaryQuery(base),
    ];
    for (const query of all) {
      expect(query.sql).not.toMatch(/\bavailable\b/i);
    }
  });

  it('count dùng cùng điều kiện lọc với danh sách', () => {
    const filter = { ...base, categoryIds: [2], likeText: 'ao' };
    const count = buildCountQuery(filter);
    expect(count.sql).toMatch(
      /^SELECT COUNT\(\*\) AS total FROM product_variants pv/,
    );
    expect(count.values).toEqual([2, '%ao%', '%ao%']);
  });

  it('summary: 4 số trong một câu, chỉ nhận categoryIds và includeHidden', () => {
    const query = buildSummaryQuery({
      includeHidden: false,
      categoryIds: [5, 6],
    });
    expect(query.sql).toContain('COUNT(*) AS total');
    expect(query.sql.match(/COALESCE\(SUM\(CASE WHEN/g)).toHaveLength(3);
    expect(query.sql).toContain('AS inStock');
    expect(query.sql).toContain('AS low');
    expect(query.sql).toContain('AS `out`');
    expect(query.sql).toContain('pv.isActive = 1 AND p.isActive = 1');
    expect(query.sql).toContain('p.categoryId IN (?,?)');
    expect(query.values).toEqual([5, 6]);
  });
});
