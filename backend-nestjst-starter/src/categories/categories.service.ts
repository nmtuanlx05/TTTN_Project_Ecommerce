import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { QueryCategoriesDto } from './dto/query-categories.dto';
import { Paginated } from '../common/paginated';
import { Prisma } from '../generated/prisma/client';
import { pickUniqueSlug, slugify } from '../common/utils/slugify';

// Trường trả ra cho public: chỉ thông tin hiển thị
const publicCategorySelect = {
  id: true,
  name: true,
  slug: true,
  parentId: true,
} as const;

// Trường trả ra cho admin: kèm danh mục cha và số sản phẩm/danh mục con (một truy vấn, không N+1)
const adminCategorySelect = {
  ...publicCategorySelect,
  parent: { select: { id: true, name: true } },
  _count: { select: { products: true, children: true } },
} as const;

type AdminCategoryRow = Prisma.CategoryGetPayload<{
  select: typeof adminCategorySelect;
}>;

// Đưa _count về dạng phẳng productCount/childCount cho client
function toAdminCategory({ _count, ...category }: AdminCategoryRow) {
  return {
    ...category,
    productCount: _count.products,
    childCount: _count.children,
  };
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  // Public: toàn bộ danh mục dạng phẳng, frontend tự dựng cây theo parentId
  findAllPublic() {
    return this.prisma.category.findMany({
      select: publicCategorySelect,
      orderBy: { name: 'asc' },
    });
  }

  async findAll(query: QueryCategoriesDto) {
    const { q, parentId, sortBy, order, page, limit } = query;

    const where: Prisma.CategoryWhereInput = {
      ...(parentId !== undefined && { parentId }),
      ...(q && { OR: [{ name: { contains: q } }, { slug: { contains: q } }] }),
    };

    // Lấy danh sách và tổng số bản ghi trong cùng một lượt
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        where,
        select: adminCategorySelect,
        orderBy: { [sortBy]: order },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.category.count({ where }),
    ]);

    return new Paginated(rows.map(toAdminCategory), { page, limit, total });
  }

  async findOne(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: {
        ...adminCategorySelect,
        children: {
          select: { id: true, name: true, slug: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Không tìm thấy danh mục với ID #${id}`);
    }

    return toAdminCategory(category);
  }

  async create({ name, parentId, slug }: CreateCategoryDto) {
    const parent = parentId ?? null;

    if (parent !== null) {
      await this.assertParentExists(parent);
    }
    await this.assertNameAvailable(name, parent);

    const finalSlug = slug
      ? await this.assertSlugAvailable(slug)
      : await this.generateSlug(name);

    try {
      const created = await this.prisma.category.create({
        data: { name, slug: finalSlug, parentId: parent },
        select: { id: true },
      });
      return this.findOne(created.id);
    } catch (error) {
      this.rethrowUniqueViolation(error);
    }
  }

  async update(id: number, dto: UpdateCategoryDto) {
    const current = await this.prisma.category.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true, parentId: true },
    });
    if (!current) {
      throw new NotFoundException(`Không tìm thấy danh mục với ID #${id}`);
    }

    const name = dto.name ?? current.name;
    // undefined = giữ nguyên; null = đưa về gốc
    const parentId =
      dto.parentId === undefined ? current.parentId : dto.parentId;

    if (dto.parentId !== undefined && parentId !== null) {
      await this.assertParentExists(parentId);
      await this.assertNoCycle(id, parentId);
    }
    if (name !== current.name || parentId !== current.parentId) {
      await this.assertNameAvailable(name, parentId, id);
    }
    // Đổi tên không đổi slug (giữ URL ổn định); chỉ đổi khi client gửi slug mới
    if (dto.slug !== undefined && dto.slug !== current.slug) {
      await this.assertSlugAvailable(dto.slug, id);
    }

    try {
      await this.prisma.category.update({
        where: { id },
        data: { name, parentId, slug: dto.slug },
        select: { id: true },
      });
      return this.findOne(id);
    } catch (error) {
      this.rethrowUniqueViolation(error);
    }
  }

  // Xóa cứng (Category không có cờ isActive): chỉ cho xóa khi không còn sản phẩm hay danh mục con
  async remove(id: number) {
    await this.findOne(id);

    const [productCount, childCount] = await this.prisma.$transaction([
      this.prisma.product.count({ where: { categoryId: id } }),
      this.prisma.category.count({ where: { parentId: id } }),
    ]);

    if (productCount > 0) {
      throw new ConflictException(
        `Không thể xóa danh mục đang có ${productCount} sản phẩm. Hãy chuyển sản phẩm sang danh mục khác trước`,
      );
    }
    if (childCount > 0) {
      throw new ConflictException(
        `Không thể xóa danh mục đang có ${childCount} danh mục con. Hãy xóa hoặc chuyển danh mục con trước`,
      );
    }

    await this.prisma.category.delete({ where: { id } });
    return { message: 'Xóa danh mục thành công' };
  }

  private async assertParentExists(parentId: number) {
    const parent = await this.prisma.category.findUnique({
      where: { id: parentId },
      select: { id: true },
    });
    if (!parent) {
      throw new BadRequestException(
        `Danh mục cha với ID #${parentId} không tồn tại`,
      );
    }
  }

  // Đi ngược từ danh mục cha mới lên gốc; gặp chính danh mục đang sửa nghĩa là sẽ tạo vòng lặp
  private async assertNoCycle(id: number, newParentId: number) {
    let cursor: number | null = newParentId;
    while (cursor !== null) {
      if (cursor === id) {
        throw new BadRequestException(
          'Không thể chọn chính danh mục này hoặc danh mục con của nó làm danh mục cha',
        );
      }
      const node: { parentId: number | null } | null =
        await this.prisma.category.findUnique({
          where: { id: cursor },
          select: { parentId: true },
        });
      cursor = node?.parentId ?? null;
    }
  }

  // Tên không được trùng giữa các danh mục cùng cấp (DB không có unique cho tên nên kiểm tra ở đây)
  private async assertNameAvailable(
    name: string,
    parentId: number | null,
    excludeId?: number,
  ) {
    const duplicate = await this.prisma.category.findFirst({
      where: {
        name,
        parentId,
        ...(excludeId !== undefined && { id: { not: excludeId } }),
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictException(
        `Tên danh mục "${name}" đã tồn tại trong cùng cấp`,
      );
    }
  }

  // Slug do client chỉ định mà trùng thì báo lỗi (khác với slug tự sinh sẽ thêm hậu tố)
  private async assertSlugAvailable(slug: string, excludeId?: number) {
    const duplicate = await this.prisma.category.findFirst({
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
        'Tên danh mục phải chứa ít nhất một chữ cái hoặc chữ số',
      );
    }
    const similar = await this.prisma.category.findMany({
      where: { slug: { startsWith: base } },
      select: { slug: true },
    });
    return pickUniqueSlug(
      base,
      similar.map((c) => c.slug),
    );
  }

  // Hai request chạy đua cùng lọt qua bước kiểm tra thì DB chặn bằng unique: đổi sang 409 dễ hiểu
  private rethrowUniqueViolation(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Slug hoặc tên danh mục đã tồn tại');
    }
    throw error;
  }
}
