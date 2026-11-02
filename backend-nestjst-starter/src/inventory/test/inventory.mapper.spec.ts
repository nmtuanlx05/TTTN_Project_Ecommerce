import {
  escapeLike,
  getStockStatus,
  toInventoryItem,
} from '../inventory.mapper';

describe('getStockStatus', () => {
  const status = (stock: number, reserved: number, minStock: number) =>
    getStockStatus({ stock, reserved, minStock });

  it('khả dụng = 0 là out (kể cả minStock = 0)', () => {
    expect(status(5, 5, 0)).toBe('out');
    expect(status(5, 5, 3)).toBe('out');
    expect(status(0, 0, 0)).toBe('out');
  });

  it('khả dụng âm (dữ liệu lệch) vẫn là out', () => {
    expect(status(2, 5, 0)).toBe('out');
  });

  it('khả dụng đúng bằng minStock là low', () => {
    expect(status(8, 3, 5)).toBe('low');
  });

  it('khả dụng dưới minStock nhưng > 0 là low', () => {
    expect(status(4, 3, 5)).toBe('low');
  });

  it('khả dụng = minStock + 1 là in_stock', () => {
    expect(status(9, 3, 5)).toBe('in_stock');
  });

  it('minStock = 0: còn 1 cái đã là in_stock, không bao giờ low', () => {
    expect(status(1, 0, 0)).toBe('in_stock');
    expect(status(100, 0, 0)).toBe('in_stock');
  });
});

describe('escapeLike', () => {
  it('thoát %, _ và chính ký tự thoát !', () => {
    expect(escapeLike('50%')).toBe('50!%');
    expect(escapeLike('a_b')).toBe('a!_b');
    expect(escapeLike('hot!')).toBe('hot!!');
    expect(escapeLike('%_!')).toBe('!%!_!!');
  });

  it('giữ nguyên chuỗi thường, dấu nháy và dấu gạch chéo ngược', () => {
    expect(escapeLike("áo O'Neil \\ x")).toBe("áo O'Neil \\ x");
  });
});

describe('toInventoryItem', () => {
  const row = (variantActive: boolean, productActive: boolean) => ({
    id: 1,
    sku: 'ATB-M',
    size: 'M',
    color: 'Đen',
    stock: 10,
    reserved: 4,
    minStock: 6,
    isActive: variantActive,
    product: {
      id: 2,
      name: 'Áo',
      imageUrl: null,
      isActive: productActive,
      category: { id: 3, name: 'Áo thun' },
    },
  });

  it('tính available, stockStatus và isHidden', () => {
    expect(toInventoryItem(row(true, true))).toMatchObject({
      available: 6,
      stockStatus: 'low',
      isHidden: false,
    });
  });

  it('isHidden = true khi biến thể hoặc sản phẩm đã ẩn', () => {
    expect(toInventoryItem(row(false, true)).isHidden).toBe(true);
    expect(toInventoryItem(row(true, false)).isHidden).toBe(true);
  });
});
