import type { PrismaService } from '../prisma/prisma.service';
import type { StorageService } from '../storage/storage.types';
import { detectImageType } from '../uploads/image-signature';
import { isWithinPixelLimit, readImageSize } from '../uploads/image-info';
import { UPLOAD_KINDS, type UploadKind } from '../uploads/upload.config';
import type { MediaKind } from './media.types';

// Chuyển ảnh cũ trên đĩa (uploads/) sang kho lưu trữ. Logic nằm ở đây (có unit test); scripts/ chỉ là lớp vỏ dòng lệnh.
// Nguyên tắc: --dry-run là mặc định (không ghi DB, không tải lên), chạy lại an toàn, KHÔNG BAO GIỜ xóa file cũ.

export interface LegacyMigrationOptions {
  apply: boolean;
  rollback: boolean;
  limit?: number;
  verbose: boolean;
  // Thư mục gốc chứa products/ và avatars/ (UPLOAD_DIR đã phân giải)
  uploadsDir: string;
}

export type MigrationAction =
  | 'migrated'
  | 'would_migrate'
  | 'reused'
  | 'skipped'
  | 'rolled_back'
  | 'would_roll_back'
  | 'error';

export interface MigrationRows {
  productImages: number;
  avatars: number;
  orderItems: number;
  products: number;
}

export interface MigrationLogEntry {
  action: MigrationAction;
  file?: string;
  reason?: string;
  publicId?: string;
  rows?: MigrationRows;
  urls?: string[];
  error?: string;
}

export interface MigrationSummary {
  dryRun: boolean;
  mode: 'migrate' | 'rollback';
  migrated: number;
  reused: number;
  skipped: number;
  errors: number;
  rows: MigrationRows;
}

export type ReadLocalFile = (path: string) => Promise<Buffer | null>;

// Khớp theo đoạn /uploads/<thư mục>/<uuid>.<đuôi> BẤT KỂ host hay cổng (URL cũ có thể từ localhost:3000, IP LAN, tên miền...)
const LEGACY_PATH =
  /\/uploads\/(products|avatars)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(jpg|png|webp)$/i;

export interface LegacyFile {
  folder: UploadKind;
  uuid: string;
  ext: string;
}

export function parseLegacyUrl(url: string): LegacyFile | null {
  let path = url;
  try {
    path = new URL(url).pathname;
  } catch {
    // đường dẫn tương đối kiểu "/uploads/..." vẫn khớp bằng regex
  }
  const match = LEGACY_PATH.exec(path);
  return match
    ? {
        folder: match[1].toLowerCase() as UploadKind,
        uuid: match[2].toLowerCase(),
        ext: match[3].toLowerCase(),
      }
    : null;
}

interface FileGroup extends LegacyFile {
  key: string;
  sourceUrl: string;
  userIds: number[];
  imageIds: number[];
  productIds: number[];
  snapshotUrls: string[];
  urls: Set<string>;
}

const emptyRows = (): MigrationRows => ({
  productImages: 0,
  avatars: 0,
  orderItems: 0,
  products: 0,
});

const KIND_OF_FOLDER: Record<UploadKind, MediaKind> = {
  products: 'PRODUCT',
  avatars: 'AVATAR',
};

