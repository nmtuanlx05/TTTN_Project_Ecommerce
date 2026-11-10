import type { ConfigService } from '@nestjs/config';
import { MediaCleanupCron } from './media-cleanup.cron';
import type { MediaService } from './media.service';

jest.mock('@nestjs/config', () => ({ ConfigService: class {} }));
// @nestjs/schedule chỉ cần decorator ở đây; test không bao giờ khởi động bộ lập lịch
jest.mock('@nestjs/schedule', () => ({ Cron: () => () => undefined }));
jest.mock('./media.service', () => ({ MediaService: class {} }));

function setup(env: Record<string, string> = {}, enabled = true) {
  const media = {
    storageEnabled: enabled,
    cleanup: jest.fn().mockResolvedValue({
      deleted: 1,
      failed: 0,
      gaveUp: 0,
      orphansMarked: 0,
    }),
  };
  const config = { get: (k: string) => env[k] } as unknown as ConfigService;
  return {
    media,
    cron: new MediaCleanupCron(media as unknown as MediaService, config),
  };
}

describe('MediaCleanupCron', () => {
  it('chạy cleanup khi bật và kho đã cấu hình', async () => {
    const { cron, media } = setup();
    await cron.run();
    expect(media.cleanup).toHaveBeenCalledTimes(1);
  });

  it('MEDIA_CLEANUP_ENABLED=false → không chạy', async () => {
    const { cron, media } = setup({ MEDIA_CLEANUP_ENABLED: 'false' });
    await cron.run();
    expect(media.cleanup).not.toHaveBeenCalled();
  });

  it('kho chưa cấu hình → không chạy', async () => {
    const { cron, media } = setup({}, false);
    await cron.run();
    expect(media.cleanup).not.toHaveBeenCalled();
  });

  it('lỗi không làm sập tiến trình và lượt sau vẫn chạy được', async () => {
    const { cron, media } = setup();
    media.cleanup.mockRejectedValueOnce(new Error('boom'));
    await expect(cron.run()).resolves.toBeUndefined();
    await cron.run();
    expect(media.cleanup).toHaveBeenCalledTimes(2);
  });

  it('chống chồng lượt trong cùng tiến trình', async () => {
    const { cron, media } = setup();
    let release!: () => void;
    media.cleanup.mockReturnValueOnce(
      new Promise((r) => (release = () => r({}))),
    );
    const first = cron.run();
    await cron.run();
    expect(media.cleanup).toHaveBeenCalledTimes(1);
    release();
    await first;
  });
});
