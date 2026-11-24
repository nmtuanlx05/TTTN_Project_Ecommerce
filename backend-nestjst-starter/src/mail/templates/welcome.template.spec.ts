import { FREE_SHIPPING_THRESHOLD } from '../../orders/orders.constants';
import {
  renderWelcome,
  WELCOME_SUBJECT,
  type WelcomeInput,
  type WelcomeVoucher,
} from './welcome.template';

const MONO10: WelcomeVoucher = {
  code: 'MONO10',
  discountType: 'PERCENT',
  discountValue: 10,
  maxDiscount: 100_000,
  minOrderValue: 300_000,
  expiresAt: new Date('2027-06-30T23:59:59+07:00'),
};

const BASE: WelcomeInput = {
  name: 'Nguyễn Văn A',
  email: 'vana@example.com',
  shopUrl: 'http://localhost:5173',
  voucher: null,
  freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
  heroImageUrl: '',
};

const render = (overrides: Partial<WelcomeInput> = {}) =>
  renderWelcome({ ...BASE, ...overrides });

describe('renderWelcome', () => {
  it('subject và preheader đúng chữ', () => {
    const mail = render();
    expect(mail.subject).toBe('Chào mừng bạn đến với MONO STUDIO');
    expect(mail.subject).toBe(WELCOME_SUBJECT);
    expect(mail.html).toContain(
      'Chào mừng bạn đến với MONO STUDIO — cảm ơn bạn đã tạo tài khoản.',
    );
  });

  describe('lời chào', () => {
    it('có tên thì "Xin chào," rồi tên', () => {
      const mail = render({ name: 'Lan' });
      expect(mail.html).toContain('Xin chào,<br>Lan.');
      expect(mail.text).toContain('Xin chào, Lan.');
    });

    it('tên chứa <script> bị thoát trong HTML (và không có thẻ script thật)', () => {
      const mail = render({ name: '<script>alert(1)</script>' });
      expect(mail.html).not.toContain('<script>alert');
      expect(mail.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    });

    it('tên chứa dấu nháy kép/& cũng bị thoát', () => {
      const mail = render({ name: 'A "B" & C' });
      expect(mail.html).toContain('A &quot;B&quot; &amp; C');
    });

    it.each([null, undefined, '', '   '])(
      'tên %j => "Xin chào bạn."',
      (name) => {
        const mail = render({ name });
        expect(mail.html).toContain('Xin chào bạn.');
        expect(mail.html).not.toContain('Xin chào,<br>');
        expect(mail.text).toContain('Xin chào bạn.');
      },
    );

    it('tên trùng phần trước @ (không phân biệt hoa thường) => "Xin chào bạn."', () => {
      const mail = render({ name: 'VanA', email: 'vana@example.com' });
      expect(mail.html).toContain('Xin chào bạn.');
      expect(mail.html).not.toContain('VanA');
    });

    it('tên dài bị cắt còn 60 ký tự', () => {
      const mail = render({ name: 'B'.repeat(200) });
      expect(mail.html).toContain(`Xin chào,<br>${'B'.repeat(60)}.`);
      expect(mail.html).not.toContain('B'.repeat(61));
    });
  });

  describe('liên kết', () => {
    it('nút và menu trỏ đúng /products và /tai-khoan/don-hang, bỏ dấu / cuối', () => {
      const mail = render({ shopUrl: 'https://shop.example.com/' });
      expect(mail.html).toContain('href="https://shop.example.com/products"');
      expect(mail.html).toContain(
        'href="https://shop.example.com/tai-khoan/don-hang"',
      );
      expect(mail.html).not.toContain('com//');
      expect(mail.text).toContain(
        'Khám phá bộ sưu tập: https://shop.example.com/products',
      );
    });

    it.each(['javascript:alert(1)', 'ftp://x.com', 'khong-phai-url', ''])(
      'shopUrl %j bị từ chối bằng lỗi (không dựng link hỏng)',
      (shopUrl) => {
        expect(() => render({ shopUrl })).toThrow();
      },
    );
  });

  describe('khối voucher', () => {
    it('voucher null => không có khối voucher (không có mã, nhãn, đường viền đứt)', () => {
      const mail = render({ voucher: null });
      expect(mail.html).not.toContain('Mã ưu đãi');
      expect(mail.html).not.toContain('MONO10');
      expect(mail.html).not.toContain('dashed');
      expect(mail.text).not.toContain('Mã ưu đãi');
    });

    it('PERCENT có maxDiscount, có hạn', () => {
      const mail = render({ voucher: MONO10 });
      expect(mail.html).toContain('Mã ưu đãi · Giảm 10%');
      expect(mail.html).toContain('MONO10');
      expect(mail.html).toContain(
        'Áp dụng cho đơn từ 300.000₫, giảm tối đa 100.000₫.',
      );
      expect(mail.html).toContain('Dùng đến hết ngày 30/06/2027.');
      expect(mail.text).toContain('Mã ưu đãi · Giảm 10%: MONO10');
      expect(mail.text).toContain(
        'Áp dụng cho đơn từ 300.000₫, giảm tối đa 100.000₫.',
      );
      expect(mail.text).toContain('Dùng đến hết ngày 30/06/2027.');
    });

    it('PERCENT không có maxDiscount => không ghi "giảm tối đa"', () => {
      const mail = render({ voucher: { ...MONO10, maxDiscount: null } });
      expect(mail.html).toContain('Áp dụng cho đơn từ 300.000₫.');
      expect(mail.html).not.toContain('giảm tối đa');
    });

    it('FIXED: nhãn là số tiền, và không ghi "giảm tối đa" dù có maxDiscount', () => {
      const mail = render({
        voucher: {
          ...MONO10,
          code: 'WELCOME50',
          discountType: 'FIXED',
          discountValue: 50_000,
          maxDiscount: 999,
          minOrderValue: 400_000,
        },
      });
      expect(mail.html).toContain('Mã ưu đãi · Giảm 50.000₫');
      expect(mail.html).toContain('Áp dụng cho đơn từ 400.000₫.');
      expect(mail.html).not.toContain('giảm tối đa');
      expect(mail.html).not.toContain('Giảm 50%');
    });

    it('không có expiresAt => không có dòng "Dùng đến hết ngày"', () => {
      const mail = render({ voucher: { ...MONO10, expiresAt: null } });
      expect(mail.html).not.toContain('Dùng đến hết ngày');
      expect(mail.text).not.toContain('Dùng đến hết ngày');
    });

    it('đơn tối thiểu 0 => "Áp dụng cho mọi đơn hàng"', () => {
      const mail = render({
        voucher: { ...MONO10, minOrderValue: 0, maxDiscount: null },
      });
      expect(mail.html).toContain('Áp dụng cho mọi đơn hàng.');
    });

    it('ngày hết hạn theo giờ Việt Nam: 23:59:59 giờ VN vẫn là ngày đó; 00:00:00 giờ VN là ngày sau', () => {
      expect(
        render({
          voucher: {
            ...MONO10,
            expiresAt: new Date('2027-06-30T23:59:59+07:00'),
          },
        }).html,
      ).toContain('hết ngày 30/06/2027.');
      expect(
        render({
          voucher: {
            ...MONO10,
            expiresAt: new Date('2027-07-01T00:00:00+07:00'),
          },
        }).html,
      ).toContain('hết ngày 01/07/2027.');
    });

    it('mã voucher bị thoát HTML', () => {
      const mail = render({ voucher: { ...MONO10, code: '<b>X</b>' } });
      expect(mail.html).not.toContain('<b>X</b>');
      expect(mail.html).toContain('&lt;b&gt;X&lt;/b&gt;');
    });

    it('không có chữ nói "quà riêng", "dành riêng", "quà chào mừng" (mã dùng chung)', () => {
      const { html, text } = render({ voucher: MONO10 });
      for (const word of ['quà riêng', 'dành riêng', 'Quà chào mừng']) {
        expect(html).not.toContain(word);
        expect(text).not.toContain(word);
      }
    });
  });

  describe('miễn phí vận chuyển và cam kết', () => {
    it('thanh trên cùng và cam kết dùng đúng ngưỡng truyền vào', () => {
      const mail = render({ freeShippingThreshold: 500_000 });
      expect(mail.html).toContain('Miễn phí vận chuyển từ 500.000₫');
      expect(mail.html).toContain('Cho mọi đơn hàng từ 500.000₫.');
      expect(mail.text).toContain(
        'Miễn phí vận chuyển: Cho mọi đơn hàng từ 500.000₫.',
      );
    });

    it('ngưỡng khác thì hiện khác (không ghi cứng)', () => {
      expect(render({ freeShippingThreshold: 700_000 }).html).toContain(
        'từ 700.000₫',
      );
    });

    it('có đúng 2 mục cam kết, đánh số 01 và 02', () => {
      const { html } = render();
      expect(html).toContain('Miễn phí vận chuyển</p>');
      expect(html).toContain('Thanh toán linh hoạt');
      expect(html).toContain(
        'Thanh toán khi nhận hàng hoặc chuyển khoản QR ngân hàng.',
      );
      expect(html).toContain('>01</td>');
      expect(html).toContain('>02</td>');
      expect(html).not.toContain('>03</td>');
    });

    it('ngưỡng null hoặc <= 0 => bỏ thanh trên và mục miễn phí vận chuyển, còn 1 mục (01)', () => {
      for (const freeShippingThreshold of [null, 0, -5, Number.NaN]) {
        const { html, text } = render({ freeShippingThreshold });
        expect(html).not.toContain('Miễn phí vận chuyển');
        expect(text).not.toContain('Miễn phí vận chuyển');
        expect(html).toContain('Thanh toán linh hoạt');
        expect(html).toContain('>01</td>');
        expect(html).not.toContain('>02</td>');
      }
    });
  });

  describe('ảnh hero', () => {
    it('rỗng/null/undefined => không có thẻ <img> nào', () => {
      for (const heroImageUrl of ['', null, undefined]) {
        expect(render({ heroImageUrl }).html).not.toContain('<img');
      }
    });

    it('URL https => có <img> hero với alt mô tả', () => {
      const mail = render({
        heroImageUrl:
          'https://res.cloudinary.com/demo/image/upload/f_jpg,w_1040/v1/hero.jpg',
      });
      expect(mail.html).toContain('<img');
      expect(mail.html).toContain(
        'src="https://res.cloudinary.com/demo/image/upload/f_jpg,w_1040/v1/hero.jpg"',
      );
      expect(mail.html).toMatch(/alt="[^"]{10,}"/);
    });

    it.each([
      'http://example.com/hero.jpg',
      'javascript:alert(1)',
      'data:image/png;base64,AAAA',
      'https://example.com/a" onerror="alert(1)',
    ])('URL %j không được nhận (không có <img>)', (heroImageUrl) => {
      expect(render({ heroImageUrl }).html).not.toContain('<img');
    });
  });

  describe('nội dung bị bỏ và an toàn', () => {
    it.each([
      'Đổi trả',
      'Hỗ trợ',
      'Hủy nhận',
      'đơn đầu tiên',
      'Xem trên trình duyệt',
      'Phụ kiện',
      'Quà tặng',
      '{{',
      'url_unsubscribe',
    ])('cả HTML lẫn text không chứa %j', (word) => {
      for (const voucher of [null, MONO10]) {
        const { html, text } = render({
          voucher,
          heroImageUrl: 'https://example.com/h.jpg',
        });
        expect(html).not.toContain(word);
        expect(text).not.toContain(word);
      }
    });

    it('không có chữ đầu tiên/ưu đãi 10% cho đơn đầu ở preheader hay thân thư', () => {
      const { html } = render();
      expect(html).not.toMatch(/đơn đầu/i);
      expect(html).not.toContain('Quà chào mừng');
    });

    it('không có comment hướng dẫn biến (<!--) trong HTML', () => {
      expect(render({ voucher: MONO10 }).html).not.toContain('<!--');
    });

    it('chân thư: câu lý do nhận mail và bản quyền không có năm', () => {
      const { html, text } = render();
      expect(html).toContain(
        'Bạn nhận email này vì đã đăng ký tài khoản tại MONO STUDIO.',
      );
      expect(html).toContain('Bản quyền &copy; MONO STUDIO.');
      expect(html).not.toMatch(/&copy;\s*\d{4}/);
      expect(text).toContain('Bản quyền © MONO STUDIO.');
    });

    it('mọi href là http/https', () => {
      const html = render({ voucher: MONO10 }).html;
      const hrefs = [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
      expect(hrefs.length).toBeGreaterThan(3);
      for (const href of hrefs) expect(href).toMatch(/^https?:\/\//);
    });

    it('HTML nhỏ hơn 100KB (kể cả có hero và voucher)', () => {
      const html = render({
        voucher: MONO10,
        heroImageUrl: 'https://example.com/h.jpg',
        name: 'C'.repeat(200),
      }).html;
      expect(Buffer.byteLength(html, 'utf8')).toBeLessThan(100 * 1024);
    });
  });

  describe('bản text thuần', () => {
    it('có lời chào, cảm ơn, link /products, dòng voucher và dòng miễn phí ship', () => {
      const { text } = render({ voucher: MONO10 });
      expect(text).toContain('Xin chào, Nguyễn Văn A.');
      expect(text).toContain('Cảm ơn bạn đã tạo tài khoản');
      expect(text).toContain('http://localhost:5173/products');
      expect(text).toContain('MONO10');
      expect(text).toContain('Cho mọi đơn hàng từ 500.000₫.');
      expect(text).not.toContain('<');
    });
  });
});
