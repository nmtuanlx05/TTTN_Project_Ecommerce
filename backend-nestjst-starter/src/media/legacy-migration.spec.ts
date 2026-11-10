/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import type { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.types';
import {
  LegacyImageMigration,
  parseLegacyUrl,
  type MigrationLogEntry,
} from './legacy-migration';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));

const U1 = '3f2b8c1e-5d7a-4c0e-9b1a-2e6f4a7d8c90';
const U2 = '11111111-2222-4333-8444-555555555555';
const png = Buffer.alloc(33);
Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png, 0);
png.write('IHDR', 12, 'ascii');
png.writeUInt32BE(10, 16);
png.writeUInt32BE(10, 20);

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
  ownsUrl() {
    return false;
  }
}

function setup(files: Record<string, Buffer> = {}) {
  const tx = {
    user: { updateMany: jest.fn() },
    productImage: { updateMany: jest.fn() },
    product: { updateMany: jest.fn() },
    orderItem: { updateMany: jest.fn() },
  };
  const prisma = {
    user: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    productImage: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    product: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    orderItem: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    mediaAsset: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
    },
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const storage = new FakeStorage();
  storage.upload.mockImplementation(
    (_b: Buffer, o: { folder: string; name: string }) =>
      Promise.resolve({
        publicId: `pre/${o.folder}/${o.name}`,
        secureUrl: `https://res.cloudinary.com/demo/${o.folder}/${o.name}.png`,
        width: 10,
        height: 10,
        format: 'png',
        bytes: 33,
      }),
  );
  prisma.mediaAsset.create.mockImplementation(
    ({ data }: { data: { secureUrl: string } }) =>
      Promise.resolve({ id: 100, secureUrl: data.secureUrl, status: 'ACTIVE' }),
  );
  const logs: MigrationLogEntry[] = [];
  const readFile = jest.fn((path: string) =>
    Promise.resolve(files[path] ?? null),
  );
  const migration = new LegacyImageMigration(
    prisma as unknown as PrismaService,
    storage,
    readFile,
    (e) => logs.push(e),
  );
  const opts = (over = {}) => ({
    apply: false,
    rollback: false,
    verbose: false,
    uploadsDir: '/up',
    ...over,
  });
  return { migration, prisma, tx, storage, logs, readFile, opts };
}

describe('parseLegacyUrl', () => {
  it.each([
    [`http://localhost:3000/uploads/products/${U1}.jpg`, 'products', 'jpg'],
    [
      `http://192.168.1.5:4000/uploads/avatars/${U1.toUpperCase()}.PNG`,
      'avatars',
      'png',
    ],
    [`https://api.shop.vn/uploads/products/${U1}.webp`, 'products', 'webp'],
    [`/uploads/products/${U1}.jpg`, 'products', 'jpg'],
  ])('%s khớp bất kể host/cổng', (url, folder, ext) => {
    expect(parseLegacyUrl(url)).toEqual({ folder, uuid: U1, ext });
  });

  it.each([
    'https://picsum.photos/seed/x/600/800',
    `http://localhost:3000/uploads/products/${U1}.gif`,
    `http://localhost:3000/uploads/other/${U1}.jpg`,
    'http://localhost:3000/uploads/products/../x.jpg',
  ])('%s không phải ảnh cũ', (url) => {
    expect(parseLegacyUrl(url)).toBeNull();
  });
});

