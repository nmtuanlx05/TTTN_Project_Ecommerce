import {
  isLocalMailHost,
  parseFrontendUrl,
  readMailConfig,
} from './mail.config';

const getter = (env: Record<string, string | undefined>) => (key: string) =>
  env[key];

const MAILPIT = {
  MAIL_HOST: '127.0.0.1',
  MAIL_PORT: '1025',
  MAIL_FROM: 'no-reply@example.com',
};

describe('isLocalMailHost', () => {
  it.each(['127.0.0.1', 'localhost', 'LOCALHOST', '::1'])('%s là cục bộ', (h) =>
    expect(isLocalMailHost(h)).toBe(true),
  );
  it.each(['smtp.gmail.com', '10.0.0.5', 'mailpit', '127.0.0.1.evil.com'])(
    '%s không phải cục bộ',
    (h) => expect(isLocalMailHost(h)).toBe(false),
  );
});

describe('readMailConfig', () => {
  it('Mailpit: không auth, không secure, không bắt TLS', () => {
    expect(readMailConfig(getter(MAILPIT))).toEqual({
      host: '127.0.0.1',
      port: 1025,
      from: 'no-reply@example.com',
      secure: false,
      requireTLS: false,
    });
  });

  it('cổng 465 => secure: true', () => {
    expect(
      readMailConfig(
        getter({ ...MAILPIT, MAIL_HOST: 'smtp.gmail.com', MAIL_PORT: '465' }),
      ).secure,
    ).toBe(true);
  });

  it('cổng khác 465 => secure: false (STARTTLS)', () => {
    for (const port of ['587', '25', '2465', '1025']) {
      expect(
        readMailConfig(getter({ ...MAILPIT, MAIL_PORT: port })).secure,
      ).toBe(false);
    }
  });

  it('host không cục bộ => requireTLS (kể cả cổng 587)', () => {
    const config = readMailConfig(
      getter({
        ...MAILPIT,
        MAIL_HOST: 'smtp.gmail.com',
        MAIL_PORT: '587',
        MAIL_USER: 'u@gmail.com',
        MAIL_PASSWORD: 'pw',
      }),
    );
    expect(config.requireTLS).toBe(true);
    expect(config.user).toBe('u@gmail.com');
    expect(config.password).toBe('pw');
  });

  it('MAIL_USER/MAIL_PASSWORD rỗng hoặc khoảng trắng = chưa đặt', () => {
    const config = readMailConfig(
      getter({ ...MAILPIT, MAIL_USER: '  ', MAIL_PASSWORD: '' }),
    );
    expect(config.user).toBeUndefined();
    expect(config.password).toBeUndefined();
  });

  it('có MAIL_USER mà thiếu MAIL_PASSWORD thì lỗi (và ngược lại)', () => {
    expect(() =>
      readMailConfig(getter({ ...MAILPIT, MAIL_USER: 'u@x.com' })),
    ).toThrow(/MAIL_PASSWORD/);
    expect(() =>
      readMailConfig(getter({ ...MAILPIT, MAIL_PASSWORD: 'pw' })),
    ).toThrow(/MAIL_USER/);
  });

  it('không trim mật khẩu', () => {
    expect(
      readMailConfig(
        getter({ ...MAILPIT, MAIL_USER: 'u', MAIL_PASSWORD: ' a b ' }),
      ).password,
    ).toBe(' a b ');
  });

  it('thiếu biến bắt buộc thì nêu đủ tên các biến thiếu', () => {
    expect(() => readMailConfig(getter({}))).toThrow(
      /MAIL_HOST, MAIL_PORT, MAIL_FROM/,
    );
    expect(() =>
      readMailConfig(getter({ ...MAILPIT, MAIL_HOST: ' ' })),
    ).toThrow(/MAIL_HOST/);
  });

  it.each(['abc', '0', '70000', '25.5', '-1', '1e3'])(
    'MAIL_PORT=%s bị từ chối',
    (port) => {
      expect(() =>
        readMailConfig(getter({ ...MAILPIT, MAIL_PORT: port })),
      ).toThrow(/MAIL_PORT/);
    },
  );

  it('MAIL_FROM không có @ hoặc có xuống dòng bị từ chối', () => {
    expect(() =>
      readMailConfig(getter({ ...MAILPIT, MAIL_FROM: 'khong-co-a-còng' })),
    ).toThrow(/MAIL_FROM/);
    expect(() =>
      readMailConfig(
        getter({ ...MAILPIT, MAIL_FROM: 'a@b.com\r\nBcc: x@y.com' }),
      ),
    ).toThrow(/MAIL_FROM/);
  });

  it('MAIL_FROM dạng "Tên <địa chỉ>" được chấp nhận', () => {
    expect(
      readMailConfig(
        getter({ ...MAILPIT, MAIL_FROM: 'Mono Studio <no-reply@example.com>' }),
      ).from,
    ).toBe('Mono Studio <no-reply@example.com>');
  });

  it('lỗi KHÔNG lộ giá trị MAIL_PASSWORD, MAIL_USER, MAIL_FROM', () => {
    const attempts: Array<Record<string, string>> = [
      { ...MAILPIT, MAIL_USER: 'secret-user@leak.com' }, // thiếu mật khẩu
      { ...MAILPIT, MAIL_PASSWORD: 'hunter2' }, // thiếu user
      { ...MAILPIT, MAIL_FROM: 'leak-from-no-at-sign' },
      { ...MAILPIT, MAIL_PORT: 'hunter2' },
    ];
    for (const env of attempts) {
      let message = '';
      try {
        readMailConfig(getter(env));
      } catch (error) {
        message = (error as Error).message;
      }
      expect(message).not.toBe('');
      for (const secret of ['hunter2', 'leak.com', 'leak-from-no-at-sign']) {
        expect(message).not.toContain(secret);
      }
    }
  });
});

describe('parseFrontendUrl', () => {
  it('chấp nhận http/https và bỏ dấu / cuối', () => {
    expect(parseFrontendUrl('http://localhost:5173')).toBe(
      'http://localhost:5173',
    );
    expect(parseFrontendUrl(' https://shop.example.com/ ')).toBe(
      'https://shop.example.com',
    );
    expect(parseFrontendUrl('https://example.com/shop//')).toBe(
      'https://example.com/shop',
    );
  });

  it.each([
    ['thiếu', undefined],
    ['rỗng', '  '],
    ['không phải URL', 'khong-phai-url'],
    ['sai giao thức', 'ftp://example.com'],
    ['chứa mật khẩu', 'https://user:hunter2@example.com'],
  ])('báo lỗi khi %s', (_label, value) => {
    expect(() => parseFrontendUrl(value)).toThrow(/FRONTEND_URL/);
  });

  it('lỗi không lộ mật khẩu trong URL', () => {
    let message = '';
    try {
      parseFrontendUrl('https://user:hunter2@example.com');
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).not.toContain('hunter2');
  });
});
