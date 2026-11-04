// So sánh gần giống collation utf8mb4_unicode_ci của DB: không phân biệt hoa/thường và dấu.
// "đ" không tách được bằng NFD nên đổi riêng (DB coi "đ" = "d").
export const fold = (text: string) =>
  text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/đ/g, 'd');
