import {
  ALLOWED_MIME_TYPES,
  buildFileName,
  detectImageType,
} from './image-signature';

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const webp = (riff = 'RIFF', tag = 'WEBP') =>
  Buffer.concat([
    Buffer.from(riff, 'ascii'),
    Buffer.from([0x24, 0x00, 0x00, 0x00]),
    Buffer.from(tag, 'ascii'),
  ]);

describe('detectImageType', () => {
  it('nhận JPEG theo FFD8FF', () => {
    expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]))).toBe(
      'jpeg',
    );
  });

  it('nhận PNG theo 8 byte chữ ký', () => {
    expect(detectImageType(Buffer.from([...PNG, 0x00, 0x00]))).toBe('png');
  });

  it('nhận WebP theo RIFF....WEBP', () => {
    expect(detectImageType(webp())).toBe('webp');
  });

  it.each([
    ['buffer rỗng', Buffer.alloc(0)],
    ['văn bản có đuôi .png', Buffer.from('this is not a png at all')],
    ['HTML/SVG', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')],
    ['PNG thiếu byte cuối chữ ký', Buffer.from(PNG.slice(0, 7))],
    [
      'PNG sai một byte',
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0b]),
    ],
    ['JPEG thiếu byte', Buffer.from([0xff, 0xd8])],
    ['RIFF nhưng không phải WEBP (WAV)', webp('RIFF', 'WAVE')],
    ['WebP không có RIFF', webp('RIFX', 'WEBP')],
    ['WebP bị cắt cụt', webp().subarray(0, 11)],
    ['GIF', Buffer.from('GIF89a......')],
  ])('từ chối %s', (_name, buffer) => {
    expect(detectImageType(buffer)).toBeNull();
  });
});

describe('buildFileName', () => {
  const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

  it.each([
    ['jpeg', 'jpg'],
    ['png', 'png'],
    ['webp', 'webp'],
  ] as const)('%s -> <uuid>.%s', (type, ext) => {
    expect(buildFileName(type)).toMatch(new RegExp(`^${UUID}\\.${ext}$`));
  });

  it('mỗi lần gọi ra một tên khác nhau', () => {
    expect(buildFileName('png')).not.toBe(buildFileName('png'));
  });
});

describe('ALLOWED_MIME_TYPES', () => {
  it('chỉ gồm JPEG, PNG, WebP', () => {
    expect([...ALLOWED_MIME_TYPES].sort()).toEqual([
      'image/jpeg',
      'image/png',
      'image/webp',
    ]);
  });
});