export class LegacyImageMigration {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly readLocalFile: ReadLocalFile,
    private readonly log: (entry: MigrationLogEntry) => void,
  ) {}

  async run(options: LegacyMigrationOptions): Promise<MigrationSummary> {
    const summary: MigrationSummary = {
      dryRun: !options.apply,
      mode: options.rollback ? 'rollback' : 'migrate',
      migrated: 0,
      reused: 0,
      skipped: 0,
      errors: 0,
      rows: emptyRows(),
    };
    if (options.apply && !options.rollback && !this.storage.isEnabled()) {
      throw new Error(
        'Kho lưu trữ chưa được cấu hình (STORAGE_DRIVER / CLOUDINARY_*), không thể chạy --apply',
      );
    }
    if (options.rollback) {
      await this.rollback(options, summary);
    } else {
      await this.migrate(options, summary);
    }
    return summary;
  }

  // ===== Chuyển =====

  private async collect(
    summary: MigrationSummary,
    options: LegacyMigrationOptions,
  ) {
    const [users, images, products, snapshots] = await Promise.all([
      this.prisma.user.findMany({
        where: { avatarUrl: { not: null }, avatarAssetId: null },
        select: { id: true, avatarUrl: true },
        orderBy: { id: 'asc' },
      }),
      this.prisma.productImage.findMany({
        where: { assetId: null },
        select: { id: true, url: true },
        orderBy: { id: 'asc' },
      }),
      this.prisma.product.findMany({
        where: { imageUrl: { not: null } },
        select: { id: true, imageUrl: true },
        orderBy: { id: 'asc' },
      }),
      this.prisma.orderItem.findMany({
        where: { imagePublicId: null, imageUrl: { not: null } },
        select: { imageUrl: true },
        distinct: ['imageUrl'],
      }),
    ]);

    const groups = new Map<string, FileGroup>();
    const unrecognized = new Set<string>();
    const add = (url: string | null, attach: (group: FileGroup) => void) => {
      if (!url) return;
      const file = parseLegacyUrl(url);
      if (!file) {
        unrecognized.add(url);
        return;
      }
      const key = `${file.folder}/${file.uuid}.${file.ext}`;
      let group = groups.get(key);
      if (!group) {
        group = {
          ...file,
          key,
          sourceUrl: url,
          userIds: [],
          imageIds: [],
          productIds: [],
          snapshotUrls: [],
          urls: new Set(),
        };
        groups.set(key, group);
      }
      group.urls.add(url);
      attach(group);
    };
    for (const u of users) add(u.avatarUrl, (g) => g.userIds.push(u.id));
    for (const i of images) add(i.url, (g) => g.imageIds.push(i.id));
    for (const p of products) add(p.imageUrl, (g) => g.productIds.push(p.id));
    for (const s of snapshots)
      add(s.imageUrl, (g) => g.snapshotUrls.push(s.imageUrl!));

    // URL không phải ảnh do backend này từng phục vụ (ảnh ngoài như picsum...): bỏ qua, ghi rõ lý do
    for (const url of unrecognized) {
      summary.skipped += 1;
      this.log({
        action: 'skipped',
        reason: 'external_or_unrecognized_url',
        ...(options.verbose && { urls: [url] }),
        file: url,
      });
    }
    return [...groups.values()];
  }

  private async migrate(
    options: LegacyMigrationOptions,
    summary: MigrationSummary,
  ) {
    let groups = await this.collect(summary, options);
    if (options.limit !== undefined) groups = groups.slice(0, options.limit);

    for (const group of groups) {
      try {
        await this.migrateOne(group, options, summary);
      } catch (error) {
        summary.errors += 1;
        this.log({
          action: 'error',
          file: group.key,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  private async migrateOne(
    group: FileGroup,
    options: LegacyMigrationOptions,
    summary: MigrationSummary,
  ) {
    const publicId = this.storage.buildPublicId(group.folder, group.uuid);
    const rows: MigrationRows = {
      productImages: group.imageIds.length,
      avatars: group.userIds.length,
      orderItems: group.snapshotUrls.length,
      products: group.productIds.length,
    };
    const base = {
      file: group.key,
      publicId,
      rows,
      ...(options.verbose && { urls: [...group.urls] }),
    };

    // Đã có asset (chạy trước đó bị ngắt giữa chừng, hoặc ảnh đã được đăng ký): dùng lại, không tải lên lần nữa
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { publicId },
      select: { id: true, secureUrl: true, status: true },
    });
    if (asset && asset.status !== 'ACTIVE') {
      summary.skipped += 1;
      this.log({
        action: 'skipped',
        reason: `asset_${asset.status.toLowerCase()}`,
        ...base,
      });
      return;
    }

    let stored: Awaited<ReturnType<StorageService['upload']>> | null = null;
    if (!asset) {
      const buffer = await this.readLocalFile(
        `${options.uploadsDir}/${group.folder}/${group.uuid}.${group.ext}`,
      );
      if (!buffer) {
        summary.skipped += 1;
        this.log({ action: 'skipped', reason: 'local_file_missing', ...base });
        return;
      }
      const type = detectImageType(buffer);
      const size = type ? readImageSize(buffer, type) : null;
      if (!type || !size || !isWithinPixelLimit(size)) {
        summary.skipped += 1;
        this.log({ action: 'skipped', reason: 'invalid_image', ...base });
        return;
      }
      if (buffer.length > UPLOAD_KINDS[group.folder].maxBytes) {
        summary.skipped += 1;
        this.log({ action: 'skipped', reason: 'file_too_large', ...base });
        return;
      }
      if (!options.apply) {
        summary.migrated += 1;
        this.addRows(summary.rows, rows);
        this.log({ action: 'would_migrate', ...base });
        return;
      }
      stored = await this.storage.upload(buffer, {
        folder: group.folder,
        name: group.uuid,
        type,
      });
    } else if (!options.apply) {
      summary.reused += 1;
      this.addRows(summary.rows, rows);
      this.log({ action: 'would_migrate', reason: 'asset_exists', ...base });
      return;
    }

    const created =
      asset ??
      (await this.prisma.mediaAsset.create({
        data: {
          publicId: stored!.publicId,
          secureUrl: stored!.secureUrl,
          width: stored!.width,
          height: stored!.height,
          format: stored!.format,
          bytes: stored!.bytes,
          kind: KIND_OF_FOLDER[group.folder],
          sourceUrl: group.sourceUrl.slice(0, 500),
        },
        select: { id: true, secureUrl: true, status: true },
      }));

    await this.prisma.$transaction(async (tx) => {
      if (group.userIds.length) {
        await tx.user.updateMany({
          where: { id: { in: group.userIds }, avatarAssetId: null },
          data: { avatarAssetId: created.id, avatarUrl: created.secureUrl },
        });
      }
      if (group.imageIds.length) {
        await tx.productImage.updateMany({
          where: { id: { in: group.imageIds }, assetId: null },
          data: { assetId: created.id, url: created.secureUrl },
        });
      }
      if (group.productIds.length) {
        await tx.product.updateMany({
          where: { id: { in: group.productIds } },
          data: { imageUrl: created.secureUrl },
        });
      }
      if (group.snapshotUrls.length) {
        await tx.orderItem.updateMany({
          where: { imagePublicId: null, imageUrl: { in: group.snapshotUrls } },
          data: { imageUrl: created.secureUrl, imagePublicId: publicId },
        });
      }
    });

    summary.migrated += stored ? 1 : 0;
    summary.reused += stored ? 0 : 1;
    this.addRows(summary.rows, rows);
    this.log({ action: stored ? 'migrated' : 'reused', ...base });
  }

  // ===== Hoàn tác =====

  // Trả các cột URL về sourceUrl cho mọi asset nhập từ script (sourceUrl có giá trị) và bỏ tham chiếu assetId/imagePublicId.
  // KHÔNG xóa ảnh trên kho lưu trữ và không xóa dòng media_assets (chúng được giữ để chạy lại script chuyển ảnh).
  // Lưu ý: các URL cũ khác host của cùng một file được gộp về sourceUrl (URL đầu tiên script thấy).
  private async rollback(
    options: LegacyMigrationOptions,
    summary: MigrationSummary,
  ) {
    let assets = await this.prisma.mediaAsset.findMany({
      where: { sourceUrl: { not: null }, status: 'ACTIVE' },
      select: { id: true, publicId: true, secureUrl: true, sourceUrl: true },
      orderBy: { id: 'asc' },
    });
    if (options.limit !== undefined) assets = assets.slice(0, options.limit);

    for (const asset of assets) {
      const sourceUrl = asset.sourceUrl!;
      try {
        const rows: MigrationRows = {
          productImages: await this.prisma.productImage.count({
            where: { assetId: asset.id },
          }),
          avatars: await this.prisma.user.count({
            where: { avatarAssetId: asset.id },
          }),
          orderItems: await this.prisma.orderItem.count({
            where: { imagePublicId: asset.publicId },
          }),
          products: await this.prisma.product.count({
            where: { imageUrl: asset.secureUrl },
          }),
        };
        const base = { file: sourceUrl, publicId: asset.publicId, rows };
        if (!options.apply) {
          summary.migrated += 1;
          this.addRows(summary.rows, rows);
          this.log({ action: 'would_roll_back', ...base });
          continue;
        }
        await this.prisma.$transaction(async (tx) => {
          await tx.user.updateMany({
            where: { avatarAssetId: asset.id },
            data: { avatarAssetId: null, avatarUrl: sourceUrl },
          });
          await tx.productImage.updateMany({
            where: { assetId: asset.id },
            data: { assetId: null, url: sourceUrl },
          });
          await tx.product.updateMany({
            where: { imageUrl: asset.secureUrl },
            data: { imageUrl: sourceUrl },
          });
          await tx.orderItem.updateMany({
            where: { imagePublicId: asset.publicId },
            data: { imagePublicId: null, imageUrl: sourceUrl },
          });
        });
        summary.migrated += 1;
        this.addRows(summary.rows, rows);
        this.log({ action: 'rolled_back', ...base });
      } catch (error) {
        summary.errors += 1;
        this.log({
          action: 'error',
          file: sourceUrl,
          publicId: asset.publicId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  private addRows(total: MigrationRows, rows: MigrationRows) {
    total.productImages += rows.productImages;
    total.avatars += rows.avatars;
    total.orderItems += rows.orderItems;
    total.products += rows.products;
  }
}
