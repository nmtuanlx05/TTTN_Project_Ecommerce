import { Transform } from 'class-transformer';

// Chuẩn hóa email: bỏ khoảng trắng hai đầu và chuyển về chữ thường.
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

// Dùng cho DTO có trường email; giá trị không phải chuỗi giữ nguyên để IsEmail báo lỗi.
export const NormalizeEmail = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeEmail(value) : value,
  );
