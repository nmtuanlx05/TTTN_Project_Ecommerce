/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../prisma/prisma.service';
import { DisabledStorage } from '../storage/disabled.storage';
import { StorageService } from '../storage/storage.types';
import { MediaService } from './media.service';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));
jest.mock('@nestjs/config', () => ({ ConfigService: class {} }));

// PNG 10x10 tối thiểu (đủ chữ ký + IHDR)
const png = (w = 10, h = 10) => {
  const b = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
  b.write('IHDR', 12, 'ascii');
  b.writeUInt32BE(w, 16);
  b.writeUInt32BE(h, 20);
  return b;
};
const file = (buffer: Buffer) => ({ buffer }) as Express.Multer.File;

class FakeStorage extends StorageService {
  readonly driver = 'cloudinary' as const;
  enabled = true;
  upload = jest.fn();
  delete = jest.fn();
  isEnabled() {
    return this.enabled;
  }
  buildPublicId(folder: string, name: string) {
    return `pre/${folder}/${name}`;
  }
  ownsUrl(url: string) {
    return url.startsWith('https://res.cloudinary.com/demo/');
  }
}

function setup(env: Record<string, string> = {}) {
  const tx = {
    mediaAsset: { findMany: jest.fn(), updateMany: jest.fn() },
    productImage: { findMany: jest.fn() },
    user: { findMany: jest.fn() },
    orderItem: { findMany: jest.fn() },
    $queryRaw: jest.fn(),
  };
  const prisma = {
    mediaAsset: {
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    orderItem: { findMany: jest.fn() },
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const storage = new FakeStorage();
  const config = { get: (key: string) => env[key] } as unknown as ConfigService;
  const service = new MediaService(
    prisma as unknown as PrismaService,
    storage,
    config,
  );
  return { service, prisma, tx, storage };
}

describe('MediaService.uploadImage', () => {
  beforeEach(() => jest.spyOn(Logger.prototype, 'warn').mockImplementation());
  afterEach(() => jest.restoreAllMocks());

  it('thành công: đẩy lên kho rồi ghi media_assets với người tải, trả {assetId,url,publicId,...}', async () => {
    const { service, prisma, storage } = setup();
    prisma.mediaAsset.count.mockResolvedValue(0);
    storage.upload.mockResolvedValue({
      publicId: 'pre/products/u',
      secureUrl: 'https://res.cloudinary.com/demo/u.png',
      width: 10,
      height: 10,
      format: 'png',
      bytes: 33,
    });
    prisma.mediaAsset.create.mockResolvedValue({ id: 9 });

    const result = await service.uploadImage(file(png()), 'products', 2);

    expect(storage.upload.mock.calls[0][1]).toMatchObject({
      folder: 'products',
      type: 'png',
    });
    expect(prisma.mediaAsset.create.mock.calls[0][0].data).toMatchObject({
      publicId: 'pre/products/u',
      kind: 'PRODUCT',
      uploadedById: 2,
      width: 10,
    });
    expect(result).toEqual({
      assetId: 9,
      url: 'https://res.cloudinary.com/demo/u.png',
      publicId: 'pre/products/u',
      width: 10,
      height: 10,
      format: 'png',
      bytes: 33,
    });
  });

  it('ghi DB lỗi → xóa ngay ảnh vừa tải (best effort) và ném lỗi gốc', async () => {
    const { service, prisma, storage } = setup();
    prisma.mediaAsset.count.mockResolvedValue(0);
    storage.upload.mockResolvedValue({
      publicId: 'pre/products/u',
      secureUrl: 's',
      width: 1,
      height: 1,
      format: 'png',
      bytes: 1,
    });
    prisma.mediaAsset.create.mockRejectedValue(new Error('db down'));
    storage.delete.mockResolvedValue('deleted');

    await expect(
      service.uploadImage(file(png()), 'products', 2),
    ).rejects.toThrow('db down');
    expect(storage.delete).toHaveBeenCalledWith('pre/products/u');
  });

  it('xóa ảnh vừa tải cũng lỗi: vẫn ném lỗi DB gốc (không che)', async () => {
    const { service, prisma, storage } = setup();
    prisma.mediaAsset.count.mockResolvedValue(0);
    storage.upload.mockResolvedValue({
      publicId: 'p',
      secureUrl: 's',
      width: 1,
      height: 1,
      format: 'png',
      bytes: 1,
    });
    prisma.mediaAsset.create.mockRejectedValue(new Error('db down'));
    storage.delete.mockRejectedValue(new Error('cloud down'));
    await expect(
      service.uploadImage(file(png()), 'avatars', 2),
    ).rejects.toThrow('db down');
  });

  it('kho chưa cấu hình → 503 STORAGE_NOT_CONFIGURED, không đếm hạn mức, không tải', async () => {
    const { service, prisma, storage } = setup();
    storage.enabled = false;
    await expect(
      service.uploadImage(file(png()), 'products', 2),
    ).rejects.toMatchObject({
      status: 503,
      response: { code: 'STORAGE_NOT_CONFIGURED' },
    });
    expect(prisma.mediaAsset.count).not.toHaveBeenCalled();
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('DisabledStorage thật cũng báo đúng mã', async () => {
    const prisma = { mediaAsset: {} };
    const service = new MediaService(
      prisma as unknown as PrismaService,
      new DisabledStorage('x'),
      { get: () => undefined } as unknown as ConfigService,
    );
    await expect(
      service.uploadImage(file(png()), 'products', 1),
    ).rejects.toMatchObject({
      response: { code: 'STORAGE_NOT_CONFIGURED' },
    });
  });

  it('không có file → 400', async () => {
    const { service } = setup();
    await expect(
      service.uploadImage(undefined, 'products', 1),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('sai chữ ký byte → 415, không tải lên', async () => {
    const { service, prisma, storage } = setup();
    prisma.mediaAsset.count.mockResolvedValue(0);
    await expect(
      service.uploadImage(file(Buffer.from('khong phai anh')), 'products', 1),
    ).rejects.toMatchObject({ status: 415 });
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('ảnh hỏng (không đọc được kích thước) → 415; quá nhiều điểm ảnh → 413', async () => {
    const { service, prisma, storage } = setup();
    prisma.mediaAsset.count.mockResolvedValue(0);
    await expect(
      service.uploadImage(file(png(0, 0)), 'products', 1),
    ).rejects.toMatchObject({ status: 415 });
    await expect(
      service.uploadImage(file(png(6000, 6000)), 'products', 1),
    ).rejects.toMatchObject({ status: 413 });
    expect(storage.upload).not.toHaveBeenCalled();
  });

  describe('hạn mức theo người dùng', () => {
    it('đủ hạn mức (mặc định 100 sản phẩm / 10 avatar mỗi 24 giờ) → 429 UPLOAD_QUOTA_EXCEEDED', async () => {
      const { service, prisma, storage } = setup();
      prisma.mediaAsset.count.mockResolvedValue(10);
      await expect(
        service.uploadImage(file(png()), 'avatars', 3),
      ).rejects.toMatchObject({
        status: 429,
        response: { code: 'UPLOAD_QUOTA_EXCEEDED' },
      });
      const where = prisma.mediaAsset.count.mock.calls[0][0].where;
      expect(where).toMatchObject({ uploadedById: 3, kind: 'AVATAR' });
      expect(where.createdAt.gte).toBeInstanceOf(Date);
      expect(storage.upload).not.toHaveBeenCalled();
    });

    it('hạn mức cấu hình được bằng env: đủ thì chặn, còn dưới mức thì cho qua', async () => {
      const { service, prisma, storage } = setup({
        MEDIA_QUOTA_AVATARS_PER_DAY: '2',
      });
      prisma.mediaAsset.count.mockResolvedValue(2);
      await expect(
        service.uploadImage(file(png()), 'avatars', 3),
      ).rejects.toMatchObject({ status: 429 });

      prisma.mediaAsset.count.mockResolvedValue(1);
      storage.upload.mockResolvedValue({
        publicId: 'p',
        secureUrl: 's',
        width: 10,
        height: 10,
        format: 'png',
        bytes: 33,
      });
      prisma.mediaAsset.create.mockResolvedValue({ id: 1 });
      await expect(
        service.uploadImage(file(png()), 'avatars', 3),
      ).resolves.toMatchObject({ assetId: 1 });
    });
  });
});

describe('MediaService.resolveProductImages', () => {
  const asset = (id: number, secureUrl: string) => ({ id, secureUrl });

  it('assetId: lấy URL từ asset; assetId sai/đã xóa/khác loại → 400 MEDIA_ASSET_INVALID kèm vị trí', async () => {
    const { service, prisma } = setup();
    prisma.mediaAsset.findMany.mockResolvedValueOnce([
      asset(5, 'https://res.cloudinary.com/demo/a.jpg'),
    ]);
    await expect(
      service.resolveProductImages([{ assetId: 5 }]),
    ).resolves.toEqual([
      { url: 'https://res.cloudinary.com/demo/a.jpg', assetId: 5 },
    ]);
    // truy vấn chỉ nhận PRODUCT + ACTIVE
    expect(prisma.mediaAsset.findMany.mock.calls[0][0].where).toMatchObject({
      kind: 'PRODUCT',
      status: 'ACTIVE',
    });

    prisma.mediaAsset.findMany.mockResolvedValueOnce([]);
    await expect(
      service.resolveProductImages([{ assetId: 99 }]),
    ).rejects.toMatchObject({
      response: {
        code: 'MEDIA_ASSET_INVALID',
        errors: [{ field: 'images.0' }],
      },
    });
  });

  it('url trùng secureUrl asset đã đăng ký → dùng asset đó (tương thích frontend cũ)', async () => {
    const { service, prisma } = setup();
    const url =
      'https://res.cloudinary.com/demo/image/upload/v1/pre/products/u.jpg';
    prisma.mediaAsset.findMany.mockResolvedValueOnce([asset(7, url)]);
    await expect(service.resolveProductImages([{ url }])).resolves.toEqual([
      { url, assetId: 7 },
    ]);
  });

  it('URL thuộc kho của mình nhưng chưa đăng ký/đã xóa → 400 (không cho giả danh)', async () => {
    const { service, prisma } = setup();
    prisma.mediaAsset.findMany.mockResolvedValue([]);
    await expect(
      service.resolveProductImages([
        { url: 'https://res.cloudinary.com/demo/image/upload/v1/hack.jpg' },
      ]),
    ).rejects.toMatchObject({ response: { code: 'MEDIA_ASSET_INVALID' } });
  });

  it('đường dẫn ảnh cũ trên đĩa (http://localhost/uploads/...) không còn được nhận: bị từ chối như URL http ngoài', async () => {
    const { service, prisma } = setup();
    prisma.mediaAsset.findMany.mockResolvedValue([]);
    await expect(
      service.resolveProductImages([
        {
          url: 'http://localhost:3000/uploads/products/3f2b8c1e-5d7a-4c0e-9b1a-2e6f4a7d8c90.jpg',
        },
      ]),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('URL ngoài: https được nhận (assetId null); http bị từ chối', async () => {
    const { service, prisma } = setup();
    prisma.mediaAsset.findMany.mockResolvedValue([]);
    await expect(
      service.resolveProductImages([{ url: 'https://picsum.photos/a.jpg' }]),
    ).resolves.toEqual([{ url: 'https://picsum.photos/a.jpg', assetId: null }]);
    await expect(
      service.resolveProductImages([{ url: 'http://evil.example/a.jpg' }]),
    ).rejects.toMatchObject({
      status: 400,
    });
  });

  it('ALLOW_EXTERNAL_IMAGE_URLS=false → từ chối URL ngoài (EXTERNAL_IMAGE_NOT_ALLOWED) nhưng ảnh đã đăng ký vẫn được', async () => {
    const { service, prisma } = setup({ ALLOW_EXTERNAL_IMAGE_URLS: 'false' });
    prisma.mediaAsset.findMany.mockResolvedValue([]);
    await expect(
      service.resolveProductImages([{ url: 'https://picsum.photos/a.jpg' }]),
    ).rejects.toMatchObject({
      response: { code: 'EXTERNAL_IMAGE_NOT_ALLOWED' },
    });
    prisma.mediaAsset.findMany.mockResolvedValueOnce([
      asset(1, 'https://res.cloudinary.com/demo/a.jpg'),
    ]);
    await expect(
      service.resolveProductImages([{ assetId: 1 }]),
    ).resolves.toHaveLength(1);
  });
});

describe('MediaService.resolveAvatar', () => {
  it('chỉ nhận ảnh AVATAR, ACTIVE, do chính người dùng tải; sai → 400', async () => {
    const { service, prisma } = setup();
    prisma.mediaAsset.findFirst.mockResolvedValueOnce({
      id: 4,
      secureUrl: 'u',
    });
    await expect(service.resolveAvatar(7, { assetId: 4 })).resolves.toEqual({
      id: 4,
      secureUrl: 'u',
    });
    expect(prisma.mediaAsset.findFirst.mock.calls[0][0].where).toEqual({
      id: 4,
      kind: 'AVATAR',
      status: 'ACTIVE',
      uploadedById: 7,
    });

    prisma.mediaAsset.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.resolveAvatar(7, { url: 'https://x/y.jpg' }),
    ).rejects.toMatchObject({
      response: {
        code: 'MEDIA_ASSET_INVALID',
        errors: [{ field: 'avatarUrl' }],
      },
    });
    expect(prisma.mediaAsset.findFirst.mock.calls[1][0].where).toMatchObject({
      secureUrl: 'https://x/y.jpg',
      uploadedById: 7,
    });
  });
});

describe('MediaService.lockAssets / markUnreferenced', () => {
  it('lockAssets khóa theo id tăng dần, bỏ trùng; danh sách rỗng thì không truy vấn', async () => {
    const { service, tx } = setup();
    tx.$queryRaw.mockResolvedValue([
      { id: 2, status: 'ACTIVE', kind: 'PRODUCT', uploadedById: 1 },
    ]);
    const locked = await service.lockAssets(tx as never, [5, 2, 5]);
    expect(locked.get(2)?.status).toBe('ACTIVE');
    const sql = tx.$queryRaw.mock.calls[0][0];
    expect(sql.values).toEqual([2, 5]);
    expect(sql.sql).toContain('FOR UPDATE');
    tx.$queryRaw.mockClear();
    await service.lockAssets(tx as never, []);
    expect(tx.$queryRaw).not.toHaveBeenCalled();
  });

  it('assertAttachable: thiếu hoặc không ACTIVE → 400', () => {
    const { service } = setup();
    const locked = new Map([
      [1, { id: 1, status: 'ACTIVE', kind: 'PRODUCT', uploadedById: 1 }],
      [
        2,
        { id: 2, status: 'PENDING_DELETE', kind: 'PRODUCT', uploadedById: 1 },
      ],
    ]);
    expect(() => service.assertAttachable(locked, [1])).not.toThrow();
    expect(() => service.assertAttachable(locked, [2])).toThrow();
    expect(() => service.assertAttachable(locked, [3])).toThrow();
  });

  it('chỉ đánh dấu PENDING_DELETE asset KHÔNG còn bị product_images / users / order_items tham chiếu', async () => {
    const { service, tx } = setup();
    tx.mediaAsset.findMany.mockResolvedValue([
      { id: 1, publicId: 'p/1' }, // còn ảnh sản phẩm dùng
      { id: 2, publicId: 'p/2' }, // còn user dùng
      { id: 3, publicId: 'p/3' }, // còn đơn hàng cũ chụp lại
      { id: 4, publicId: 'p/4' }, // không ai dùng
    ]);
    tx.productImage.findMany.mockResolvedValue([{ assetId: 1 }]);
    tx.user.findMany.mockResolvedValue([{ avatarAssetId: 2 }]);
    tx.orderItem.findMany.mockResolvedValue([{ imagePublicId: 'p/3' }]);

    const freed = await service.markUnreferenced(tx as never, [1, 2, 3, 4, 4]);

    expect(freed).toEqual([4]);
    expect(tx.mediaAsset.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [4] }, status: 'ACTIVE' },
      data: { status: 'PENDING_DELETE' },
    });
  });

  it('không ứng viên hoặc tất cả còn dùng → không updateMany', async () => {
    const { service, tx } = setup();
    expect(await service.markUnreferenced(tx as never, [])).toEqual([]);
    tx.mediaAsset.findMany.mockResolvedValue([{ id: 1, publicId: 'p/1' }]);
    tx.productImage.findMany.mockResolvedValue([{ assetId: 1 }]);
    tx.user.findMany.mockResolvedValue([]);
    tx.orderItem.findMany.mockResolvedValue([]);
    expect(await service.markUnreferenced(tx as never, [1])).toEqual([]);
    expect(tx.mediaAsset.updateMany).not.toHaveBeenCalled();
  });
});

describe('MediaService.purge', () => {
  beforeEach(() => jest.spyOn(Logger.prototype, 'warn').mockImplementation());
  afterEach(() => jest.restoreAllMocks());

  it('xóa phía kho rồi đánh dấu DELETED; not_found cũng coi là xong', async () => {
    const { service, prisma, storage } = setup();
    prisma.mediaAsset.findMany.mockResolvedValue([
      { id: 1, publicId: 'a' },
      { id: 2, publicId: 'b' },
    ]);
    storage.delete
      .mockResolvedValueOnce('deleted')
      .mockResolvedValueOnce('not_found');
    prisma.mediaAsset.updateMany.mockResolvedValue({ count: 1 });

    await expect(service.purge([1, 2])).resolves.toEqual({
      deleted: 2,
      failed: 0,
    });
    expect(prisma.mediaAsset.updateMany.mock.calls[0][0]).toMatchObject({
      where: { id: 1, status: 'PENDING_DELETE' },
      data: { status: 'DELETED', lastError: null },
    });
  });

  it('lỗi xóa: tăng deleteAttempts, ghi lastError (cắt 500), KHÔNG ném lỗi, vẫn xử lý asset sau', async () => {
    const { service, prisma, storage } = setup();
    prisma.mediaAsset.findMany.mockResolvedValue([
      { id: 1, publicId: 'a' },
      { id: 2, publicId: 'b' },
    ]);
    storage.delete
      .mockRejectedValueOnce(new Error('x'.repeat(900)))
      .mockResolvedValueOnce('deleted');
    prisma.mediaAsset.updateMany.mockResolvedValue({ count: 1 });

    await expect(service.purge([1, 2])).resolves.toEqual({
      deleted: 1,
      failed: 1,
    });
    const update = prisma.mediaAsset.update.mock.calls[0][0];
    expect(update.where).toEqual({ id: 1 });
    expect(update.data.deleteAttempts).toEqual({ increment: 1 });
    expect(update.data.lastError).toHaveLength(500);
  });

  it('chính DB lỗi cũng không ném (không làm hỏng request gọi)', async () => {
    const { service, prisma } = setup();
    prisma.mediaAsset.findMany.mockRejectedValue(new Error('db down'));
    await expect(service.purge([1])).resolves.toEqual({
      deleted: 0,
      failed: 0,
    });
  });

  it('danh sách rỗng → không truy vấn', async () => {
    const { service, prisma } = setup();
    await service.purge([]);
    expect(prisma.mediaAsset.findMany).not.toHaveBeenCalled();
  });
});

describe('MediaService.cleanup', () => {
  beforeEach(() => jest.spyOn(Logger.prototype, 'warn').mockImplementation());
  afterEach(() => jest.restoreAllMocks());
  const NOW = new Date('2026-11-10T12:00:00Z');

  function arrange() {
    const ctx = setup();
    ctx.prisma.mediaAsset.count.mockResolvedValue(2); // gaveUp
    ctx.prisma.mediaAsset.findMany
      .mockResolvedValueOnce([{ id: 10 }]) // PENDING_DELETE cần thử lại
      .mockResolvedValueOnce([{ id: 20, publicId: 'o/20' }]) // ứng viên mồ côi
      .mockResolvedValue([
        { id: 10, publicId: 'o/10' },
        { id: 20, publicId: 'o/20' },
      ]); // purge
    return ctx;
  }

  it('mồ côi: ACTIVE, quá 24 giờ, không ai tham chiếu, không phải ảnh nhập từ script; thử lại PENDING_DELETE', async () => {
    const { service, prisma, tx, storage } = arrange();
    tx.$queryRaw.mockResolvedValue([]);
    tx.mediaAsset.findMany.mockResolvedValue([{ id: 20, publicId: 'o/20' }]);
    tx.productImage.findMany.mockResolvedValue([]);
    tx.user.findMany.mockResolvedValue([]);
    tx.orderItem.findMany.mockResolvedValue([]);
    storage.delete.mockResolvedValue('deleted');
    prisma.mediaAsset.updateMany.mockResolvedValue({ count: 1 });

    const summary = await service.cleanup({ now: NOW });

    const orphanWhere = prisma.mediaAsset.findMany.mock.calls[1][0].where;
    expect(orphanWhere).toMatchObject({
      status: 'ACTIVE',
      productImages: { none: {} },
      avatarUsers: { none: {} },
    });
    expect(orphanWhere.createdAt.lt).toEqual(new Date('2026-11-09T12:00:00Z'));
    expect(tx.mediaAsset.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [20] }, status: 'ACTIVE' },
      data: { status: 'PENDING_DELETE' },
    });
    expect(summary).toEqual({
      dryRun: false,
      deleted: 2,
      failed: 0,
      gaveUp: 2,
      orphansMarked: 1,
    });
  });

  it('dry-run: chỉ đếm, không đánh dấu, không xóa, không gọi kho', async () => {
    const { service, prisma, tx, storage } = arrange();
    prisma.orderItem.findMany.mockResolvedValue([{ imagePublicId: 'o/20' }]); // ứng viên 20 còn trong đơn cũ

    const summary = await service.cleanup({ dryRun: true, now: NOW });

    expect(summary).toEqual({
      dryRun: true,
      deleted: 1,
      failed: 0,
      gaveUp: 2,
      orphansMarked: 0,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.mediaAsset.updateMany).not.toHaveBeenCalled();
    expect(storage.delete).not.toHaveBeenCalled();
    expect(prisma.mediaAsset.updateMany).not.toHaveBeenCalled();
  });

  it('MEDIA_ORPHAN_MIN_AGE_HOURS đổi được ngưỡng tuổi', async () => {
    const { service, prisma } = setup({ MEDIA_ORPHAN_MIN_AGE_HOURS: '48' });
    prisma.mediaAsset.count.mockResolvedValue(0);
    prisma.mediaAsset.findMany.mockResolvedValue([]);
    await service.cleanup({ now: NOW, dryRun: true });
    expect(
      prisma.mediaAsset.findMany.mock.calls[1][0].where.createdAt.lt,
    ).toEqual(new Date('2026-11-08T12:00:00Z'));
  });
});
