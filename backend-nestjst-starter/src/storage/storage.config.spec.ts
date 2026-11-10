import {
  defaultFolderPrefix,
  readStorageConfig,
  validateStorageDriver,
} from './storage.config';

const env = (values: Record<string, string>) => (key: string) => values[key];
const FULL = {
  CLOUDINARY_CLOUD_NAME: 'demo',
  CLOUDINARY_API_KEY: 'key',
  CLOUDINARY_API_SECRET: 'secret',
};

describe('readStorageConfig', () => {
  it('đủ biến → cloudinary, thư mục mặc định theo NODE_ENV', () => {
    expect(readStorageConfig(env(FULL), 'production')).toEqual({
      driver: 'cloudinary',
      cloudName: 'demo',
      apiKey: 'key',
      apiSecret: 'secret',
      folderPrefix: 'mono-studio/production',
    });
    expect(defaultFolderPrefix(undefined)).toBe('mono-studio/development');
  });

  it('CLOUDINARY_FOLDER_PREFIX tùy chọn được dùng', () => {
    const config = readStorageConfig(
      env({ ...FULL, CLOUDINARY_FOLDER_PREFIX: 'shop-dev/img' }),
    );
    expect(config).toMatchObject({ folderPrefix: 'shop-dev/img' });
  });

  it.each(['/lead', 'trail/', 'a//b', 'có dấu', '../x'])(
    'tiền tố thư mục sai %p → tắt, lý do chỉ nêu tên biến',
    (CLOUDINARY_FOLDER_PREFIX) => {
      const config = readStorageConfig(
        env({ ...FULL, CLOUDINARY_FOLDER_PREFIX }),
      );
      expect(config).toMatchObject({ driver: 'disabled' });
      expect(JSON.stringify(config)).toContain('CLOUDINARY_FOLDER_PREFIX');
    },
  );

  it('thiếu biến → tắt, liệt kê TÊN biến thiếu và không lộ giá trị nào', () => {
    const config = readStorageConfig(
      env({
        CLOUDINARY_CLOUD_NAME: 'demo',
        CLOUDINARY_API_SECRET: 'super-secret',
      }),
    );
    expect(config).toEqual({
      driver: 'disabled',
      reason: 'Thiếu biến môi trường: CLOUDINARY_API_KEY',
    });
    expect(JSON.stringify(config)).not.toContain('super-secret');
  });

  it('không cấu hình gì → mặc định cloudinary nên bị tắt (không throw)', () => {
    expect(readStorageConfig(env({}))).toMatchObject({ driver: 'disabled' });
  });

  it('STORAGE_DRIVER=local', () => {
    expect(readStorageConfig(env({ STORAGE_DRIVER: 'local' }))).toEqual({
      driver: 'local',
    });
  });

  it('STORAGE_DRIVER lạ → tắt thay vì throw', () => {
    expect(readStorageConfig(env({ STORAGE_DRIVER: 's3' }))).toMatchObject({
      driver: 'disabled',
    });
  });
});

describe('validateStorageDriver', () => {
  it.each([undefined, '', '  ', 'cloudinary', 'local'])('%p hợp lệ', (v) => {
    expect(validateStorageDriver(v)).toBeNull();
  });
  it('giá trị khác → thông báo tiếng Việt', () => {
    expect(validateStorageDriver('s3')).toMatch(/STORAGE_DRIVER/);
  });
});
