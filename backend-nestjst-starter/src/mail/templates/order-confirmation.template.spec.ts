import { FREE_SHIPPING_THRESHOLD } from '../../orders/orders.constants';
import {
  type OrderConfirmationInput,
  renderOrderConfirmation,
} from './order-confirmation.template';
import { formatVnd } from './mail-format';

const CLOUD_IMG =
  'https://res.cloudinary.com/demo/image/upload/v1712345678/mono-studio/development/products/ao.jpg';

const BASE: OrderConfirmationInput = {
  code: 'MS-261126-AB12',
  createdAt: new Date('2026-11-26T07:30:00Z'), // 26/11/2026 14:30 giờ VN
  customerName: 'Nguyễn Văn A',
  wardName: 'Phường Bến Nghé',
  districtName: 'Quận 1',
  provinceName: 'Thành phố Hồ Chí Minh',
  items: [
    {
      productName: 'Áo sơ mi linen',
      size: 'M',
      color: 'Trắng',
      quantity: 2,
      price: 350_000,
      imageUrl: CLOUD_IMG,
    },
    {
      productName: 'Quần tây ống đứng',
      size: '30',
      color: 'Đen',
      quantity: 1,
      price: 450_000,
      imageUrl: null,
    },
  ],
  subtotal: 1_150_000,
  discountAmount: 115_000,
  voucherCode: 'MONO10',
  shippingFee: 0,
  totalAmount: 1_035_000,
  frontendUrl: 'http://localhost:5173/',
  freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
  payment: { kind: 'COD' },
};

const PENDING: OrderConfirmationInput['payment'] = {
  kind: 'ONLINE_PENDING',
  expiresAt: new Date('2026-11-27T07:30:00Z'), // 27/11/2026 14:30 giờ VN
};

const render = (overrides: Partial<OrderConfirmationInput> = {}) =>
  renderOrderConfirmation({ ...BASE, ...overrides });

// Cụm câu hứa điều hệ thống KHÔNG làm, hoặc phần đã bỏ khỏi thiết kế
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
  'số tài khoản',
];