describe('LegacyImageMigration (chuyển)', () => {
  const URL1 = `http://localhost:3000/uploads/products/${U1}.png`;

  it('--dry-run (mặc định): không tải lên, không ghi DB; ghi log would_migrate với số dòng ảnh hưởng', async () => {
    const { migration, prisma, storage, logs, opts } = setup({
      [`/up/products/${U1}.png`]: png,
    });
    prisma.productImage.findMany.mockResolvedValue([{ id: 1, url: URL1 }]);
    prisma.orderItem.findMany.mockResolvedValue([{ imageUrl: URL1 }]);

    const summary = await migration.run(opts());

    expect(storage.upload).not.toHaveBeenCalled();
    expect(prisma.mediaAsset.create).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(logs).toEqual([
      expect.objectContaining({
        action: 'would_migrate',
        file: `products/${U1}.png`,
        publicId: `pre/products/${U1}`,
        rows: { productImages: 1, avatars: 0, orderItems: 1, products: 0 },
      }),
    ]);
    expect(summary).toMatchObject({ dryRun: true, migrated: 1, errors: 0 });
  });

  it('--apply: tải lên, tạo media_assets (lưu sourceUrl), cập nhật assetId/url ở product_images, avatar, products, snapshot đơn', async () => {
    const { migration, prisma, tx, storage, logs, opts } = setup({
      [`/up/products/${U1}.png`]: png,
    });
    prisma.user.findMany.mockResolvedValue([{ id: 7, avatarUrl: URL1 }]);
    prisma.productImage.findMany.mockResolvedValue([
      { id: 1, url: URL1 },
      { id: 2, url: `http://10.0.0.5:3000/uploads/products/${U1}.png` }, // cùng file, host khác
    ]);
    prisma.product.findMany.mockResolvedValue([{ id: 3, imageUrl: URL1 }]);
    prisma.orderItem.findMany.mockResolvedValue([{ imageUrl: URL1 }]);

    const summary = await migration.run(opts({ apply: true }));

    expect(storage.upload).toHaveBeenCalledTimes(1);
    expect(prisma.mediaAsset.create.mock.calls[0][0].data).toMatchObject({
      publicId: `pre/products/${U1}`,
      kind: 'PRODUCT',
      sourceUrl: URL1,
    });
    const secureUrl = `https://res.cloudinary.com/demo/products/${U1}.png`;
    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [7] }, avatarAssetId: null },
      data: { avatarAssetId: 100, avatarUrl: secureUrl },
    });
    expect(tx.productImage.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [1, 2] }, assetId: null },
      data: { assetId: 100, url: secureUrl },
    });
    expect(tx.product.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [3] } },
      data: { imageUrl: secureUrl },
    });
    expect(tx.orderItem.updateMany).toHaveBeenCalledWith({
      where: { imagePublicId: null, imageUrl: { in: [URL1] } },
      data: { imageUrl: secureUrl, imagePublicId: `pre/products/${U1}` },
    });
    expect(logs[0]).toMatchObject({ action: 'migrated' });
    expect(summary).toMatchObject({ dryRun: false, migrated: 1, errors: 0 });
    expect(summary.rows).toEqual({
      productImages: 2,
      avatars: 1,
      orderItems: 1,
      products: 1,
    });
  });

  it('chạy lại: asset đã có (ACTIVE) → dùng lại, KHÔNG tải lên và không tạo trùng', async () => {
    const { migration, prisma, storage, logs, opts } = setup();
    prisma.productImage.findMany.mockResolvedValue([{ id: 1, url: URL1 }]);
    prisma.mediaAsset.findUnique.mockResolvedValue({
      id: 55,
      secureUrl: 'https://res.cloudinary.com/demo/x.png',
      status: 'ACTIVE',
    });

    const summary = await migration.run(opts({ apply: true }));

    expect(storage.upload).not.toHaveBeenCalled();
    expect(prisma.mediaAsset.create).not.toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(logs[0]).toMatchObject({ action: 'reused' });
    expect(summary).toMatchObject({ reused: 1, migrated: 0 });
  });

  it('asset đã bị xóa → bỏ qua, ghi lý do', async () => {
    const { migration, prisma, logs, opts } = setup();
    prisma.productImage.findMany.mockResolvedValue([{ id: 1, url: URL1 }]);
    prisma.mediaAsset.findUnique.mockResolvedValue({
      id: 5,
      secureUrl: 's',
      status: 'DELETED',
    });
    await migration.run(opts({ apply: true }));
    expect(logs[0]).toMatchObject({
      action: 'skipped',
      reason: 'asset_deleted',
    });
  });

  it('file cục bộ không tồn tại → bỏ qua với lý do local_file_missing, không lỗi', async () => {
    const { migration, prisma, logs, opts } = setup();
    prisma.productImage.findMany.mockResolvedValue([{ id: 1, url: URL1 }]);
    const summary = await migration.run(opts({ apply: true }));
    expect(logs[0]).toMatchObject({
      action: 'skipped',
      reason: 'local_file_missing',
    });
    expect(summary).toMatchObject({ skipped: 1, errors: 0 });
  });

  it('URL ngoài (picsum) bị bỏ qua và ghi rõ lý do; file không phải ảnh → invalid_image', async () => {
    const { migration, prisma, logs, opts } = setup({
      [`/up/products/${U2}.png`]: Buffer.from('khong phai anh'),
    });
    prisma.productImage.findMany.mockResolvedValue([
      { id: 1, url: 'https://picsum.photos/seed/a/600/800' },
      { id: 2, url: `http://localhost:3000/uploads/products/${U2}.png` },
    ]);
    await migration.run(opts({ apply: true }));
    expect(logs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'skipped',
          reason: 'external_or_unrecognized_url',
        }),
        expect.objectContaining({ action: 'skipped', reason: 'invalid_image' }),
      ]),
    );
  });

  it('lỗi tải lên một ảnh: ghi action error, các ảnh còn lại vẫn được xử lý, tổng kết đếm lỗi', async () => {
    const { migration, prisma, storage, logs, opts } = setup({
      [`/up/products/${U1}.png`]: png,
      [`/up/products/${U2}.png`]: png,
    });
    prisma.productImage.findMany.mockResolvedValue([
      { id: 1, url: URL1 },
      { id: 2, url: `http://localhost:3000/uploads/products/${U2}.png` },
    ]);
    storage.upload.mockRejectedValueOnce(new Error('cloud down'));

    const summary = await migration.run(opts({ apply: true }));

    expect(logs.map((l) => l.action).sort()).toEqual(['error', 'migrated']);
    expect(summary).toMatchObject({ errors: 1, migrated: 1 });
  });

  it('--limit chỉ xử lý N ảnh đầu', async () => {
    const { migration, prisma, storage, opts } = setup({
      [`/up/products/${U1}.png`]: png,
      [`/up/products/${U2}.png`]: png,
    });
    prisma.productImage.findMany.mockResolvedValue([
      { id: 1, url: URL1 },
      { id: 2, url: `http://localhost:3000/uploads/products/${U2}.png` },
    ]);
    await migration.run(opts({ apply: true, limit: 1 }));
    expect(storage.upload).toHaveBeenCalledTimes(1);
  });

  it('--verbose thêm danh sách URL vào log; mặc định thì không', async () => {
    const quiet = setup();
    quiet.prisma.productImage.findMany.mockResolvedValue([
      { id: 1, url: URL1 },
    ]);
    await quiet.migration.run(quiet.opts());
    expect(quiet.logs[0].urls).toBeUndefined();

    const loud = setup();
    loud.prisma.productImage.findMany.mockResolvedValue([{ id: 1, url: URL1 }]);
    await loud.migration.run(loud.opts({ verbose: true }));
    expect(loud.logs[0].urls).toEqual([URL1]);
  });

  it('--apply mà kho chưa cấu hình → từ chối ngay, không đụng gì', async () => {
    const { migration, storage, prisma, opts } = setup();
    storage.enabled = false;
    await expect(migration.run(opts({ apply: true }))).rejects.toThrow(
      /chưa được cấu hình/,
    );
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('không bao giờ xóa gì: kho không bị gọi delete', async () => {
    const { migration, prisma, storage, opts } = setup({
      [`/up/products/${U1}.png`]: png,
    });
    prisma.productImage.findMany.mockResolvedValue([{ id: 1, url: URL1 }]);
    await migration.run(opts({ apply: true }));
    expect(storage.delete).not.toHaveBeenCalled();
  });
});

