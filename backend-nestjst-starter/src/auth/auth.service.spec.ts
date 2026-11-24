import { Logger } from '@nestjs/common';
import { AuthService } from './auth.service';

// @nestjs/config, @nestjs/jwt, @nestjs/bullmq chỉ có bản ESM nên Jest không nạp được; chỉ cần chúng làm token DI
jest.mock('@nestjs/config', () => ({ ConfigService: class ConfigService {} }));
jest.mock('@nestjs/jwt', () => ({ JwtService: class JwtService {} }));
jest.mock('@nestjs/bullmq', () => ({ InjectQueue: () => () => undefined }));

const CREATED = {
  id: 11,
  email: 'moi@example.com',
  name: 'moi',
  role: 'CUSTOMER',
};
const DTO = { email: 'moi@example.com', password: '123456' };

function setup() {
  const calls: string[] = [];
  const usersService = {
    create: jest.fn(() => {
      calls.push('create');
      return Promise.resolve(CREATED);
    }),
  };
  const emailQueue = {
    addWelcome: jest.fn<Promise<string | undefined>, [number]>(() => {
      calls.push('addWelcome');
      return Promise.resolve('welcome-11');
    }),
  };
  const service = new AuthService(
    usersService as never,
    {} as never,
    {} as never,
    emailQueue as never,
  );
  return { service, usersService, emailQueue, calls };
}

// Chờ các tác vụ nền (promise không ai await) chạy xong
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('AuthService.register: mail chào mừng', () => {
  let unhandled: unknown[];
  const onUnhandled = (reason: unknown) => unhandled.push(reason);

  beforeEach(() => {
    unhandled = [];
    process.on('unhandledRejection', onUnhandled);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    process.off('unhandledRejection', onUnhandled);
    jest.restoreAllMocks();
  });

  it('tạo user thành công thì đặt job welcome với đúng userId, và đặt SAU khi tạo user', async () => {
    const { service, emailQueue, calls } = setup();

    const user = await service.register(DTO);

    expect(user).toBe(CREATED);
    expect(emailQueue.addWelcome).toHaveBeenCalledTimes(1);
    expect(emailQueue.addWelcome).toHaveBeenCalledWith(11);
    expect(calls).toEqual(['create', 'addWelcome']);
  });

  it('tạo user lỗi (vd trùng email) thì KHÔNG đặt job và lỗi được ném ra', async () => {
    const { service, usersService, emailQueue } = setup();
    usersService.create.mockRejectedValueOnce(
      new Error('Email đã được sử dụng'),
    );

    await expect(service.register(DTO)).rejects.toThrow(
      'Email đã được sử dụng',
    );
    expect(emailQueue.addWelcome).not.toHaveBeenCalled();
  });

  it('addWelcome reject (Redis lỗi) thì register VẪN trả user và không có unhandled rejection', async () => {
    const { service, emailQueue } = setup();
    emailQueue.addWelcome.mockRejectedValueOnce(
      Object.assign(new Error('connect ECONNREFUSED 10.0.0.5:6379 secret-pw'), {
        code: 'ECONNREFUSED',
      }),
    );

    await expect(service.register(DTO)).resolves.toBe(CREATED);
    await flush();

    expect(unhandled).toEqual([]);
  });

  it('addWelcome ném lỗi đồng bộ thì register vẫn trả user', async () => {
    const { service, emailQueue } = setup();
    emailQueue.addWelcome.mockImplementationOnce(() => {
      throw new Error('boom');
    });

    await expect(service.register(DTO)).resolves.toBe(CREATED);
  });

  it('register không chờ addWelcome (hàng đợi treo cũng không làm đăng ký treo)', async () => {
    const { service, emailQueue } = setup();
    emailQueue.addWelcome.mockReturnValueOnce(new Promise(() => undefined));

    await expect(service.register(DTO)).resolves.toBe(CREATED);
  });

  it('log chỉ có mã lỗi, không có message thô (có thể chứa địa chỉ/mật khẩu) và không có email', async () => {
    const logged: string[] = [];
    jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation((...args: unknown[]) => {
        logged.push(args.map(String).join(' '));
      });
    const { service, emailQueue } = setup();
    emailQueue.addWelcome.mockRejectedValueOnce(
      Object.assign(new Error('connect ECONNREFUSED 10.0.0.5:6379 secret-pw'), {
        code: 'ECONNREFUSED',
      }),
    );

    await service.register(DTO);
    await flush();

    const output = logged.join('\n');
    expect(output).toContain('ECONNREFUSED');
    expect(output).not.toContain('secret-pw');
    expect(output).not.toContain('10.0.0.5');
    expect(output).not.toContain('moi@example.com');
  });
});
