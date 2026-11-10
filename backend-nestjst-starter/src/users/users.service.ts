import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateAvatarDto } from './dto/update-avatar.dto';
import { MediaService } from '../media/media.service';
import { Paginated } from '../common/paginated';
import { Prisma } from '../generated/prisma/client';
import { normalizeEmail } from '../common/transforms/normalize-email';
import * as bcrypt from 'bcryptjs';

const userSelectFields = {
  id: true,
  email: true,
  name: true,
  phone: true,
  avatarUrl: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    // Chuẩn hóa lại ở service để các nơi gọi nội bộ (vd Auth) cũng nhất quán, không chỉ qua DTO
    const email = normalizeEmail(createUserDto.email);

    // 1. Kiểm tra email đã tồn tại hay chưa
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email này đã được sử dụng');
    }

    // 2. Băm mật khẩu bằng bcryptjs
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);

    // 3. Tạo user và dùng select để chỉ lấy các trường an toàn về
    return this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: createUserDto.name,
        phone: createUserDto.phone,
        role: createUserDto.role,
      },
      select: userSelectFields,
    });
  }

  // Chỉ dùng nội bộ (Auth): trả cả password để so sánh. Không được gọi từ controller hay trả ra client.
  async findByEmailWithPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: normalizeEmail(email) },
      select: { ...userSelectFields, password: true },
    });
    return user;
  }

  // Dùng cho Auth: trả null (không ném 404) để strategy tự quyết định lỗi 401.
  findForAuth(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: userSelectFields,
    });
  }

  async findAll(query: QueryUsersDto) {
    const { q, role, isActive, sortBy, order, page, limit } = query;
    const keyword = q?.trim();

    const where: Prisma.UserWhereInput = {
      ...(role && { role }),
      ...(isActive !== undefined && { isActive }),
      ...(keyword && {
        OR: [
          { name: { contains: keyword } },
          { email: { contains: keyword } },
          { phone: { contains: keyword } },
        ],
      }),
    };

    // Lấy danh sách và tổng số bản ghi trong cùng một lượt
    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: userSelectFields,
        orderBy: { [sortBy]: order },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return new Paginated(data, { page, limit, total });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userSelectFields,
    });

    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID #${id}`);
    }

    return user;
  }

  // actorId: người đang thực hiện (từ token). ADMIN không được tự hạ role của mình để tránh tự khóa quyền quản trị.
  async update(id: number, updateUserDto: UpdateUserDto, actorId: number) {
    const current = await this.findOne(id);

    // DTO chỉ chứa name, phone, role (đã whitelist); trường undefined bị Prisma bỏ qua
    const { name, phone, role } = updateUserDto;

    // Gửi lại đúng role hiện tại vẫn được; chỉ chặn đổi sang role khác
    if (id === actorId && role !== undefined && role !== current.role) {
      throw new ForbiddenException(
        'Bạn không thể tự thay đổi vai trò của chính mình',
      );
    }

    return this.prisma.user.update({
      where: { id },
      data: { name, phone, role },
      select: userSelectFields,
    });
  }

  // Khóa/mở khóa tài khoản (xóa mềm), không xóa cứng user. Không cho tự khóa chính mình.
  async updateStatus(
    id: number,
    { isActive }: UpdateUserStatusDto,
    actorId: number,
  ) {
    if (id === actorId && !isActive) {
      throw new ForbiddenException(
        'Bạn không thể tự khóa tài khoản của chính mình',
      );
    }
    await this.findOne(id);

    return this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: userSelectFields,
    });
  }

  // Người dùng tự đổi/xóa ảnh đại diện của chính mình (id lấy từ token). Gửi ĐÚNG MỘT trong hai:
  //  - assetId: id ảnh vừa tải lên qua POST /uploads/avatars;
  //  - avatarUrl: URL ảnh đã tải lên (secureUrl đã đăng ký), hoặc null để xóa ảnh.
  // Ảnh phải do chính người dùng tải lên. Ảnh cũ không còn ai dùng thì được đánh dấu cùng transaction và xóa phía kho SAU commit.
  async updateAvatar(userId: number, dto: UpdateAvatarDto) {
    const hasAssetId = dto.assetId !== undefined;
    const hasAvatarUrl = dto.avatarUrl !== undefined;
    if (hasAssetId === hasAvatarUrl || dto.assetId === null) {
      throw new BadRequestException({
        message: 'Dữ liệu không hợp lệ',
        errors: [
          {
            field: hasAssetId ? 'assetId' : 'avatarUrl',
            message:
              'Gửi đúng một trong hai: assetId (ảnh vừa tải lên) hoặc avatarUrl (URL ảnh đã tải lên, hoặc null để xóa ảnh)',
          },
        ],
      });
    }

    const current = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarAssetId: true },
    });
    if (!current) {
      throw new NotFoundException(
        `Không tìm thấy người dùng với ID #${userId}`,
      );
    }

    const next =
      dto.avatarUrl === null
        ? null
        : await this.media.resolveAvatar(userId, {
            assetId: dto.assetId,
            url: dto.avatarUrl,
          });
    const oldAssetId = current.avatarAssetId;

    const pending = await this.prisma.$transaction(
      async (tx) => {
        // Khóa asset trước mọi lần đọc khác (xem MediaService.lockAssets)
        const locked = await this.media.lockAssets(
          tx,
          [next?.id, oldAssetId].filter((id): id is number => id != null),
        );
        if (next) this.media.assertAttachable(locked, [next.id]);
        await tx.user.update({
          where: { id: userId },
          data: {
            avatarUrl: next?.secureUrl ?? null,
            avatarAssetId: next?.id ?? null,
          },
          select: { id: true },
        });
        return oldAssetId !== null && oldAssetId !== next?.id
          ? this.media.markUnreferenced(tx, [oldAssetId])
          : [];
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
    // Xóa phía kho lưu trữ sau commit; không bao giờ làm hỏng request
    await this.media.purge(pending);

    return this.findOne(userId);
  }
}
