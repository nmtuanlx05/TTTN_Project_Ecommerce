import type { ImageType } from './image-signature';

export interface ImageSize {
  width: number;
  height: number;
}

// Giới hạn số điểm ảnh nhận vào (25 triệu = 25 MP, khớp mức tối đa ảnh đầu vào của gói Cloudinary miễn phí; chưa kiểm chứng,
// xem docs/cloudinary-setup.md) và cạnh dài nhất. Chặn ảnh "bom giải nén" trước khi gửi đi.
export const MAX_IMAGE_PIXELS = 25_000_000;
export const MAX_IMAGE_SIDE = 10_000;

function jpegSize(buf: Buffer): ImageSize | null {
  let i = 2;
  while (i + 3 < buf.length) {
    if (buf[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = buf[i + 1];
    if (marker === 0xff) {
      i += 1; // byte đệm
      continue;
    }
    // Marker không có phần độ dài: SOI, TEM, RSTn
    if (
      marker === 0xd8 ||
      marker === 0x01 ||
      (marker >= 0xd0 && marker <= 0xd7)
    ) {
      i += 2;
      continue;
    }
    // EOI hoặc SOS: SOF luôn nằm trước SOS, tới đây mà chưa thấy thì ảnh hỏng
    if (marker === 0xd9 || marker === 0xda) return null;
    const length = buf.readUInt16BE(i + 2);
    const isSof =
      marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isSof) {
      if (i + 9 > buf.length) return null;
      return {
        height: buf.readUInt16BE(i + 5),
        width: buf.readUInt16BE(i + 7),
      };
    }
    if (length < 2) return null;
    i += 2 + length;
  }
  return null;
}

function pngSize(buf: Buffer): ImageSize | null {
  if (buf.length < 24 || buf.toString('ascii', 12, 16) !== 'IHDR') return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function webpSize(buf: Buffer): ImageSize | null {
  if (buf.length < 30) return null;
  const chunk = buf.toString('ascii', 12, 16);
  if (chunk === 'VP8 ') {
    // Khung lossy: mã khởi đầu 9D 01 2A rồi hai số 14 bit little-endian
    if (buf[23] !== 0x9d || buf[24] !== 0x01 || buf[25] !== 0x2a) return null;
    return {
      width: buf.readUInt16LE(26) & 0x3fff,
      height: buf.readUInt16LE(28) & 0x3fff,
    };
  }
  if (chunk === 'VP8L') {
    if (buf[20] !== 0x2f) return null;
    const width = 1 + (buf[21] | ((buf[22] & 0x3f) << 8));
    const height =
      1 + ((buf[22] >> 6) | (buf[23] << 2) | ((buf[24] & 0x0f) << 10));
    return { width, height };
  }
  if (chunk === 'VP8X') {
    return {
      width: 1 + buf.readUIntLE(24, 3),
      height: 1 + buf.readUIntLE(27, 3),
    };
  }
  return null;
}

// Đọc kích thước từ phần đầu file (không giải mã ảnh). null = không đọc được (ảnh hỏng/cắt cụt) hoặc kích thước 0.
export function readImageSize(buf: Buffer, type: ImageType): ImageSize | null {
  const size =
    type === 'jpeg'
      ? jpegSize(buf)
      : type === 'png'
        ? pngSize(buf)
        : webpSize(buf);
  return size && size.width > 0 && size.height > 0 ? size : null;
}

export function isWithinPixelLimit({ width, height }: ImageSize): boolean {
  return (
    width * height <= MAX_IMAGE_PIXELS &&
    Math.max(width, height) <= MAX_IMAGE_SIDE
  );
}
