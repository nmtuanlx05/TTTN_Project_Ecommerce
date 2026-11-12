import { randomUUID } from 'crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { badRequest, tooManyRequests } from '../common/errors/coded-errors';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { storageNotConfigured } from '../storage/disabled.storage';
import { StorageService } from '../storage/storage.types';
import { detectImageType } from '../uploads/image-signature';
import {
  isWithinPixelLimit,
  MAX_IMAGE_PIXELS,
  readImageSize,
} from '../uploads/image-info';
import {
  MSG_UNSUPPORTED_IMAGE,
  UPLOAD_FIELD,
  type UploadKind,
} from '../uploads/upload.config';
import {
  CLEANUP_BATCH_SIZE,
  MAX_DELETE_ATTEMPTS,
  QUOTA_WINDOW_MS,
  readMediaSettings,
  type MediaSettings,
} from './media.config';
import type {
  CleanupSummary,
  MediaKind,
  ResolvedImage,
  UploadedImage,
} from './media.types';

export const MEDIA_ERROR = {
  ASSET_INVALID: 'MEDIA_ASSET_INVALID',
  EXTERNAL_NOT_ALLOWED: 'EXTERNAL_IMAGE_NOT_ALLOWED',
  UPLOAD_QUOTA: 'UPLOAD_QUOTA_EXCEEDED',
} as const;

const KIND_OF_FOLDER: Record<UploadKind, MediaKind> = {
  products: 'PRODUCT',
  avatars: 'AVATAR',
};

export interface LockedAsset {
  id: number;
  status: string;
  kind: string;
  uploadedById: number | null;
}

