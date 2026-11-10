import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { MediaService } from '../media/media.service';
import type { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

// PrismaService thật kéo theo client Prisma/adapter (không cần cho unit test này)
jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));
// @nestjs/config chỉ có bản ESM nên Jest không nạp được (MediaService nhập ConfigService)
jest.mock('@nestjs/config', () => ({ ConfigService: class {} }));

const NEW_ASSET = { id: 5, secureUrl: 'https://res.cloudinary.com/x/new.jpg' };

describe('UsersService.updateAvatar', () => {
  const tx = { user: { update: jest.fn() } };
  const prisma = {
    user: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  const media = {
    resolveAvatar: jest.fn(),
    lockAssets: jest.fn(),
    assertAttachable: jest.fn(),
    markUnreferenced: jest.fn(),
    purge: jest.fn(),
  };
  let service: UsersService;

  // findUnique được gọi 2 lần: avatarAssetId hiện tại (select có avatarAssetId) rồi findOne trả user
  const currentAvatar = (avatarAssetId: number | null) =>
    prisma.user.findUnique.mockImplementation(
      (args: { select: Record<string, unknown> }) =>
        Promise.resolve(
          'email' in args.select
            ? { id: 7, avatarUrl: null }
            : { avatarAssetId },
        ),
    );

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((fn: (t: typeof tx) => unknown) =>
      fn(tx),
    );
    tx.user.update.mockResolvedValue({ id: 7 });
    media.resolveAvatar.mockResolvedValue(NEW_ASSET);
    media.lockAssets.mockResolvedValue(new Map());
    media.markUnreferenced.mockResolvedValue([]);
    media.purge.mockResolvedValue({ deleted: 0, failed: 0 });
    service = new UsersService(
      prisma as unknown as PrismaService,
      media as unknown as MediaService,
    );
  });

  it('đổi bằng assetId: ghi avatarUrl + avatarAssetId trong transaction, đánh dấu ảnh cũ rồi xóa SAU commit', async () => {
    currentAvatar(3);
    media.markUnreferenced.mockResolvedValue([3]);

    await service.updateAvatar(7, { assetId: 5 });

    expect(media.resolveAvatar).toHaveBeenCalledWith(7, {
      assetId: 5,
      url: undefined,
    });
    expect(media.lockAssets).toHaveBeenCalledWith(tx, [5, 3]);
    expect(tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { avatarUrl: NEW_ASSET.secureUrl, avatarAssetId: 5 },
      }),
    );
    expect(media.markUnreferenced).toHaveBeenCalledWith(tx, [3]);
    // purge chạy sau transaction
    expect(media.purge).toHaveBeenCalledWith([3]);
    expect(media.purge.mock.invocationCallOrder[0]).toBeGreaterThan(
      prisma.$transaction.mock.invocationCallOrder[0],
    );
  });

  it('đổi bằng avatarUrl (URL đã đăng ký) cũng được', async () => {
    currentAvatar(null);
    await service.updateAvatar(7, { avatarUrl: NEW_ASSET.secureUrl });
    expect(media.resolveAvatar).toHaveBeenCalledWith(7, {
      assetId: undefined,
      url: NEW_ASSET.secureUrl,
    });
    expect(media.markUnreferenced).not.toHaveBeenCalled();
  });

  it('avatarUrl: null → xóa ảnh, không phân giải asset, ảnh cũ được đánh dấu', async () => {
    currentAvatar(3);
    media.markUnreferenced.mockResolvedValue([3]);

    await service.updateAvatar(7, { avatarUrl: null });

    expect(media.resolveAvatar).not.toHaveBeenCalled();
    expect(tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { avatarUrl: null, avatarAssetId: null },
      }),
    );
    expect(media.purge).toHaveBeenCalledWith([3]);
  });

  it('chọn lại đúng ảnh đang dùng: không đánh dấu xóa ảnh nào', async () => {
    currentAvatar(5);
    await service.updateAvatar(7, { assetId: 5 });
    expect(media.markUnreferenced).not.toHaveBeenCalled();
  });

  it.each([
    ['không gửi trường nào', {}],
    ['gửi cả hai', { assetId: 5, avatarUrl: 'https://x/y.jpg' }],
    ['assetId null', { assetId: null }],
  ])('%s → 400, không đụng DB', async (_name, dto) => {
    await expect(service.updateAvatar(7, dto as never)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('asset không hợp lệ/không phải của user: lỗi từ resolveAvatar được ném ra, không ghi gì', async () => {
    currentAvatar(3);
    media.resolveAvatar.mockRejectedValue(new BadRequestException('sai'));
    await expect(service.updateAvatar(7, { assetId: 99 })).rejects.toThrow(
      'sai',
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(media.purge).not.toHaveBeenCalled();
  });

  it('không tìm thấy user → 404', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.updateAvatar(7, { assetId: 5 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('ghi DB lỗi: lỗi được ném ra và KHÔNG xóa ảnh nào phía kho', async () => {
    currentAvatar(3);
    tx.user.update.mockRejectedValue(new Error('db down'));
    await expect(service.updateAvatar(7, { assetId: 5 })).rejects.toThrow(
      'db down',
    );
    expect(media.purge).not.toHaveBeenCalled();
  });
});

describe('UsersService.update / updateStatus: chống tự khóa', () => {
  const ME = 1;
  const OTHER = 2;
  const prisma = {
    user: { findUnique: jest.fn(), update: jest.fn() },
  };
  let service: UsersService;

  beforeEach(() => {
    jest.resetAllMocks();
    // Cả hai user đều là ADMIN đang hoạt động
    prisma.user.findUnique.mockImplementation(
      ({ where }: { where: { id: number } }) =>
        Promise.resolve({ id: where.id, role: 'ADMIN', isActive: true }),
    );
    prisma.user.update.mockImplementation(
      ({ where }: { where: { id: number } }) =>
        Promise.resolve({ id: where.id }),
    );
    service = new UsersService(
      prisma as unknown as PrismaService,
      {} as unknown as MediaService,
    );
  });

  describe('update', () => {
    it('ADMIN tự hạ role của mình: 403, không cập nhật', async () => {
      await expect(service.update(ME, { role: 'STAFF' }, ME)).rejects.toThrow(
        new ForbiddenException(
          'Bạn không thể tự thay đổi vai trò của chính mình',
        ),
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('ADMIN hạ role của ADMIN khác: được phép', async () => {
      await service.update(OTHER, { role: 'STAFF' }, ME);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: OTHER },
          data: { name: undefined, phone: undefined, role: 'STAFF' },
        }),
      );
    });

    it('ADMIN sửa name/phone của chính mình: được phép', async () => {
      await service.update(ME, { name: 'Tên mới', phone: '0912345678' }, ME);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: ME },
          data: { name: 'Tên mới', phone: '0912345678', role: undefined },
        }),
      );
    });

    it('ADMIN gửi lại đúng role ADMIN của mình: được phép (không đổi gì)', async () => {
      await service.update(ME, { name: 'A', role: 'ADMIN' }, ME);

      expect(prisma.user.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateStatus', () => {
    it('ADMIN tự khóa chính mình: 403, không cập nhật', async () => {
      await expect(
        service.updateStatus(ME, { isActive: false }, ME),
      ).rejects.toThrow(
        new ForbiddenException(
          'Bạn không thể tự khóa tài khoản của chính mình',
        ),
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('ADMIN khóa ADMIN khác: được phép', async () => {
      await service.updateStatus(OTHER, { isActive: false }, ME);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: OTHER },
          data: { isActive: false },
        }),
      );
    });

    it('ADMIN gửi isActive=true cho chính mình: được phép', async () => {
      await service.updateStatus(ME, { isActive: true }, ME);

      expect(prisma.user.update).toHaveBeenCalledTimes(1);
    });
  });
});
