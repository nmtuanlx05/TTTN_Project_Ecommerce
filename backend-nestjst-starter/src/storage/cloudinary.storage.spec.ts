import { Logger } from '@nestjs/common';
import { CloudinaryStorage, type CloudinarySdk } from './cloudinary.storage';

// SDK Cloudinary GIẢ: không gọi mạng. Hành vi thật của SDK (overwrite:false, 'existing', mã lỗi) chưa được kiểm chứng.
function fakeSdk() {
  const end = jest.fn();
  const sdk = {
    config: jest.fn(),
    uploader: {
      upload_stream: jest.fn(),
      destroy: jest.fn(),
    },
  };
  return { sdk, end, typed: sdk as unknown as CloudinarySdk };
}

const OPTIONS = {
  cloudName: 'demo',
  apiKey: 'KEY-123',
  apiSecret: 'SECRET-456',
  folderPrefix: 'mono/dev',
};

describe('CloudinaryStorage', () => {
  let warn: jest.SpyInstance;
  beforeEach(() => {
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });
  afterEach(() => jest.restoreAllMocks());

  it('cấu hình SDK với secure:true một lần, publicId dựng từ tiền tố/thư mục/tên', () => {
    const { sdk, typed } = fakeSdk();
    const storage = new CloudinaryStorage(OPTIONS, typed);
    expect(sdk.config).toHaveBeenCalledWith({
      cloud_name: 'demo',
      api_key: 'KEY-123',
      api_secret: 'SECRET-456',
      secure: true,
    });
    expect(storage.buildPublicId('products', 'abc')).toBe(
      'mono/dev/products/abc',
    );
    expect(storage.isEnabled()).toBe(true);
    expect(
      storage.ownsUrl('https://res.cloudinary.com/demo/image/upload/x.jpg'),
    ).toBe(true);
    expect(
      storage.ownsUrl('https://res.cloudinary.com/other/image/upload/x.jpg'),
    ).toBe(false);
    expect(storage.ownsUrl('https://picsum.photos/x.jpg')).toBe(false);
  });

  it('upload: stream buffer lên với overwrite:false, định dạng cho phép, public_id xác định; trả metadata', async () => {
    const { sdk, end, typed } = fakeSdk();
    sdk.uploader.upload_stream.mockImplementation(
      (_options: unknown, cb: (e: undefined, r: object) => void) => {
        end.mockImplementation(() =>
          cb(undefined, {
            public_id: 'mono/dev/products/abc',
            secure_url:
              'https://res.cloudinary.com/demo/image/upload/v1/mono/dev/products/abc.jpg',
            width: 800,
            height: 600,
            format: 'jpg',
            bytes: 1234,
          }),
        );
        return { end };
      },
    );
    const buffer = Buffer.from('data');
    const result = await new CloudinaryStorage(OPTIONS, typed).upload(buffer, {
      folder: 'products',
      name: 'abc',
      type: 'jpeg',
    });

    const [uploadOptions] = sdk.uploader.upload_stream.mock.calls[0] as [
      object,
    ];
    expect(uploadOptions).toEqual({
      public_id: 'mono/dev/products/abc',
      resource_type: 'image',
      overwrite: false,
      unique_filename: false,
      use_filename: false,
      allowed_formats: ['jpg', 'png', 'webp'],
    });
    expect(end).toHaveBeenCalledWith(buffer);
    expect(result).toEqual({
      publicId: 'mono/dev/products/abc',
      secureUrl:
        'https://res.cloudinary.com/demo/image/upload/v1/mono/dev/products/abc.jpg',
      width: 800,
      height: 600,
      format: 'jpg',
      bytes: 1234,
    });
  });

  it('upload lỗi → 502 STORAGE_UPLOAD_FAILED, log không chứa khóa', async () => {
    const { sdk, end, typed } = fakeSdk();
    sdk.uploader.upload_stream.mockImplementation(
      (_o: unknown, cb: (e: object) => void) => {
        end.mockImplementation(() =>
          cb({ message: 'Invalid image', http_code: 400 }),
        );
        return { end };
      },
    );
    const promise = new CloudinaryStorage(OPTIONS, typed).upload(
      Buffer.alloc(1),
      {
        folder: 'avatars',
        name: 'x',
        type: 'png',
      },
    );
    await expect(promise).rejects.toMatchObject({
      response: { code: 'STORAGE_UPLOAD_FAILED' },
      status: 502,
    });
    const logged = JSON.stringify(warn.mock.calls);
    expect(logged).toContain('Invalid image');
    expect(logged).not.toContain('SECRET-456');
    expect(logged).not.toContain('KEY-123');
  });

  it.each([420, 429])(
    'http %i (hết hạn mức) → thông báo quá tải',
    async (http_code) => {
      const { sdk, end, typed } = fakeSdk();
      sdk.uploader.upload_stream.mockImplementation(
        (_o: unknown, cb: (e: object) => void) => {
          end.mockImplementation(() =>
            cb({ message: 'Rate limit', http_code }),
          );
          return { end };
        },
      );
      await expect(
        new CloudinaryStorage(OPTIONS, typed).upload(Buffer.alloc(1), {
          folder: 'avatars',
          name: 'x',
          type: 'png',
        }),
      ).rejects.toMatchObject({
        response: {
          message: 'Dịch vụ lưu trữ ảnh đang quá tải, vui lòng thử lại sau',
        },
      });
    },
  );

  it('delete: ok → deleted, not found → not_found (idempotent), kết quả lạ → ném lỗi', async () => {
    const { sdk, typed } = fakeSdk();
    const storage = new CloudinaryStorage(OPTIONS, typed);
    sdk.uploader.destroy.mockResolvedValueOnce({ result: 'ok' });
    await expect(storage.delete('a/b')).resolves.toBe('deleted');
    expect(sdk.uploader.destroy).toHaveBeenCalledWith('a/b', {
      resource_type: 'image',
      invalidate: true,
    });
    sdk.uploader.destroy.mockResolvedValueOnce({ result: 'not found' });
    await expect(storage.delete('a/b')).resolves.toBe('not_found');
    sdk.uploader.destroy.mockResolvedValueOnce({ result: 'error' });
    await expect(storage.delete('a/b')).rejects.toThrow();
  });
});