type Tx = Prisma.TransactionClient;

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly settings: MediaSettings;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    config: ConfigService,
  ) {
    this.settings = readMediaSettings((key) => config.get<string>(key));
  }

  get storageEnabled() {
    return this.storage.isEnabled();
  }

  // ===== Tải lên =====

  // Kiểm file (magic bytes, kích thước điểm ảnh), kiểm hạn mức, đẩy lên kho rồi ghi media_assets.
  // Ghi DB lỗi thì xóa ngay ảnh vừa tải (best effort) để không để lại ảnh mồ côi.
  async uploadImage(
    file: Express.Multer.File | undefined,
    folder: UploadKind,
    userId: number,
  ): Promise<UploadedImage> {
    if (!file) {
      throw new BadRequestException(
        `Vui lòng chọn file ảnh (trường "${UPLOAD_FIELD}")`,
      );
    }
    // Chưa cấu hình thì báo 503 ngay, không tốn công kiểm file
    if (!this.storage.isEnabled()) {
      throw storageNotConfigured();
    }

    const kind = KIND_OF_FOLDER[folder];
    await this.assertQuota(userId, kind);

    const type = detectImageType(file.buffer);
    if (!type) {
      throw new UnsupportedMediaTypeException(MSG_UNSUPPORTED_IMAGE);
    }
    const size = readImageSize(file.buffer, type);
    if (!size) {
      throw new UnsupportedMediaTypeException(
        'Không đọc được kích thước ảnh, file có thể bị hỏng',
      );
    }
    if (!isWithinPixelLimit(size)) {
      throw new PayloadTooLargeException(
        `Ảnh quá lớn về kích thước (tối đa ${MAX_IMAGE_PIXELS / 1_000_000} triệu điểm ảnh)`,
      );
    }

    const stored = await this.storage.upload(file.buffer, {
      folder,
      name: randomUUID(),
      type,
    });
    try {
      const asset = await this.prisma.mediaAsset.create({
        data: {
          publicId: stored.publicId,
          secureUrl: stored.secureUrl,
          width: stored.width,
          height: stored.height,
          format: stored.format,
          bytes: stored.bytes,
          kind,
          uploadedById: userId,
        },
        select: { id: true },
      });
      return {
        assetId: asset.id,
        url: stored.secureUrl,
        publicId: stored.publicId,
        width: stored.width,
        height: stored.height,
        format: stored.format,
        bytes: stored.bytes,
      };
    } catch (error) {
      await this.deleteQuietly(stored.publicId);
      throw error;
    }
  }

  // Hạn mức theo người dùng: đếm media_assets tải trong 24 giờ gần nhất (kể cả đã xóa). Không chặt tuyệt đối khi nhiều
  // request song song (đếm rồi mới ghi), chấp nhận vượt vài ảnh; mục đích là chặn lạm dụng liên tục.
  private async assertQuota(userId: number, kind: MediaKind) {
    const limit = this.settings.quotaPerDay[kind];
    const used = await this.prisma.mediaAsset.count({
      where: {
        uploadedById: userId,
        kind,
        createdAt: { gte: new Date(Date.now() - QUOTA_WINDOW_MS) },
      },
    });
    if (used >= limit) {
      throw tooManyRequests(
        MEDIA_ERROR.UPLOAD_QUOTA,
        `Bạn đã đạt giới hạn ${limit} ảnh mỗi 24 giờ, vui lòng thử lại sau`,
      );
    }
  }

  // ===== Gắn ảnh vào dữ liệu =====

  // Phân giải danh sách ảnh sản phẩm gửi lên thành { url, assetId }. Chưa khóa gì: gọi lockAssets trong transaction ghi.
  // - Có assetId: phải là ảnh PRODUCT còn ACTIVE; url lấy từ asset.
  // - Chỉ có url: trùng secureUrl của asset đã đăng ký thì dùng asset đó (tương thích frontend cũ gửi lại url nhận được).
  // - URL còn lại: ảnh thuộc kho của hệ thống mà chưa đăng ký thì từ chối; URL ngoài chỉ nhận https
  //   (assetId null) và khi ALLOW_EXTERNAL_IMAGE_URLS không tắt.
  async resolveProductImages(
    inputs: { url?: string | null; assetId?: number | null }[],
  ): Promise<ResolvedImage[]> {
    const ids = inputs.flatMap((i) => (i.assetId ? [i.assetId] : []));
    const urls = inputs.flatMap((i) => (!i.assetId && i.url ? [i.url] : []));
    const none: { id: number; secureUrl: string }[] = [];
    const [byId, byUrl] = await Promise.all([
      ids.length
        ? this.prisma.mediaAsset.findMany({
            where: { id: { in: ids }, kind: 'PRODUCT', status: 'ACTIVE' },
            select: { id: true, secureUrl: true },
          })
        : none,
      urls.length
        ? this.prisma.mediaAsset.findMany({
            where: {
              secureUrl: { in: urls },
              kind: 'PRODUCT',
              status: 'ACTIVE',
            },
            select: { id: true, secureUrl: true },
          })
        : none,
    ]);
    const assetById = new Map(byId.map((a) => [a.id, a]));
    const assetByUrl = new Map(byUrl.map((a) => [a.secureUrl, a]));

    return inputs.map((input, index) => {
      if (input.assetId) {
        const asset = assetById.get(input.assetId);
        if (!asset) {
          throw this.invalidImage(index);
        }
        return { url: asset.secureUrl, assetId: asset.id };
      }
      const url = input.url ?? '';
      const registered = assetByUrl.get(url);
      if (registered) {
        return { url: registered.secureUrl, assetId: registered.id };
      }
      if (this.storage.ownsUrl(url)) {
        // Thuộc kho của mình nhưng không có asset ACTIVE tương ứng (đã xóa hoặc tự bịa)
        throw this.invalidImage(index);
      }
      if (!this.settings.allowExternalImageUrls) {
        throw badRequest(
          MEDIA_ERROR.EXTERNAL_NOT_ALLOWED,
          'Không nhận ảnh từ đường dẫn ngoài, vui lòng tải ảnh lên hệ thống',
          {
            errors: [
              {
                field: `images.${index}.url`,
                message: 'Chỉ nhận ảnh đã tải lên hệ thống',
              },
            ],
          },
        );
      }
      if (!url.startsWith('https://')) {
        throw badRequest(
          MEDIA_ERROR.ASSET_INVALID,
          'Đường dẫn ảnh ngoài phải bắt đầu bằng https://',
          {
            errors: [
              {
                field: `images.${index}.url`,
                message: 'Đường dẫn ảnh ngoài phải bắt đầu bằng https://',
              },
            ],
          },
        );
      }
      return { url, assetId: null };
    });
  }

  private invalidImage(index: number) {
    return badRequest(
      MEDIA_ERROR.ASSET_INVALID,
      'Ảnh không hợp lệ, đã bị xóa hoặc không phải ảnh sản phẩm',
      {
        errors: [
          {
            field: `images.${index}`,
            message: 'Ảnh không hợp lệ, đã bị xóa hoặc không phải ảnh sản phẩm',
          },
        ],
      },
    );
  }

  // Phân giải ảnh đại diện: phải là ảnh AVATAR còn ACTIVE do CHÍNH người dùng tải lên.
  // Nhận assetId hoặc URL đã đăng ký (secureUrl của asset).
  async resolveAvatar(
    userId: number,
    input: { assetId?: number; url?: string },
  ): Promise<{ id: number; secureUrl: string }> {
    const asset = await this.prisma.mediaAsset.findFirst({
      where: {
        ...(input.assetId !== undefined
          ? { id: input.assetId }
          : { secureUrl: input.url }),
        kind: 'AVATAR',
        status: 'ACTIVE',
        uploadedById: userId,
      },
      select: { id: true, secureUrl: true },
    });
    if (!asset) {
      const field = input.assetId !== undefined ? 'assetId' : 'avatarUrl';
      throw badRequest(
        MEDIA_ERROR.ASSET_INVALID,
        'Ảnh đại diện không hợp lệ hoặc không phải ảnh do bạn tải lên',
        {
          errors: [
            {
              field,
              message:
                'Ảnh đại diện không hợp lệ hoặc không phải ảnh do bạn tải lên',
            },
          ],
        },
      );
    }
    return asset;
  }

  // ===== Trong transaction =====

  // Khóa các dòng asset (SELECT ... FOR UPDATE, theo id tăng dần để tránh deadlock). PHẢI là câu đầu tiên của transaction ghi
  // (trước mọi lần đọc thường) để các lần đọc tham chiếu sau đó thấy dữ liệu mới nhất; cùng khóa này chặn việc "gắn ảnh"
  // và "đánh dấu xóa" chạy chen nhau trên cùng một asset.
  async lockAssets(tx: Tx, ids: number[]): Promise<Map<number, LockedAsset>> {
    const unique = [...new Set(ids)].sort((a, b) => a - b);
    if (unique.length === 0) return new Map();
    const rows = await tx.$queryRaw<LockedAsset[]>(
      Prisma.sql`SELECT id, status, kind, uploadedById FROM media_assets WHERE id IN (${Prisma.join(unique)}) ORDER BY id FOR UPDATE`,
    );
    return new Map(rows.map((row) => [Number(row.id), row]));
  }

  // Các asset (đã khóa) dùng để gắn phải còn ACTIVE; nếu bị xóa chen ngang thì báo lỗi để người dùng tải lại.
  assertAttachable(locked: Map<number, LockedAsset>, ids: number[]) {
    for (const id of ids) {
      const row = locked.get(id);
      if (!row || row.status !== 'ACTIVE') {
        throw badRequest(
          MEDIA_ERROR.ASSET_INVALID,
          'Ảnh không còn tồn tại, vui lòng tải ảnh lên lại',
        );
      }
    }
  }

  // Trong cùng transaction, sau khi đã ghi quan hệ mới: asset ứng viên không còn ai tham chiếu thì đánh dấu PENDING_DELETE.
  // Còn tham chiếu bởi product_images.assetId, users.avatarAssetId hoặc order_items.imagePublicId thì KHÔNG đụng tới.
  // Trả về các id vừa đánh dấu để gọi purge SAU khi commit.
  async markUnreferenced(tx: Tx, candidateIds: number[]): Promise<number[]> {
    const ids = [...new Set(candidateIds)];
    if (ids.length === 0) return [];
    const assets = await tx.mediaAsset.findMany({
      where: { id: { in: ids }, status: 'ACTIVE' },
      select: { id: true, publicId: true },
    });
    if (assets.length === 0) return [];
    const activeIds = assets.map((a) => a.id);
    const [images, users, orders] = await Promise.all([
      tx.productImage.findMany({
        where: { assetId: { in: activeIds } },
        select: { assetId: true },
      }),
      tx.user.findMany({
        where: { avatarAssetId: { in: activeIds } },
        select: { avatarAssetId: true },
      }),
      tx.orderItem.findMany({
        where: { imagePublicId: { in: assets.map((a) => a.publicId) } },
        select: { imagePublicId: true },
      }),
    ]);
    const usedIds = new Set<number>([
      ...images.flatMap((r) => (r.assetId === null ? [] : [r.assetId])),
      ...users.flatMap((r) =>
        r.avatarAssetId === null ? [] : [r.avatarAssetId],
      ),
    ]);
    const usedPublicIds = new Set(
      orders.flatMap((r) =>
        r.imagePublicId === null ? [] : [r.imagePublicId],
      ),
    );
    const free = assets
      .filter((a) => !usedIds.has(a.id) && !usedPublicIds.has(a.publicId))
      .map((a) => a.id);
    if (free.length > 0) {
      await tx.mediaAsset.updateMany({
        where: { id: { in: free }, status: 'ACTIVE' },
        data: { status: 'PENDING_DELETE' },
      });
    }
    return free;
  }

  // ===== Sau commit =====

  // Xóa phía kho lưu trữ các asset PENDING_DELETE. KHÔNG BAO GIỜ ném lỗi: lỗi chỉ tăng deleteAttempts và ghi lastError.
  async purge(ids: number[]): Promise<{ deleted: number; failed: number }> {
    const result = { deleted: 0, failed: 0 };
    if (ids.length === 0) return result;
    try {
      const assets = await this.prisma.mediaAsset.findMany({
        where: { id: { in: ids }, status: 'PENDING_DELETE' },
        select: { id: true, publicId: true },
        orderBy: { id: 'asc' },
      });
      for (const asset of assets) {
        try {
          await this.storage.delete(asset.publicId);
          await this.prisma.mediaAsset.updateMany({
            where: { id: asset.id, status: 'PENDING_DELETE' },
            data: { status: 'DELETED', deletedAt: new Date(), lastError: null },
          });
          result.deleted += 1;
        } catch (error) {
          result.failed += 1;
          this.logger.warn(
            `Không xóa được ảnh ${asset.publicId}: ${messageOf(error)}`,
          );
          await this.recordDeleteFailure(asset.id, error);
        }
      }
    } catch (error) {
      this.logger.warn(`Dọn ảnh bị gián đoạn: ${messageOf(error)}`);
    }
    return result;
  }

  private async recordDeleteFailure(id: number, error: unknown) {
    try {
      await this.prisma.mediaAsset.update({
        where: { id },
        data: {
          deleteAttempts: { increment: 1 },
          lastError: messageOf(error).slice(0, 500),
        },
      });
    } catch (inner) {
      this.logger.warn(
        `Không ghi được lỗi xóa ảnh #${id}: ${messageOf(inner)}`,
      );
    }
  }

  private async deleteQuietly(publicId: string) {
    try {
      await this.storage.delete(publicId);
    } catch (error) {
      this.logger.warn(
        `Không xóa được ảnh vừa tải ${publicId} sau khi ghi DB lỗi: ${messageOf(error)}`,
      );
    }
  }

  // ===== Dọn ảnh =====

  // (1) Thử lại các asset PENDING_DELETE (đã qua MAX_DELETE_ATTEMPTS lần thì bỏ, chỉ đếm).
  // (2) ACTIVE, cũ hơn minAgeHours, không ai tham chiếu thì chuyển PENDING_DELETE rồi xóa.
  // dryRun: chỉ đếm, không ghi gì và không gọi kho lưu trữ.
  async cleanup(
    options: { dryRun?: boolean; now?: Date } = {},
  ): Promise<CleanupSummary> {
    const dryRun = options.dryRun ?? false;
    const now = options.now ?? new Date();
    const summary: CleanupSummary = {
      dryRun,
      deleted: 0,
      failed: 0,
      gaveUp: 0,
      orphansMarked: 0,
    };

    summary.gaveUp = await this.prisma.mediaAsset.count({
      where: {
        status: 'PENDING_DELETE',
        deleteAttempts: { gte: MAX_DELETE_ATTEMPTS },
      },
    });
    const retry = await this.prisma.mediaAsset.findMany({
      where: {
        status: 'PENDING_DELETE',
        deleteAttempts: { lt: MAX_DELETE_ATTEMPTS },
      },
      select: { id: true },
      orderBy: { id: 'asc' },
      take: CLEANUP_BATCH_SIZE,
    });

    const cutoff = new Date(
      now.getTime() - this.settings.orphanMinAgeHours * 3_600_000,
    );
    const orphanCandidates = await this.prisma.mediaAsset.findMany({
      where: {
        status: 'ACTIVE',
        createdAt: { lt: cutoff },
        productImages: { none: {} },
        avatarUsers: { none: {} },
      },
      select: { id: true, publicId: true },
      orderBy: { id: 'asc' },
      take: CLEANUP_BATCH_SIZE,
    });

    if (dryRun) {
      const inOrders = await this.referencedByOrders(
        orphanCandidates.map((a) => a.publicId),
      );
      summary.orphansMarked = orphanCandidates.filter(
        (a) => !inOrders.has(a.publicId),
      ).length;
      summary.deleted = retry.length;
      return summary;
    }

    // Đánh dấu mồ côi trong transaction (khóa trước, kiểm tham chiếu sau) rồi xóa cùng lô với các asset cần thử lại
    const marked = orphanCandidates.length
      ? await this.prisma.$transaction(
          async (tx) => {
            const ids = orphanCandidates.map((a) => a.id);
            await this.lockAssets(tx, ids);
            return this.markUnreferenced(tx, ids);
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
        )
      : [];
    summary.orphansMarked = marked.length;

    const purged = await this.purge([...retry.map((a) => a.id), ...marked]);
    summary.deleted = purged.deleted;
    summary.failed = purged.failed;
    return summary;
  }

  private async referencedByOrders(publicIds: string[]): Promise<Set<string>> {
    if (publicIds.length === 0) return new Set();
    const rows = await this.prisma.orderItem.findMany({
      where: { imagePublicId: { in: publicIds } },
      select: { imagePublicId: true },
      distinct: ['imagePublicId'],
    });
    return new Set(
      rows.flatMap((r) => (r.imagePublicId === null ? [] : [r.imagePublicId])),
    );
  }
}
