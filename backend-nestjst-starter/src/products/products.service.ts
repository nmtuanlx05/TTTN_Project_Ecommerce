import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Paginated } from '../common/paginated';
import { fold } from '../common/utils/fold';
import { pickUniqueSlug, slugify } from '../common/utils/slugify';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { QueryPublicProductsDto } from './dto/query-public-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import {
  adminProductDetailSelect,
  adminProductListSelect,
  publicProductDetailSelect,
  publicProductListSelect,
  toAdminDetail,
  toAdminListItem,
  toPublicDetail,
  toPublicListItem,
} from './products.mapper';

interface VariantKey {
  sku: string;
  size: string;
  color: string;
  colorHex?: string | null;
}

// Cột Product.imageUrl (deprecated) là VARCHAR(191)
const LEGACY_IMAGE_URL_MAX = 191;

const pairKey = (v: { size: string; color: string }) =>
  `${fold(v.size)}|${fold(v.color)}`;

const searchCondition = (q: string): Prisma.ProductWhereInput => ({
  OR: [{ name: { contains: q } }, { slug: { contains: q } }],
});

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  // ===== Public =====

  // Chỉ sản phẩm đang hiện và còn ít nhất một biến thể đang bán
  async findAllPublic(query: QueryPublicProductsDto) {
    const {
      q,
      categoryId,
      minPrice,
      maxPrice,
      excludeId,
      sortBy,
      order,
      page,
      limit,
    } = query;

    // Lọc theo danh mục cha thì lấy luôn sản phẩm của danh mục con/cháu
    const categoryIds =
      categoryId !== undefined
        ? await this.collectCategoryIds(categoryId)
        : undefined;

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      variants: { some: { isActive: true } },
      ...(categoryIds && { categoryId: { in: categoryIds } }),
      ...(q && searchCondition(q)),
      ...((minPrice !== undefined || maxPrice !== undefined) && {
        price: {
          ...(minPrice !== undefined && { gte: minPrice }),
          ...(maxPrice !== undefined && { lte: maxPrice }),
        },
      }),
      ...(excludeId !== undefined && { id: { not: excludeId } }),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        select: publicProductListSelect,
        // id làm khóa phụ để thứ tự ổn định khi nhiều sản phẩm trùng giá trị sắp xếp
        orderBy: [{ [sortBy]: order }, { id: order }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return new Paginated(rows.map(toPublicListItem), { page, limit, total });
  }

  async findBySlug(slug: string) {
    // Sản phẩm ẩn hoặc không còn biến thể đang bán trả 404 như không tồn tại
    const product = await this.prisma.product.findFirst({
      where: { slug, isActive: true, variants: { some: { isActive: true } } },
      select: publicProductDetailSelect,
    });
    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }
    return toPublicDetail(product);
  }

  // ===== Admin =====

  async findAll(query: QueryProductsDto) {
    const { q, categoryId, isActive, sortBy, order, page, limit } = query;

    const where: Prisma.ProductWhereInput = {
      ...(categoryId !== undefined && { categoryId }),
      ...(isActive !== undefined && { isActive }),
      ...(q && searchCondition(q)),
    };

    // Lấy danh sách và tổng số bản ghi trong cùng một lượt
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        select: adminProductListSelect,
        orderBy: [{ [sortBy]: order }, { id: order }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return new Paginated(rows.map(toAdminListItem), { page, limit, total });
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: adminProductDetailSelect,
    });
    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm với ID #${id}`);
    }
    return toAdminDetail(product);
  }

  async create(dto: CreateProductDto) {
    const { name, slug, description, price, categoryId, variants } = dto;
    const imageUrls = this.resolveImageUrls(dto) ?? [];

    await this.assertCategoryExists(categoryId);
    this.assertNoDuplicateInBody(variants);
    this.assertColorHexConsistent(variants);
    await this.assertSkusAvailable(variants.map((v) => v.sku));

    const finalSlug = slug
      ? await this.assertSlugAvailable(slug)
      : await this.generateSlug(name);

    try {
      // Nested write của Prisma chạy trong một transaction: lỗi ở biến thể thì không tạo sản phẩm
      const created = await this.prisma.product.create({
        data: {
          name,
          slug: finalSlug,
          description: description ?? null,
          price,
          imageUrl: this.legacyImageUrl(imageUrls),
          categoryId,
          images: {
            create: imageUrls.map((url, sortOrder) => ({ url, sortOrder })),
          },
          variants: {
            create: variants.map((v) => ({
              sku: v.sku,
              size: v.size,
              color: v.color,
              colorHex: v.colorHex ?? null,
              isActive: v.isActive ?? true,
            })),
          },
        },
        select: { id: true },
      });
      return this.findOne(created.id);
    } catch (error) {
      this.rethrowUniqueViolation(error);
    }
  }

  async update(id: number, dto: UpdateProductDto) {
    const current = await this.prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        variants: {
          select: {
            id: true,
            sku: true,
            size: true,
            color: true,
            colorHex: true,
          },
        },
      },
    });
    if (!current) {
      throw new NotFoundException(`Không tìm thấy sản phẩm với ID #${id}`);
    }

    // null ở trường bắt buộc (name, price, categoryId) được coi như không gửi, giống categories
    if (dto.categoryId != null) {
      await this.assertCategoryExists(dto.categoryId);
    }
    // Đổi tên không đổi slug (giữ URL ổn định); chỉ đổi khi client gửi slug mới
    if (dto.slug && dto.slug !== current.slug) {
      await this.assertSlugAvailable(dto.slug, id);
    }

    const imageUrls = this.resolveImageUrls(dto);

    const variantWrites = dto.variants?.length
      ? await this.buildVariantWrites(current.variants, dto.variants)
      : undefined;

    try {
      // Một lệnh update với nested write: cập nhật sản phẩm và upsert biến thể trong cùng transaction
      const updateProduct = this.prisma.product.update({
        where: { id },
        data: {
          name: dto.name ?? undefined,
          slug: dto.slug ?? undefined,
          // undefined = giữ nguyên; null (hoặc "") = xóa giá trị
          description: dto.description,
          price: dto.price ?? undefined,
          // Có đổi ảnh thì đồng bộ cột cũ với ảnh đầu; không đổi ảnh thì không đụng tới
          imageUrl:
            imageUrls === undefined
              ? undefined
              : this.legacyImageUrl(imageUrls),
          categoryId: dto.categoryId ?? undefined,
          ...(variantWrites && { variants: variantWrites }),
        },
        select: { id: true },
      });

      if (imageUrls === undefined) {
        await updateProduct;
      } else {
        // Thay cả mảng ảnh: xóa dòng cũ, thêm dòng mới theo thứ tự gửi lên, cùng một transaction với việc sửa sản phẩm
        await this.prisma.$transaction([
          updateProduct,
          this.prisma.productImage.deleteMany({ where: { productId: id } }),
          ...(imageUrls.length > 0
            ? [
                this.prisma.productImage.createMany({
                  data: imageUrls.map((url, sortOrder) => ({
                    productId: id,
                    url,
                    sortOrder,
                  })),
                }),
              ]
            : []),
        ]);
      }
      return this.findOne(id);
    } catch (error) {
      this.rethrowUniqueViolation(error);
    }
  }

  // Ẩn/hiện sản phẩm (xóa mềm). Không đụng tới trạng thái từng biến thể.
  async updateStatus(id: number, isActive: boolean) {
    try {
      await this.prisma.product.update({
        where: { id },
        data: { isActive },
        select: { id: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Không tìm thấy sản phẩm với ID #${id}`);
      }
      throw error;
    }
    return this.findOne(id);
  }

  // ===== Biến thể =====

  // Từ danh sách client gửi, tạo ra phần `update` và `create` cho nested write.
  // Biến thể không có trong danh sách thì không bị đụng tới.
  private async buildVariantWrites(
    existing: (VariantKey & { id: number })[],
    items: UpdateVariantDto[],
  ) {
    const existingById = new Map(existing.map((v) => [v.id, v]));

    const seenIds = new Set<number>();
    for (const item of items) {
      if (typeof item.id !== 'number') continue;
      if (seenIds.has(item.id)) {
        throw new BadRequestException(
          `Biến thể #${item.id} xuất hiện nhiều lần trong danh sách`,
        );
      }
      seenIds.add(item.id);
      if (!existingById.has(item.id)) {
        throw new BadRequestException(
          `Biến thể #${item.id} không thuộc sản phẩm này`,
        );
      }
    }

    // Giá trị sau khi áp thay đổi (trường không gửi lấy từ bản ghi hiện có)
    const merged = items.map((item) => {
      const base =
        typeof item.id === 'number' ? existingById.get(item.id) : undefined;
      const sku = item.sku ?? base?.sku;
      const size = item.size ?? base?.size;
      const color = item.color ?? base?.color;
      if (!sku || !size || !color) {
        throw new BadRequestException(
          'Biến thể mới phải có đủ sku, size và color',
        );
      }
      // colorHex: không gửi (undefined) giữ giá trị cũ; null = xóa
      const colorHex =
        item.colorHex !== undefined ? item.colorHex : (base?.colorHex ?? null);
      return { item, key: { sku, size, color, colorHex } };
    });

    this.assertNoDuplicateInBody(merged.map((m) => m.key));

    // Va chạm với các biến thể không được gửi lên (giữ nguyên) của chính sản phẩm này
    const untouched = existing.filter((v) => !seenIds.has(v.id));
    // Kiểm mã màu trên trạng thái sau khi áp thay đổi (gồm cả biến thể giữ nguyên)
    this.assertColorHexConsistent([...untouched, ...merged.map((m) => m.key)]);
    for (const { key } of merged) {
      if (untouched.some((v) => fold(v.sku) === fold(key.sku))) {
        throw new ConflictException(`SKU "${key.sku}" đã được sử dụng`);
      }
      if (untouched.some((v) => pairKey(v) === pairKey(key))) {
        throw new ConflictException(
          `Sản phẩm đã có biến thể size "${key.size}" màu "${key.color}"`,
        );
      }
    }

    // SKU mới hoặc SKU đổi: kiểm tra với toàn bộ biến thể của sản phẩm khác
    const changedSkus = merged
      .filter(
        ({ item, key }) =>
          typeof item.id !== 'number' ||
          fold(existingById.get(item.id)?.sku ?? '') !== fold(key.sku),
      )
      .map(({ key }) => key.sku);
    await this.assertSkusAvailable(changedSkus, [...seenIds]);

    const update: Prisma.ProductVariantUpdateWithWhereUniqueWithoutProductInput[] =
      [];
    const create: Prisma.ProductVariantCreateWithoutProductInput[] = [];
    for (const { item, key } of merged) {
      if (typeof item.id === 'number') {
        const data: Prisma.ProductVariantUpdateWithoutProductInput = {
          ...(item.sku !== undefined && { sku: key.sku }),
          ...(item.size !== undefined && { size: key.size }),
          ...(item.color !== undefined && { color: key.color }),
          ...(item.colorHex !== undefined && { colorHex: item.colorHex }),
          ...(item.isActive !== undefined && { isActive: item.isActive }),
        };
        if (Object.keys(data).length > 0) {
          update.push({ where: { id: item.id }, data });
        }
      } else {
        create.push({ ...key, isActive: item.isActive ?? true });
      }
    }

    return {
      ...(update.length > 0 && { update }),
      ...(create.length > 0 && { create }),
    };
  }

  // Cùng một sản phẩm, các biến thể cùng tên màu (so khớp bằng fold) phải cùng mã màu khi đều có mã
  private assertColorHexConsistent(variants: VariantKey[]) {
    const seen = new Map<string, string>();
    for (const { color, colorHex } of variants) {
      if (!colorHex) continue;
      const key = fold(color.trim());
      const first = seen.get(key);
      if (first === undefined) {
        seen.set(key, colorHex);
      } else if (first !== colorHex) {
        throw new BadRequestException(
          `Màu "${color}" có hai mã màu khác nhau (${first} và ${colorHex}). Các biến thể cùng màu phải dùng chung một mã màu`,
        );
      }
    }
  }

  // ===== Ảnh =====

  // Danh sách URL ảnh cần ghi; undefined = không đổi ảnh.
  // Ưu tiên `images`. Chỉ gửi `imageUrl` cũ (tương thích tạm) thì coi như images = [imageUrl], null hoặc "" = xóa hết.
  private resolveImageUrls(dto: {
    images?: { url: string }[] | null;
    imageUrl?: string | null;
  }): string[] | undefined {
    if (dto.images === null) {
      // PartialType bỏ qua validate khi null nên chặn ở đây
      throw new BadRequestException('images phải là một mảng');
    }
    const urls =
      dto.images !== undefined
        ? dto.images.map((image) => image.url)
        : dto.imageUrl !== undefined
          ? dto.imageUrl
            ? [dto.imageUrl]
            : []
          : undefined;
    if (urls) {
      const seen = new Set<string>();
      for (const url of urls) {
        if (seen.has(url)) {
          throw new BadRequestException(
            `Ảnh "${url}" bị trùng trong danh sách ảnh`,
          );
        }
        seen.add(url);
      }
    }
    return urls;
  }

  // Cột imageUrl (deprecated) = ảnh đầu; null nếu không có ảnh hoặc URL quá dài so với cột
  private legacyImageUrl(urls: string[]): string | null {
    const first = urls[0];
    return first && first.length <= LEGACY_IMAGE_URL_MAX ? first : null;
  }

  // Trong cùng một danh sách gửi lên không được trùng SKU hoặc cặp (size, màu)
  private assertNoDuplicateInBody(variants: VariantKey[]) {
    const skus = new Set<string>();
    const pairs = new Set<string>();
    for (const v of variants) {
      const sku = fold(v.sku);
      if (skus.has(sku)) {
        throw new BadRequestException(
          `SKU "${v.sku}" bị trùng trong danh sách biến thể`,
        );
      }
      skus.add(sku);

      const pair = pairKey(v);
      if (pairs.has(pair)) {
        throw new BadRequestException(
          `Size "${v.size}" màu "${v.color}" bị trùng trong danh sách biến thể`,
        );
      }
      pairs.add(pair);
    }
  }

  // SKU là duy nhất toàn hệ thống; `excludeIds` là các biến thể đang được sửa trong request này
  private async assertSkusAvailable(skus: string[], excludeIds: number[] = []) {
    if (skus.length === 0) return;
    const taken = await this.prisma.productVariant.findFirst({
      where: { sku: { in: skus }, id: { notIn: excludeIds } },
      select: { sku: true },
    });
    if (taken) {
      throw new ConflictException(`SKU "${taken.sku}" đã được sử dụng`);
    }
  }

  // ===== Danh mục, slug =====

  private async assertCategoryExists(categoryId: number) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });
    if (!category) {
      throw new BadRequestException(
        `Danh mục với ID #${categoryId} không tồn tại`,
      );
    }
  }

  // Danh mục + toàn bộ danh mục con/cháu; mỗi cấp cây một truy vấn
  private async collectCategoryIds(rootId: number) {
    const ids = new Set<number>([rootId]);
    let frontier = [rootId];
    while (frontier.length > 0) {
      const children = await this.prisma.category.findMany({
        where: { parentId: { in: frontier } },
        select: { id: true },
      });
      frontier = children.map((c) => c.id).filter((id) => !ids.has(id));
      frontier.forEach((id) => ids.add(id));
    }
    return [...ids];
  }

  // Slug do client chỉ định mà trùng thì báo lỗi (khác với slug tự sinh sẽ thêm hậu tố)
  private async assertSlugAvailable(slug: string, excludeId?: number) {
    const duplicate = await this.prisma.product.findFirst({
      where: {
        slug,
        ...(excludeId !== undefined && { id: { not: excludeId } }),
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictException(`Slug "${slug}" đã được sử dụng`);
    }
    return slug;
  }

  private async generateSlug(name: string) {
    const base = slugify(name);
    if (!base) {
      throw new BadRequestException(
        'Tên sản phẩm phải chứa ít nhất một chữ cái hoặc chữ số',
      );
    }
    const similar = await this.prisma.product.findMany({
      where: { slug: { startsWith: base } },
      select: { slug: true },
    });
    return pickUniqueSlug(
      base,
      similar.map((p) => p.slug),
    );
  }

  // Hai request chạy đua cùng lọt qua bước kiểm tra thì DB chặn bằng unique: đổi sang 409 dễ hiểu
  private rethrowUniqueViolation(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const detail = JSON.stringify(error.meta ?? {}).toLowerCase();
      if (detail.includes('sku')) {
        throw new ConflictException('SKU đã được sử dụng');
      }
      if (detail.includes('slug')) {
        throw new ConflictException('Slug đã được sử dụng');
      }
      throw new ConflictException(
        'Slug, SKU hoặc biến thể (size, màu) đã tồn tại',
      );
    }
    throw error;
  }
}
