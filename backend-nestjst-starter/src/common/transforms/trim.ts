import { Transform } from 'class-transformer';

// Bỏ khoảng trắng hai đầu; giá trị không phải chuỗi giữ nguyên để validator báo lỗi.
export const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );
