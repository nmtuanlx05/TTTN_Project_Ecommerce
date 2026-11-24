import { EmailQueueService } from './email-queue.service';
import { EMAIL_JOB } from './queue.constants';

// @nestjs/bullmq và @nestjs/config chỉ có bản ESM nên Jest không nạp được; chỉ cần chúng làm token/decorator
jest.mock('@nestjs/bullmq', () => ({ InjectQueue: () => () => undefined }));
jest.mock('@nestjs/config', () => ({ ConfigService: class ConfigService {} }));

// Queue giả: không có Redis nào
function createService() {
  const queue = {
    on: jest.fn(),
    add: jest.fn<Promise<{ id: string }>, [string, unknown, unknown?]>(() =>
      Promise.resolve({ id: 'welcome-7' }),
    ),
  };
  const service = new EmailQueueService(queue as never, {} as never);
  return { service, queue };
}

describe('EmailQueueService.addWelcome', () => {
  it('đặt job "welcome" với data CHỈ có userId và jobId cố định welcome-<id>', async () => {
    const { service, queue } = createService();

    const jobId = await service.addWelcome(7);

    expect(queue.add).toHaveBeenCalledTimes(1);
    expect(queue.add).toHaveBeenCalledWith(
      EMAIL_JOB.WELCOME,
      { userId: 7 },
      { jobId: 'welcome-7' },
    );
    expect(jobId).toBe('welcome-7');
  });

  it('data không có email, tên hay trường nào khác', async () => {
    const { service, queue } = createService();
    await service.addWelcome(42);
    const data = queue.add.mock.calls[0][1] as Record<string, unknown>;
    expect(Object.keys(data)).toEqual(['userId']);
  });

  it('queue.add lỗi thì addWelcome reject (để nơi gọi tự xử lý)', async () => {
    const { service, queue } = createService();
    queue.add.mockRejectedValueOnce(new Error('redis down'));
    await expect(service.addWelcome(1)).rejects.toThrow('redis down');
  });
});
