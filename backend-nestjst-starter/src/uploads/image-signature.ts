export type ImageType = 'jpeg' | 'png' | 'webp';

// Mimetype client tự khai báo; chỉ dùng để chặn sớm, việc xác thực thật dựa vào chữ ký byte.
export const ALLOWED_MIME_TYPES: ReadonlySet<string> = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

// Nhận diện loại ảnh bằng magic bytes: JPEG FFD8FF, PNG 89504E470D0A1A0A, WebP "RIFF"....."WEBP".
export function detectImageType(head: Buffer): ImageType | null {
  if (
    head.length >= 3 &&
    head[0] === 0xff &&
    head[1] === 0xd8 &&
    head[2] === 0xff
  ) {
    return 'jpeg';
  }
  if (
    head.length >= PNG_SIGNATURE.length &&
    head.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)
  ) {
    return 'png';
  }
  if (
    head.length >= 12 &&
    head.toString('ascii', 0, 4) === 'RIFF' &&
    head.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
}
