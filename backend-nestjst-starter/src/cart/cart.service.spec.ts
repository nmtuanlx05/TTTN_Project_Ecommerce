import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { CartService } from './cart.service';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));

// PrismaService thật kéo @nestjs/config (chỉ có bản ESM) nên mock; Prisma giả: chỉ kiểm logic và tham số truy vấn. Khóa dòng và UNIQUE thật chưa được test trên MySQL.
const USER = 7;
const CART_ID = 70;

function setup(
  variant: Partial<{
    stock: number;
    reserved: number;
    isActive: boolean;
    product: { isActive: boolean };
  }> | null = {},
) {
  const tx = {
    cart: { findUnique: jest.fn(), createMany: jest.fn() },
    $queryRaw: jest.fn().mockResolvedValue([{ id: CART_ID }]),
    productVariant: {
      findUnique: jest.fn().mockResolvedValue(
        variant === null
          ? null
          : {
              stock: 50,
              reserved: 0,
              isActive: true,
              product: { isActive: true },
              ...variant,
            },
      ),
    },
    cartItem: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  tx.cart.findUnique.mockResolvedValue({ id: CART_ID });
  const prisma = {
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
    cart: { findUnique: jest.fn().mockResolvedValue({ items: [] }) },
    cartItem: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
  };
  const service = new CartService(prisma as never);
  return { service, prisma, tx };
}

describe('CartService.getCart', () => {
  it('chưa có giỏ: trả giỏ rỗng và không ghi gì', async () => {
    const { service, prisma } = setup();
    prisma.cart.findUnique.mockResolvedValue(null);
    expect(await service.getCart(USER)).toEqual({
      items: [],
      subtotal: 0,
      itemCount: 0,
      unavailableCount: 0,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.cart.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER } }),
    );
  });
});

describe('CartService.addItem', () => {
  it('thêm mới: tạo dòng, khóa giỏ trước khi đọc dòng', async () => {
    const { service, tx } = setup();
    await service.addItem(USER, 12, 2);
    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(tx.cartItem.create).toHaveBeenCalledWith({
      data: { cartId: CART_ID, variantId: 12, quantity: 2 },
    });
    expect(tx.cartItem.update).not.toHaveBeenCalled();
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.cartItem.findUnique.mock.invocationCallOrder[0],
    );
  });

  it('chưa có giỏ: tạo bằng createMany skipDuplicates rồi mới khóa', async () => {
    const { service, tx } = setup();
    tx.cart.findUnique.mockResolvedValue(null);
    await service.addItem(USER, 12, 1);
    expect(tx.cart.createMany).toHaveBeenCalledWith({
      data: [{ userId: USER }],
      skipDuplicates: true,
    });
    expect(tx.cart.createMany.mock.invocationCallOrder[0]).toBeLessThan(
      tx.$queryRaw.mock.invocationCallOrder[0],
    );
  });

  it('đã có giỏ: không tạo lại', async () => {
    const { service, tx } = setup();
    await service.addItem(USER, 12, 1);
    expect(tx.cart.createMany).not.toHaveBeenCalled();
  });

  it('cộng dồn vào dòng có sẵn', async () => {
    const { service, tx } = setup();
    tx.cartItem.findUnique.mockResolvedValue({ id: 5, quantity: 3 });
    await service.addItem(USER, 12, 4);
    expect(tx.cartItem.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { quantity: 7 },
    });
    expect(tx.cartItem.create).not.toHaveBeenCalled();
  });

  it('cộng dồn vượt 10: 409, không ghi', async () => {
    const { service, tx } = setup();
    tx.cartItem.findUnique.mockResolvedValue({ id: 5, quantity: 8 });
    await expect(service.addItem(USER, 12, 3)).rejects.toThrow(
      'Mỗi sản phẩm chỉ mua tối đa 10 trong một giỏ hàng (trong giỏ đã có 8)',
    );
    expect(tx.cartItem.update).not.toHaveBeenCalled();
  });

  it('đúng 10 thì được', async () => {
    const { service, tx } = setup();
    tx.cartItem.findUnique.mockResolvedValue({ id: 5, quantity: 8 });
    await service.addItem(USER, 12, 2);
    expect(tx.cartItem.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { quantity: 10 },
    });
  });

  it('vượt hàng còn (stock - reserved): 409', async () => {
    const { service, tx } = setup({ stock: 5, reserved: 3 });
    await expect(service.addItem(USER, 12, 3)).rejects.toThrow(
      'Chỉ còn 2 sản phẩm có thể mua',
    );
    expect(tx.cartItem.create).not.toHaveBeenCalled();
  });

  it('cộng dồn tính cả số đang có khi so với hàng còn', async () => {
    const { service, tx } = setup({ stock: 5 });
    tx.cartItem.findUnique.mockResolvedValue({ id: 5, quantity: 4 });
    await expect(service.addItem(USER, 12, 2)).rejects.toThrow(
      'Chỉ còn 5 sản phẩm có thể mua',
    );
  });

  it('hết hàng (available <= 0): 409', async () => {
    const { service } = setup({ stock: 4, reserved: 4 });
    await expect(service.addItem(USER, 12, 1)).rejects.toThrow(
      new ConflictException('Sản phẩm đã hết hàng'),
    );
  });

  it('biến thể không hoạt động: 409', async () => {
    const { service } = setup({ isActive: false });
    await expect(service.addItem(USER, 12, 1)).rejects.toThrow(
      'Sản phẩm này hiện không còn được bán',
    );
  });

  it('sản phẩm bị ẩn: 409', async () => {
    const { service } = setup({ product: { isActive: false } });
    await expect(service.addItem(USER, 12, 1)).rejects.toThrow(
      'Sản phẩm này hiện không còn được bán',
    );
  });

  it('biến thể không tồn tại: 404', async () => {
    const { service } = setup(null);
    await expect(service.addItem(USER, 999, 1)).rejects.toThrow(
      new NotFoundException('Không tìm thấy sản phẩm'),
    );
  });

  it('P2002 lọt qua khóa: 409 thông báo tiếng Việt, không 500', async () => {
    const { service, prisma } = setup();
    prisma.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: 'x',
      }),
    );
    await expect(service.addItem(USER, 12, 1)).rejects.toThrow(
      new ConflictException('Giỏ hàng đang được cập nhật, vui lòng thử lại'),
    );
  });

  it('P2034 (deadlock): chạy lại rồi thành công', async () => {
    const { service, prisma } = setup();
    const real = prisma.$transaction.getMockImplementation()!;
    prisma.$transaction
      .mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('deadlock', {
          code: 'P2034',
          clientVersion: 'x',
        }),
      )
      .mockImplementation(real);
    await service.addItem(USER, 12, 1);
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it('P2034 liên tục: sau 3 lần trả 409', async () => {
    const { service, prisma } = setup();
    prisma.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('deadlock', {
        code: 'P2034',
        clientVersion: 'x',
      }),
    );
    await expect(service.addItem(USER, 12, 1)).rejects.toThrow(
      ConflictException,
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
  });

  it('lỗi khác được ném lại nguyên vẹn', async () => {
    const { service, prisma } = setup();
    prisma.$transaction.mockRejectedValue(new Error('boom'));
    await expect(service.addItem(USER, 12, 1)).rejects.toThrow('boom');
  });
});

