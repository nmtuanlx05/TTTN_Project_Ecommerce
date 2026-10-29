import {
  ConflictException,
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
import { UploadService } from '../uploads/upload.service';
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
    private readonly uploadService: UploadService,
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

  async update(id: number, updateUserDto: UpdateUserDto) {
    await this.findOne(id);

    // DTO chỉ chứa name, phone, role (đã whitelist); trường undefined bị Prisma bỏ qua
    const { name, phone, role } = updateUserDto;

    return this.prisma.user.update({
      where: { id },
      data: { name, phone, role },
      select: userSelectFields,
    });
  }

  // Khóa/mở khóa tài khoản (xóa mềm), không xóa cứng user
  async updateStatus(id: number, { isActive }: UpdateUserStatusDto) {
    await this.findOne(id);

    return this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: userSelectFields,
    });
  }

  // Người dùng tự đổi ảnh đại diện của chính mình (id lấy từ token). URL đã được AvatarUrlPipe kiểm tra.
  async updateAvatar(userId: number, { avatarUrl }: UpdateAvatarDto) {
    const current = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });
    if (!current) {
      throw new NotFoundException(
        `Không tìm thấy người dùng với ID #${userId}`,
      );
    }
    const oldUrl = current.avatarUrl;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: userSelectFields,
    });

    // Chỉ dọn file cũ sau khi cập nhật DB thành công và ảnh thật sự đổi
    if (oldUrl && oldUrl !== avatarUrl) {
      await this.removeOldAvatar(userId, oldUrl);
    }
    return updated;
  }

  // Xóa file avatar cũ, cố gắng hết sức: lỗi chỉ ghi log, không làm hỏng request đổi avatar.
  // Không xóa nếu user khác đang dùng cùng URL (hệ thống chưa ghi nhận ai sở hữu file upload).
  private async removeOldAvatar(userId: number, oldUrl: string) {
    try {
      const usedByOthers = await this.prisma.user.count({
        where: { avatarUrl: oldUrl, id: { not: userId } },
      });
      if (usedByOthers === 0) {
        await this.uploadService.deleteByUrl(oldUrl);
      }
    } catch (error) {
      this.logger.warn(
        `Không dọn được avatar cũ ${oldUrl}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
