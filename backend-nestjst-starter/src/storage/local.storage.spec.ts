import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { DisabledStorage } from './disabled.storage';
import { LocalStorage } from './local.storage';

const UUID = '3f2b8c1e-5d7a-4c0e-9b1a-2e6f4a7d8c90';
// PNG 16x8 tối thiểu để readImageSize đọc được kích thước
const png = Buffer.alloc(33);
Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png, 0);
png.write('IHDR', 12, 'ascii');
png.writeUInt32BE(16, 16);
png.writeUInt32BE(8, 20);

describe('LocalStorage (chỉ cho test/CI/dev offline)', () => {
  let root: string;
  let storage: LocalStorage;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'local-storage-'));
    storage = new LocalStorage({
      rootDir: root,
      publicUrl: 'http://localhost:3000',
    });
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it('upload ghi file <thư mục>/<uuid>.<đuôi>, trả publicId, URL, kích thước', async () => {
    const result = await storage.upload(png, {
      folder: 'products',
      name: UUID,
      type: 'png',
    });
    expect(result).toEqual({
      publicId: `products/${UUID}`,
      secureUrl: `http://localhost:3000/uploads/products/${UUID}.png`,
      width: 16,
      height: 8,
      format: 'png',
      bytes: 33,
    });
    expect(readFileSync(join(root, 'products', `${UUID}.png`))).toEqual(png);
    expect(storage.ownsUrl(result.secureUrl)).toBe(true);
  });

  it('không ghi đè file đã có (overwrite:false)', async () => {
    await storage.upload(png, { folder: 'avatars', name: UUID, type: 'png' });
    await expect(
      storage.upload(png, { folder: 'avatars', name: UUID, type: 'png' }),
    ).rejects.toThrow();
  });

  it('delete: xóa file, lần sau not_found; publicId lạ/traversal bị bỏ qua', async () => {
    await storage.upload(png, { folder: 'products', name: UUID, type: 'png' });
    await expect(storage.delete(`products/${UUID}`)).resolves.toBe('deleted');
    expect(existsSync(join(root, 'products', `${UUID}.png`))).toBe(false);
    await expect(storage.delete(`products/${UUID}`)).resolves.toBe('not_found');
    await expect(storage.delete('../../etc/passwd')).resolves.toBe('not_found');
    await expect(storage.delete('products/../x')).resolves.toBe('not_found');
  });
});

describe('DisabledStorage', () => {
  it('upload trả 503 STORAGE_NOT_CONFIGURED; không bật; không nhận URL nào là của mình', async () => {
    const storage = new DisabledStorage(
      'Thiếu biến môi trường: CLOUDINARY_API_KEY',
    );
    expect(storage.isEnabled()).toBe(false);
    expect(storage.ownsUrl()).toBe(false);
    await expect(storage.upload()).rejects.toMatchObject({
      status: 503,
      response: { code: 'STORAGE_NOT_CONFIGURED' },
    });
  });
});
