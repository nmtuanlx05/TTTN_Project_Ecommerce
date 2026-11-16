// So sánh không phân biệt hoa/thường và dấu, giống collation utf8mb4_unicode_ci của DB.
// RIÊNG "đ": đã đo trên MySQL thật, utf8mb4_unicode_ci KHÔNG coi "đ" = "d" (test/db/constraints.db-spec.ts).
// Hàm này CỐ Ý đổi "đ" thành "d" (NFD không tách được "đ" nên phải đổi riêng) để chặt hơn DB ở tầng service:
// "Đen" và "Den" được coi là cùng một màu, còn ràng buộc duy nhất của DB thì không chặn cặp này.
export const fold = (text: string) =>
  text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/đ/g, 'd');