describe('CartService.updateItem', () => {
  it('đặt số lượng tuyệt đối', async () => {
    const { service, tx } = setup();
    tx.cartItem.findFirst.mockResolvedValue({
      id: 5,
      variantId: 12,
      quantity: 3,
    });
    await service.updateItem(USER, 5, 6);
    expect(tx.cartItem.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 5, cartId: CART_ID } }),
    );
    expect(tx.cartItem.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { quantity: 6 },
    });
  });

  it('dòng không thuộc giỏ của user (hoặc không có): 404, không đọc biến thể', async () => {
    const { service, tx } = setup();
    tx.cartItem.findFirst.mockResolvedValue(null);
    await expect(service.updateItem(USER, 5, 2)).rejects.toThrow(
      new NotFoundException('Không tìm thấy sản phẩm trong giỏ hàng'),
    );
    expect(tx.productVariant.findUnique).not.toHaveBeenCalled();
    expect(tx.cartItem.update).not.toHaveBeenCalled();
  });

  it('user chưa có giỏ: 404, không tạo giỏ', async () => {
    const { service, tx } = setup();
    tx.$queryRaw.mockResolvedValue([]);
    await expect(service.updateItem(USER, 5, 2)).rejects.toThrow(
      NotFoundException,
    );
    expect(tx.cart.createMany).not.toHaveBeenCalled();
  });

  it('vượt hàng còn: 409', async () => {
    const { service, tx } = setup({ stock: 4 });
    tx.cartItem.findFirst.mockResolvedValue({
      id: 5,
      variantId: 12,
      quantity: 1,
    });
    await expect(service.updateItem(USER, 5, 5)).rejects.toThrow(
      'Chỉ còn 4 sản phẩm có thể mua',
    );
  });

  it('biến thể đã ẩn hoặc hết hàng: không sửa được (409)', async () => {
    const hidden = setup({ isActive: false });
    hidden.tx.cartItem.findFirst.mockResolvedValue({
      id: 5,
      variantId: 12,
      quantity: 1,
    });
    await expect(hidden.service.updateItem(USER, 5, 2)).rejects.toThrow(
      ConflictException,
    );
    const out = setup({ stock: 1, reserved: 1 });
    out.tx.cartItem.findFirst.mockResolvedValue({
      id: 5,
      variantId: 12,
      quantity: 1,
    });
    await expect(out.service.updateItem(USER, 5, 1)).rejects.toThrow(
      'Sản phẩm đã hết hàng',
    );
  });
});

describe('CartService.removeItem / clear', () => {
  it('xóa dòng: điều kiện có cart.userId của chính user', async () => {
    const { service, prisma } = setup();
    await service.removeItem(USER, 5);
    expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({
      where: { id: 5, cart: { userId: USER } },
    });
  });

  it('dòng của người khác (count = 0): 404', async () => {
    const { service, prisma } = setup();
    prisma.cartItem.deleteMany.mockResolvedValue({ count: 0 });
    await expect(service.removeItem(USER, 5)).rejects.toThrow(
      new NotFoundException('Không tìm thấy sản phẩm trong giỏ hàng'),
    );
  });

  it('xóa sạch: chỉ theo userId, không xóa Cart', async () => {
    const { service, prisma } = setup();
    const cart = await service.clear(USER);
    expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({
      where: { cart: { userId: USER } },
    });
    expect(cart.items).toEqual([]);
  });
});
