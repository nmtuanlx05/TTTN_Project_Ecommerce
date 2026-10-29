import { Logger, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import type { UploadService } from '../uploads/upload.service';
import { UsersService } from './users.service';

// PrismaService thật kéo theo client Prisma/adapter (không cần cho unit test này)
jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));

const OLD = 'http://localhost:3000/uploads/avatars/old.png';
const NEW = 'http://localhost:3000/uploads/avatars/new.png';

describe('UsersService.updateAvatar', () => {
  const prisma = {
    user: { findUnique: jest.fn(), update: jest.fn(), count: jest.fn() },
  };
  const uploadService = { deleteByUrl: jest.fn() };
  let service: UsersService;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetAllMocks();
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    prisma.user.update.mockImplementation(
      ({ data }: { data: { avatarUrl: string | null } }) =>
        Promise.resolve({ id: 7, avatarUrl: data.avatarUrl }),
    );
    prisma.user.count.mockResolvedValue(0);
    uploadService.deleteByUrl.mockResolvedValue(undefined);
    service = new UsersService(
      prisma as unknown as PrismaService,
      uploadService as unknown as UploadService,
    );
  });

  const currentAvatar = (avatarUrl: string | null) =>
    prisma.user.findUnique.mockResolvedValue({ avatarUrl });

  it('đổi sang URL mới: cập nhật đúng user và xóa file cũ', async () => {
    currentAvatar(OLD);

    const result = await service.updateAvatar(7, { avatarUrl: NEW });

    expect(result).toEqual({ id: 7, avatarUrl: NEW });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 7 },
        data: { avatarUrl: NEW },
      }),
    );
    expect(uploadService.deleteByUrl).toHaveBeenCalledWith(OLD);
  });

  it('gửi null (xóa ảnh): lưu null và xóa file cũ', async () => {
    currentAvatar(OLD);

    const result = await service.updateAvatar(7, { avatarUrl: null });

    expect(result).toEqual({ id: 7, avatarUrl: null });
    expect(uploadService.deleteByUrl).toHaveBeenCalledWith(OLD);
  });

  it('không xóa khi URL mới trùng URL cũ', async () => {
    currentAvatar(OLD);

    await service.updateAvatar(7, { avatarUrl: OLD });

    expect(uploadService.deleteByUrl).not.toHaveBeenCalled();
  });

  it.each<[string, string | null]>([
    ['chưa có ảnh, đặt ảnh mới', NEW],
    ['chưa có ảnh, gửi null', null],
  ])('không có avatar cũ (%s): không xóa gì', async (_name, avatarUrl) => {
    currentAvatar(null);

    await service.updateAvatar(7, { avatarUrl });

    expect(uploadService.deleteByUrl).not.toHaveBeenCalled();
  });

  it('không xóa file khi user khác đang dùng cùng URL', async () => {
    currentAvatar(OLD);
    prisma.user.count.mockResolvedValue(1);

    await service.updateAvatar(7, { avatarUrl: NEW });

    expect(prisma.user.count).toHaveBeenCalledWith({
      where: { avatarUrl: OLD, id: { not: 7 } },
    });
    expect(uploadService.deleteByUrl).not.toHaveBeenCalled();
  });

  it('cập nhật DB lỗi: không xóa file cũ và ném lỗi ra ngoài', async () => {
    currentAvatar(OLD);
    prisma.user.update.mockRejectedValue(new Error('db down'));

    await expect(service.updateAvatar(7, { avatarUrl: NEW })).rejects.toThrow(
      'db down',
    );
    expect(uploadService.deleteByUrl).not.toHaveBeenCalled();
  });

  it('xóa file lỗi: request vẫn thành công, chỉ ghi log', async () => {
    currentAvatar(OLD);
    uploadService.deleteByUrl.mockRejectedValue(new Error('EACCES'));

    await expect(service.updateAvatar(7, { avatarUrl: NEW })).resolves.toEqual({
      id: 7,
      avatarUrl: NEW,
    });
    expect(warnSpy).toHaveBeenCalled();
  });

  it('đếm user dùng chung lỗi: request vẫn thành công và không xóa file', async () => {
    currentAvatar(OLD);
    prisma.user.count.mockRejectedValue(new Error('db down'));

    await expect(service.updateAvatar(7, { avatarUrl: NEW })).resolves.toEqual({
      id: 7,
      avatarUrl: NEW,
    });
    expect(uploadService.deleteByUrl).not.toHaveBeenCalled();
  });

  it('user không tồn tại: 404, không cập nhật', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.updateAvatar(7, { avatarUrl: NEW }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