describe('LegacyImageMigration (hoàn tác)', () => {
  const asset = {
    id: 100,
    publicId: `pre/products/${U1}`,
    secureUrl: `https://res.cloudinary.com/demo/products/${U1}.png`,
    sourceUrl: `http://localhost:3000/uploads/products/${U1}.png`,
  };

  it('--rollback mặc định chạy thử: chỉ đếm, không ghi', async () => {
    const { migration, prisma, logs, opts } = setup();
    prisma.mediaAsset.findMany.mockResolvedValue([asset]);
    prisma.productImage.count.mockResolvedValue(2);
    const summary = await migration.run(opts({ rollback: true }));
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(logs[0]).toMatchObject({
      action: 'would_roll_back',
      rows: { productImages: 2 },
    });
    expect(summary).toMatchObject({ mode: 'rollback', dryRun: true });
  });

  it('--rollback --apply: trả URL về sourceUrl, bỏ assetId/imagePublicId; KHÔNG xóa ảnh trên kho', async () => {
    const { migration, prisma, tx, storage, opts } = setup();
    prisma.mediaAsset.findMany.mockResolvedValue([asset]);

    await migration.run(opts({ rollback: true, apply: true }));

    expect(prisma.mediaAsset.findMany.mock.calls[0][0].where).toEqual({
      sourceUrl: { not: null },
      status: 'ACTIVE',
    });
    expect(tx.productImage.updateMany).toHaveBeenCalledWith({
      where: { assetId: 100 },
      data: { assetId: null, url: asset.sourceUrl },
    });
    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: { avatarAssetId: 100 },
      data: { avatarAssetId: null, avatarUrl: asset.sourceUrl },
    });
    expect(tx.orderItem.updateMany).toHaveBeenCalledWith({
      where: { imagePublicId: asset.publicId },
      data: { imagePublicId: null, imageUrl: asset.sourceUrl },
    });
    expect(tx.product.updateMany).toHaveBeenCalledWith({
      where: { imageUrl: asset.secureUrl },
      data: { imageUrl: asset.sourceUrl },
    });
    expect(storage.delete).not.toHaveBeenCalled();
  });
});
