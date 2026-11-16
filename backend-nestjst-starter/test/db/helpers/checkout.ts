import request from 'supertest';
import type { TestApp } from './app';

// Mã tỉnh/quận/phường lấy từ dữ liệu địa chỉ thật của ứng dụng (TP.HCM, Quận 1...), COD để không cần cấu hình VietQR.
export const VALID_ORDER_BODY = {
  receiverName: 'Nguyễn Văn A',
  phone: '0912345678',
  provinceCode: '79',
  districtCode: '760',
  wardCode: '26734',
  addressLine: '12 Lê Lợi',
  paymentMethod: 'COD',
};

export interface HttpResult {
  status: number;
  body: {
    success?: boolean;
    code?: string;
    message?: string;
    data?: { id?: number; code?: string };
  };
}

// POST /orders cho một người dùng qua HTTP thật. Không ném lỗi khi 4xx/5xx: test cần ĐẾM từng loại phản hồi.
export async function postOrder(
  testApp: TestApp,
  userId: number,
  options: { voucherCode?: string; idempotencyKey?: string } = {},
): Promise<HttpResult> {
  const call = request(testApp.baseUrl)
    .post('/orders')
    .set('Authorization', `Bearer ${testApp.tokenFor(userId)}`);
  if (options.idempotencyKey) {
    call.set('Idempotency-Key', options.idempotencyKey);
  }
  const res = await call.send({
    ...VALID_ORDER_BODY,
    ...(options.voucherCode && { voucherCode: options.voucherCode }),
  });
  return { status: res.status, body: res.body as HttpResult['body'] };
}

// Gom phản hồi thành bảng đếm "mã HTTP[:mã lỗi]" -> số lượng, ví dụ { '201': 5, '409:CART_ITEMS_UNAVAILABLE': 20 }.
// So sánh nguyên bảng này giúp thông báo lỗi của test cho thấy ngay có phản hồi lạ (500, SYSTEM_BUSY...) hay không.
export function tally(results: HttpResult[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const { status, body } of results) {
    const key =
      status >= 400 ? `${status}:${body.code ?? 'no-code'}` : `${status}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}
