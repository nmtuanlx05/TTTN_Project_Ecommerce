import { Transform } from 'class-transformer';

// Bỏ khoảng trắng hai đầu; chuỗi rỗng sau khi trim đổi thành null (nghĩa là "xóa giá trị").
// Giá trị không phải chuỗi giữ nguyên để validator báo lỗi.
export const TrimToNull = () =>
  Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') {
      return value;
    }
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  });