describe('renderOrderConfirmation', () => {
  it('subject theo mã đơn', () => {
    expect(render().subject).toBe(
      'MONO STUDIO · Đơn hàng #MS-261126-AB12 đã được ghi nhận',
    );
  });

  it('subject bỏ ký tự xuống dòng trong mã (chống chèn header)', () => {
    expect(render({ code: 'MS-1\r\nBcc: x' }).subject).not.toMatch(/[\r\n]/);
  });

  it('preheader có mã đơn và tổng cộng', () => {
    expect(render().html).toContain(
      'Đơn hàng #MS-261126-AB12 đã được ghi nhận — tổng cộng 1.035.000₫.',
    );
  });

  describe('lời chào', () => {
    it('có tên người nhận', () => {
      const mail = render();
      expect(mail.html).toContain('Chào Nguyễn Văn A,');
      expect(mail.text).toContain('Chào Nguyễn Văn A,');
    });

    it.each([[''], ['   '], [null], [undefined]])(
      'tên rỗng (%p) => "bạn"',
      (name) => {
        const mail = render({ customerName: name });
        expect(mail.html).toContain('Chào bạn,');
        expect(mail.text).toContain('Chào bạn,');
      },
    );
  });

  it('mã đơn và ngày đặt (dd/MM/yyyy HH:mm giờ VN); không có ô "Dự kiến giao"', () => {
    const { html, text } = render();
    expect(html).toContain('#MS-261126-AB12');
    expect(html).toContain('26/11/2026 14:30');
    expect(text).toContain('Ngày đặt: 26/11/2026 14:30');
    expect(html).not.toContain('Dự kiến giao');
  });

  describe('thanh toán theo phương thức', () => {
    it('COD: "Thanh toán khi nhận hàng", không khung chờ thanh toán, không link thanh toán', () => {
      const { html, text } = render();
      expect(html).toContain('Thanh toán khi nhận hàng');
      expect(text).toContain('Thanh toán: Thanh toán khi nhận hàng');
      for (const body of [html, text]) {
        expect(body).not.toContain('thanh-toan-online');
        expect(body).not.toContain('Thanh toán ngay');
        expect(body).not.toContain('tự hủy');
        expect(body).not.toContain('Đã thanh toán');
        expect(body).not.toContain('Chuyển khoản QR ngân hàng');
      }
    });

    it('ONLINE_PENDING: hạn theo giờ VN, quá hạn tự hủy, link "Thanh toán ngay"', () => {
      const { html, text } = render({ payment: PENDING });
      const payUrl = 'http://localhost:5173/thanh-toan-online/MS-261126-AB12';
      expect(html).toContain('Chuyển khoản QR ngân hàng');
      expect(html).toContain('Đơn hàng đang chờ thanh toán.');
      expect(html).toContain(
        'Vui lòng chuyển khoản trước 27/11/2026 14:30. Quá hạn, đơn sẽ tự hủy.',
      );
      expect(html).toContain(`href="${payUrl}"`);
      expect(html).toContain('Thanh toán ngay');
      expect(text).toContain(
        'Vui lòng chuyển khoản trước 27/11/2026 14:30. Quá hạn, đơn sẽ tự hủy.',
      );
      expect(text).toContain(`Thanh toán ngay: ${payUrl}`);
      expect(html).not.toContain('Đã thanh toán');
    });

    it('ONLINE_PAID: ghi "Đã thanh toán", không link, không hạn, không "tự hủy"', () => {
      const { html, text } = render({ payment: { kind: 'ONLINE_PAID' } });
      expect(html).toContain('Chuyển khoản QR ngân hàng');
      expect(html).toContain('Đã thanh toán');
      expect(text).toContain('Đã thanh toán');
      for (const body of [html, text]) {
        expect(body).not.toContain('thanh-toan-online');
        expect(body).not.toContain('Thanh toán ngay');
        expect(body).not.toContain('tự hủy');
        expect(body).not.toContain('chuyển khoản trước');
        expect(body).not.toContain('đang chờ thanh toán');
      }
    });

    it('ba biến thể cho ra ba HTML khác nhau', () => {
      const cod = render().html;
      const pending = render({ payment: PENDING }).html;
      const paid = render({ payment: { kind: 'ONLINE_PAID' } }).html;
      expect(new Set([cod, pending, paid]).size).toBe(3);
    });
  });

  describe('tiền (dùng giá trị đã lưu, không tính lại)', () => {
    it('tạm tính, giảm giá kèm mã, vận chuyển 0 => "Miễn phí", tổng cộng', () => {
      const { html, text } = render();
      expect(html).toContain('1.150.000₫');
      expect(html).toContain('Giảm giá (MONO10)');
      expect(html).toContain('-115.000₫');
      expect(html).toContain('Miễn phí');
      expect(html).toContain('1.035.000₫');
      expect(text).toContain('Tạm tính: 1.150.000₫');
      expect(text).toContain('Giảm giá (MONO10): -115.000₫');
      expect(text).toContain('Vận chuyển: Miễn phí');
      expect(text).toContain('Tổng cộng: 1.035.000₫');
    });

    it('phí ship khác 0 ghi số tiền', () => {
      const { text } = render({ shippingFee: 30_000 });
      expect(text).toContain('Vận chuyển: 30.000₫');
    });

    it('không giảm giá => không có dòng giảm giá', () => {
      const { html, text } = render({ discountAmount: 0, voucherCode: null });
      expect(html).not.toContain('Giảm giá');
      expect(text).not.toContain('Giảm giá');
    });

    it('tổng cộng là totalAmount ĐÃ LƯU (kể cả khi không khớp phép tính)', () => {
      const { html, text } = render({ totalAmount: 123_456 });
      expect(html).toContain('123.456₫');
      expect(text).toContain('Tổng cộng: 123.456₫');
    });

    it('thành tiền dòng = đơn giá × số lượng, kèm "size / màu · Số lượng"', () => {
      const { html, text } = render();
      expect(html).toContain('700.000₫');
      expect(html).toContain('M / Trắng &nbsp;&middot;&nbsp; Số lượng: 2');
      expect(text).toContain('- Áo sơ mi linen (M / Trắng) x 2: 700.000₫');
    });
  });

  describe('giao hàng tới: tên + địa chỉ rút gọn, không dữ liệu nhạy cảm', () => {
    it('đủ ba cấp', () => {
      const { html, text } = render();
      expect(html).toContain('Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh');
      expect(text).toContain(
        'Giao hàng tới: Nguyễn Văn A, Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh',
      );
    });

    it('huyện đảo không có phường/xã', () => {
      const { html } = render({
        wardName: null,
        districtName: 'Huyện Côn Đảo',
        provinceName: 'Tỉnh Bà Rịa - Vũng Tàu',
      });
      expect(html).toContain('Huyện Côn Đảo, Tỉnh Bà Rịa - Vũng Tàu');
    });

    it('districtName null vẫn đúng (bỏ cấp trống, không dấu phẩy thừa)', () => {
      const { html, text } = render({ districtName: null });
      expect(html).toContain('Phường Bến Nghé, Thành phố Hồ Chí Minh');
      expect(html).not.toContain(', ,');
      expect(text).toContain(
        'Giao hàng tới: Nguyễn Văn A, Phường Bến Nghé, Thành phố Hồ Chí Minh',
      );
    });

    it('không có cấp nào => chỉ tên người nhận', () => {
      const { text } = render({
        wardName: null,
        districtName: '',
        provinceName: null,
      });
      expect(text).toContain('Giao hàng tới: Nguyễn Văn A\n');
    });

    it('không lộ SĐT, số nhà, ghi chú, email dù nơi gọi lỡ truyền cả đơn', () => {
      const leaky = {
        ...BASE,
        customerPhone: '0912345678',
        addressLine: '12 Ngõ Bí Mật',
        shippingAddress: '12 Ngõ Bí Mật, Phường Bến Nghé',
        note: 'Giao giờ hành chính',
        customerEmail: 'khach@example.com',
      } as OrderConfirmationInput;
      const { html, text } = renderOrderConfirmation(leaky);
      for (const body of [html, text]) {
        expect(body).not.toContain('0912345678');
        expect(body).not.toContain('Ngõ Bí Mật');
        expect(body).not.toContain('Giao giờ hành chính');
        expect(body).not.toContain('khach@example.com');
      }
    });
  });

  describe('ảnh sản phẩm', () => {
    it('ảnh Cloudinary: biến đổi JPG 168x210, alt là tên sản phẩm', () => {
      const { html } = render();
      expect(html).toContain(
        'src="https://res.cloudinary.com/demo/image/upload/f_jpg,q_auto,c_fill,w_168,h_210/v1712345678/mono-studio/development/products/ao.jpg"',
      );
      expect(html).toContain('alt="Áo sơ mi linen"');
    });

    it('dòng thiếu ảnh hoặc ảnh không hợp lệ: không có thẻ <img>, vẫn có tên và thành tiền', () => {
      const items = BASE.items.map((item) => ({
        ...item,
        imageUrl: 'javascript:alert(1)',
      }));
      const { html } = render({ items });
      expect(html).not.toContain('<img');
      expect(html).not.toContain('javascript:');
      expect(html).toContain('Áo sơ mi linen');
      expect(html).toContain('700.000₫');
      expect(html).toContain('Quần tây ống đứng');
    });

    it('số thẻ <img> bằng số dòng có ảnh hợp lệ', () => {
      const { html } = render();
      expect(html.match(/<img /g)).toHaveLength(1);
    });

    it('ảnh http (không phải https) bị bỏ', () => {
      const items = [
        { ...BASE.items[0], imageUrl: 'http://example.com/a.jpg' },
      ];
      expect(render({ items }).html).not.toContain('<img');
    });
  });

  describe('liên kết', () => {
    it('nút "Xem đơn hàng" và menu chân thư dựng từ FRONTEND_URL', () => {
      const { html, text } = render();
      expect(html).toContain(
        'href="http://localhost:5173/tai-khoan/don-hang/MS-261126-AB12"',
      );
      expect(html).toContain('Xem đơn hàng');
      expect(html).toContain('href="http://localhost:5173/products"');
      expect(html).toContain('href="http://localhost:5173/tai-khoan/don-hang"');
      expect(text).toContain(
        'Xem đơn hàng: http://localhost:5173/tai-khoan/don-hang/MS-261126-AB12',
      );
    });

    it.each([['javascript:alert(1)'], ['ftp://shop.example'], ['']])(
      'FRONTEND_URL không phải http/https (%p) => ném lỗi, không dựng thư',
      (frontendUrl) => {
        expect(() => render({ frontendUrl })).toThrow();
      },
    );
  });

  describe('escape mọi giá trị chèn vào HTML', () => {
    const evil = {
      customerName: '<b>Khách</b> "A"',
      voucherCode: '"><img src=x onerror=alert(1)>',
      items: [
        {
          productName: '<script>alert(1)</script>',
          size: '"M"',
          color: "Đen'",
          quantity: 1,
          price: 100_000,
          imageUrl: null,
        },
      ],
      wardName: '<i>Phường</i>',
    };

    it('không còn thẻ/thuộc tính do dữ liệu chèn vào', () => {
      const { html } = render(evil);
      expect(html).not.toContain('<script>');
      expect(html).not.toContain('<b>Khách');
      expect(html).not.toContain('<i>Phường');
      expect(html).not.toContain('"><img');
      expect(html).not.toContain('"M"');
      expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
      expect(html).toContain('&lt;b&gt;Khách&lt;/b&gt; &quot;A&quot;');
      expect(html).toContain('&quot;&gt;&lt;img src=x onerror=alert(1)&gt;');
      expect(html).toContain('&quot;M&quot; / Đen&#39;');
      expect(html).toContain('&lt;i&gt;Phường&lt;/i&gt;');
    });

    it('alt của ảnh cũng được escape', () => {
      const { html } = render({
        items: [{ ...BASE.items[0], productName: 'Áo "đẹp" <x>' }],
      });
      expect(html).toContain('alt="Áo &quot;đẹp&quot; &lt;x&gt;"');
    });
  });

  it('thanh trên cùng lấy ngưỡng miễn phí ship từ hằng số; null thì bỏ', () => {
    expect(render().html).toContain(
      `Miễn phí vận chuyển từ ${formatVnd(FREE_SHIPPING_THRESHOLD)}`,
    );
    expect(render({ freeShippingThreshold: null }).html).not.toContain(
      'Miễn phí vận chuyển từ',
    );
  });

  it('không còn cú pháp mẫu "{{" và không có comment HTML', () => {
    for (const payment of [BASE.payment, PENDING, { kind: 'ONLINE_PAID' }]) {
      const { html, text } = render({
        payment: payment as OrderConfirmationInput['payment'],
      });
      expect(html).not.toContain('{{');
      expect(text).not.toContain('{{');
      expect(html).not.toContain('<!--');
    }
  });

  it('không có câu hứa/phần đã bỏ ở cả ba biến thể (html và text)', () => {
    for (const payment of [BASE.payment, PENDING, { kind: 'ONLINE_PAID' }]) {
      const { html, text } = render({
        payment: payment as OrderConfirmationInput['payment'],
      });
      for (const body of [html.toLowerCase(), text.toLowerCase()]) {
        for (const phrase of FORBIDDEN) {
          expect({ phrase, found: body.includes(phrase) }).toEqual({
            phrase,
            found: false,
          });
        }
      }
    }
  });

  it('HTML < 100KB với 50 dòng hàng có ảnh', () => {
    const items = Array.from({ length: 50 }, (_, i) => ({
      productName: `Áo thun cotton dáng rộng số ${i + 1}`,
      size: 'XL',
      color: 'Xanh rêu',
      quantity: 10,
      price: 1_250_000,
      imageUrl: `https://res.cloudinary.com/demo/image/upload/v1712345678/mono-studio/production/products/ao-${i}.jpg`,
    }));
    const { html } = render({ items, payment: PENDING });
    expect(Buffer.byteLength(html, 'utf8')).toBeLessThan(100 * 1024);
  });

  it('bản text có mã đơn, tổng tiền và không có thẻ HTML', () => {
    const { text } = render({ payment: PENDING });
    expect(text).toContain('MS-261126-AB12');
    expect(text).toContain('1.035.000₫');
    expect(text).not.toMatch(/<[a-z]/i);
  });
});
