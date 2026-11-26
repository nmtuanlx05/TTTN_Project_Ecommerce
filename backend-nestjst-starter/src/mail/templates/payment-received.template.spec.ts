import { FREE_SHIPPING_THRESHOLD } from '../../orders/orders.constants';
import {
  type PaymentReceivedInput,
  renderPaymentReceived,
} from './payment-received.template';

const BASE: PaymentReceivedInput = {
  code: 'MS-261126-AB12',
  customerName: 'Nguyễn Văn A',
  items: [
    {
      productName: 'Áo sơ mi linen',
      size: 'M',
      color: 'Trắng',
      quantity: 2,
      price: 350_000,
      imageUrl:
        'https://res.cloudinary.com/demo/image/upload/v1/mono-studio/ao.jpg',
    },
    {
      productName: 'Quần tây ống đứng',
      size: '30',
      color: 'Đen',
      quantity: 1,
      price: 450_000,
    },
  ],
  subtotal: 1_150_000,
  discountAmount: 115_000,
  voucherCode: 'MONO10',
  shippingFee: 0,
  totalAmount: 1_035_000,
  paidAt: new Date('2026-11-26T16:59:00Z'), // 26/11/2026 23:59 giờ VN
  frontendUrl: 'http://localhost:5173',
  freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
};

const render = (overrides: Partial<PaymentReceivedInput> = {}) =>
  renderPaymentReceived({ ...BASE, ...overrides });

const FORBIDDEN = [
  'dự kiến',
  'vận đơn',
  'đổi trả',
  'hoàn tiền',
  'xuất hóa đơn',
  'gửi hóa đơn',
  'trả lời email',
  'cần hỗ trợ',
  'hỗ trợ',
  '1–2 ngày',
  '1-2 ngày',
  '1&ndash;2',
  'email tiếp theo',
  'xem trên trình duyệt',
  'quà tặng',
  'phụ kiện',
  'tự hủy',
  'mã giao dịch',
  'số tài khoản',
  'tiền thừa',
];

describe('renderPaymentReceived', () => {
  it('subject theo mã đơn', () => {
    expect(render().subject).toBe(
      'MONO STUDIO · Đã nhận thanh toán cho đơn hàng #MS-261126-AB12',
    );
  });

  it('preheader có số tiền và mã đơn', () => {
    expect(render().html).toContain(
      'Đã nhận thanh toán 1.035.000₫ cho đơn hàng #MS-261126-AB12.',
    );
  });

  describe('lời chào và câu trạng thái', () => {
    it('có tên', () => {
      const { html, text } = render();
      expect(html).toContain('Cảm ơn Nguyễn Văn A!');
      expect(text).toContain('Cảm ơn Nguyễn Văn A!');
    });

    it.each([[''], ['  '], [null], [undefined]])(
      'tên rỗng (%p) => "bạn"',
      (name) => {
        expect(render({ customerName: name }).html).toContain('Cảm ơn bạn!');
      },
    );

    it('nói đúng việc tiếp theo: chờ cửa hàng xác nhận (không hứa thời gian)', () => {
      const { html, text } = render();
      expect(html).toContain('Đơn hàng đang chờ cửa hàng xác nhận.');
      expect(text).toContain('Đơn hàng đang chờ cửa hàng xác nhận.');
    });
  });

  it('số tiền đã thanh toán = totalAmount đã lưu (không phải số tiền khách chuyển)', () => {
    const { html, text } = render({ totalAmount: 999_000 });
    expect(html).toContain('999.000₫');
    expect(text).toContain('Số tiền đã thanh toán: 999.000₫');
  });

  it('chi tiết giao dịch: chỉ mã đơn, phương thức, thời gian (paidAt giờ VN)', () => {
    const { html, text } = render();
    expect(html).toContain('Chi tiết giao dịch');
    expect(html).toContain('Mã đơn hàng');
    expect(html).toContain('Chuyển khoản QR ngân hàng');
    expect(html).toContain('26/11/2026 23:59');
    expect(text).toContain('Phương thức: Chuyển khoản QR ngân hàng');
    expect(text).toContain('Thời gian: 26/11/2026 23:59');
  });

  it('tóm tắt đơn: dòng hàng gọn, tạm tính, giảm giá kèm mã, "Miễn phí", đã thanh toán', () => {
    const { html, text } = render();
    expect(html).toContain('Áo sơ mi linen');
    expect(html).toContain('M / Trắng &times; 2');
    expect(html).toContain('700.000₫');
    expect(html).toContain('Giảm giá (MONO10)');
    expect(html).toContain('Miễn phí');
    expect(text).toContain('- Áo sơ mi linen (M / Trắng) x 2: 700.000₫');
    expect(text).toContain('Vận chuyển: Miễn phí');
    expect(text).toContain('Đã thanh toán: 1.035.000₫');
  });

  it('không có ảnh sản phẩm (đúng thiết kế thư này)', () => {
    expect(render().html).not.toContain('<img');
  });

  it('giữ câu "không phải hóa đơn VAT"', () => {
    expect(render().html).toContain(
      'Email này là xác nhận thanh toán, không phải hóa đơn VAT.',
    );
  });

  it('nút "Xem đơn hàng" trỏ đúng đơn; không có link thanh toán', () => {
    const { html } = render();
    expect(html).toContain(
      'href="http://localhost:5173/tai-khoan/don-hang/MS-261126-AB12"',
    );
    expect(html).not.toContain('thanh-toan-online');
  });

  it('escape mọi giá trị chèn vào HTML', () => {
    const { html } = render({
      customerName: '<b>A</b>',
      voucherCode: '"><script>x</script>',
      items: [
        {
          productName: '<script>alert(1)</script>',
          size: '"S"',
          color: 'Đỏ',
          quantity: 1,
          price: 1,
        },
      ],
    });
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>A</b>');
    expect(html).not.toContain('"S"');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&lt;b&gt;A&lt;/b&gt;');
    expect(html).toContain('&quot;&gt;&lt;script&gt;x&lt;/script&gt;');
  });

  it('FRONTEND_URL javascript: => ném lỗi', () => {
    expect(() => render({ frontendUrl: 'javascript:alert(1)' })).toThrow();
  });

  it('không còn "{{", không comment HTML, không có câu hứa/phần đã bỏ', () => {
    const { html, text } = render();
    expect(html).not.toContain('{{');
    expect(text).not.toContain('{{');
    expect(html).not.toContain('<!--');
    for (const body of [html.toLowerCase(), text.toLowerCase()]) {
      for (const phrase of FORBIDDEN) {
        expect({ phrase, found: body.includes(phrase) }).toEqual({
          phrase,
          found: false,
        });
      }
    }
  });

  it('HTML < 100KB với 50 dòng hàng', () => {
    const items = Array.from({ length: 50 }, (_, i) => ({
      productName: `Áo thun cotton dáng rộng số ${i + 1}`,
      size: 'XL',
      color: 'Xanh rêu',
      quantity: 10,
      price: 1_250_000,
    }));
    const { html } = render({ items });
    expect(Buffer.byteLength(html, 'utf8')).toBeLessThan(100 * 1024);
  });

  it('bản text có mã đơn và tổng tiền, không thẻ HTML', () => {
    const { text } = render();
    expect(text).toContain('MS-261126-AB12');
    expect(text).toContain('1.035.000₫');
    expect(text).not.toMatch(/<[a-z]/i);
  });
});
