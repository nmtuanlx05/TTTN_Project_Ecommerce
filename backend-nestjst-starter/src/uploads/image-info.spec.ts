import {
  isWithinPixelLimit,
  MAX_IMAGE_PIXELS,
  readImageSize,
} from './image-info';

// Dựng đầu file tối thiểu cho từng định dạng (chỉ phần tiêu đề mà readImageSize đọc)
function png(width: number, height: number) {
  const b = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
  b.writeUInt32BE(13, 8);
  b.write('IHDR', 12, 'ascii');
  b.writeUInt32BE(width, 16);
  b.writeUInt32BE(height, 20);
  return b;
}

function jpeg(width: number, height: number, withApp0 = true) {
  const parts = [Buffer.from([0xff, 0xd8])];
  if (withApp0) {
    // APP0 dài 16 byte (2 byte độ dài + 14 byte dữ liệu)
    parts.push(Buffer.from([0xff, 0xe0, 0x00, 0x10]), Buffer.alloc(14));
  }
  const sof = Buffer.alloc(19);
  sof.set([0xff, 0xc0, 0x00, 0x11, 0x08]);
  sof.writeUInt16BE(height, 5);
  sof.writeUInt16BE(width, 7);
  parts.push(sof);
  return Buffer.concat(parts);
}

function webp(chunk: 'VP8 ' | 'VP8L' | 'VP8X', width: number, height: number) {
  const b = Buffer.alloc(40);
  b.write('RIFF', 0, 'ascii');
  b.write('WEBP', 8, 'ascii');
  b.write(chunk, 12, 'ascii');
  if (chunk === 'VP8 ') {
    b.set([0x9d, 0x01, 0x2a], 23);
    b.writeUInt16LE(width, 26);
    b.writeUInt16LE(height, 28);
  } else if (chunk === 'VP8L') {
    b[20] = 0x2f;
    const w = width - 1;
    const h = height - 1;
    b[21] = w & 0xff;
    b[22] = ((w >> 8) & 0x3f) | ((h & 0x03) << 6);
    b[23] = (h >> 2) & 0xff;
    b[24] = (h >> 10) & 0x0f;
  } else {
    b.writeUIntLE(width - 1, 24, 3);
    b.writeUIntLE(height - 1, 27, 3);
  }
  return b;
}

describe('readImageSize', () => {
  it('PNG: đọc từ IHDR', () => {
    expect(readImageSize(png(800, 600), 'png')).toEqual({
      width: 800,
      height: 600,
    });
  });

  it('JPEG: bỏ qua APP0 rồi đọc SOF', () => {
    expect(readImageSize(jpeg(1200, 900), 'jpeg')).toEqual({
      width: 1200,
      height: 900,
    });
    expect(readImageSize(jpeg(64, 48, false), 'jpeg')).toEqual({
      width: 64,
      height: 48,
    });
  });

  it.each(['VP8 ', 'VP8L', 'VP8X'] as const)('WebP %s', (chunk) => {
    expect(readImageSize(webp(chunk, 1234, 567), 'webp')).toEqual({
      width: 1234,
      height: 567,
    });
  });

  it('ảnh cắt cụt hoặc kích thước 0 → null', () => {
    expect(readImageSize(png(800, 600).subarray(0, 20), 'png')).toBeNull();
    expect(readImageSize(png(0, 10), 'png')).toBeNull();
    expect(
      readImageSize(Buffer.from([0xff, 0xd8, 0xff, 0xda]), 'jpeg'),
    ).toBeNull();
    expect(readImageSize(Buffer.alloc(12), 'webp')).toBeNull();
  });
});

describe('isWithinPixelLimit', () => {
  it('đúng bằng giới hạn thì được, hơn 1 điểm ảnh thì không', () => {
    expect(
      isWithinPixelLimit({ width: 5000, height: MAX_IMAGE_PIXELS / 5000 }),
    ).toBe(true);
    expect(
      isWithinPixelLimit({ width: 5000, height: MAX_IMAGE_PIXELS / 5000 + 1 }),
    ).toBe(false);
  });

  it('chặn cạnh quá dài dù ít điểm ảnh', () => {
    expect(isWithinPixelLimit({ width: 10_001, height: 10 })).toBe(false);
  });
});
