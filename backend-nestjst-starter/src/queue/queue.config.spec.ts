import {
  assertWorkerFlag,
  parseRedisUrl,
  parseWorkerEnabled,
  readQueueConfig,
} from './queue.config';

const getter = (env: Record<string, string>) => (key: string) => env[key];

describe('parseRedisUrl', () => {
  it('đọc host và port', () => {
    expect(parseRedisUrl('redis://127.0.0.1:6379')).toEqual({
      host: '127.0.0.1',
      port: 6379,
    });
  });

  it('không ghi cổng thì mặc định 6379', () => {
    expect(parseRedisUrl('redis://redis.internal')).toMatchObject({
      host: 'redis.internal',
      port: 6379,
    });
  });

  it('đọc username, mật khẩu (giải mã %) và database trong URL', () => {
    expect(parseRedisUrl('redis://user:p%40ss@h:6380/2')).toEqual({
      host: 'h',
      port: 6380,
      username: 'user',
      password: 'p@ss',
      db: 2,
    });
  });

  it('REDIS_PASSWORD ưu tiên hơn mật khẩu trong URL', () => {
    expect(parseRedisUrl('redis://:fromurl@h:6379', 'fromenv')).toMatchObject({
      password: 'fromenv',
    });
  });

  it('REDIS_PASSWORD rỗng thì dùng mật khẩu trong URL', () => {
    expect(parseRedisUrl('redis://:fromurl@h:6379', '  ')).toMatchObject({
      password: 'fromurl',
    });
  });

  it('chỉ có REDIS_PASSWORD (URL không có mật khẩu)', () => {
    expect(parseRedisUrl('redis://h:6379', 'secret')).toMatchObject({
      password: 'secret',
    });
  });

  it('rediss:// bật TLS, redis:// thì không', () => {
    expect(parseRedisUrl('rediss://h:6380').tls).toEqual({ servername: 'h' });
    expect(parseRedisUrl('redis://h:6379').tls).toBeUndefined();
  });

  it('IPv6 bỏ ngoặc vuông', () => {
    expect(parseRedisUrl('redis://[::1]:6379').host).toBe('::1');
  });

  it.each([
    ['thiếu', undefined],
    ['rỗng', '   '],
    ['không phải URL', 'khong-phai-url'],
    ['sai giao thức', 'http://127.0.0.1:6379'],
    ['cổng ngoài khoảng', 'redis://h:70000'],
    ['đường dẫn không phải số', 'redis://h:6379/abc'],
  ])('báo lỗi khi %s', (_label, value) => {
    expect(() => parseRedisUrl(value)).toThrow(/REDIS_URL/);
  });

  it('thông báo lỗi nói cách sửa và KHÔNG lộ giá trị URL/mật khẩu', () => {
    let message = '';
    try {
      parseRedisUrl('ftp://user:hunter2@h:6379');
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain('redis://127.0.0.1:6379');
    expect(message).toContain('npm run db:up');
    expect(message).not.toContain('hunter2');
  });
});

describe('parseWorkerEnabled / assertWorkerFlag', () => {
  it('chỉ "false" mới tắt, còn lại bật', () => {
    expect(parseWorkerEnabled(undefined)).toBe(true);
    expect(parseWorkerEnabled('')).toBe(true);
    expect(parseWorkerEnabled('true')).toBe(true);
    expect(parseWorkerEnabled('false')).toBe(false);
  });

  it('từ chối giá trị lạ để gõ nhầm không lặng lẽ bật worker', () => {
    expect(() => assertWorkerFlag('False')).toThrow(/QUEUE_WORKER_ENABLED/);
    expect(() => assertWorkerFlag('0')).toThrow(/QUEUE_WORKER_ENABLED/);
    expect(() => assertWorkerFlag(undefined)).not.toThrow();
    expect(() => assertWorkerFlag('true')).not.toThrow();
  });
});

describe('readQueueConfig', () => {
  it('mặc định: prefix ecommerce, worker bật', () => {
    const config = readQueueConfig(getter({ REDIS_URL: 'redis://h:6379' }));
    expect(config.prefix).toBe('ecommerce');
    expect(config.workerEnabled).toBe(true);
    expect(config.connection).toEqual({ host: 'h', port: 6379 });
  });

  it('đọc QUEUE_PREFIX, QUEUE_WORKER_ENABLED và REDIS_PASSWORD', () => {
    const config = readQueueConfig(
      getter({
        REDIS_URL: 'redis://h:6379',
        REDIS_PASSWORD: 'pw',
        QUEUE_PREFIX: ' shop-prod ',
        QUEUE_WORKER_ENABLED: 'false',
      }),
    );
    expect(config.prefix).toBe('shop-prod');
    expect(config.workerEnabled).toBe(false);
    expect(config.connection.password).toBe('pw');
  });

  it('QUEUE_PREFIX rỗng thì dùng mặc định', () => {
    expect(
      readQueueConfig(getter({ REDIS_URL: 'redis://h', QUEUE_PREFIX: ' ' }))
        .prefix,
    ).toBe('ecommerce');
  });

  it('thiếu REDIS_URL thì ném lỗi', () => {
    expect(() => readQueueConfig(getter({}))).toThrow(/REDIS_URL/);
  });
});
