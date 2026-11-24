import { escapeHtml, toSafeHttpsUrl, toSafeHttpUrl } from './escape-html';

describe('escapeHtml', () => {
  it('thoát đủ & < > " \'', () => {
    expect(escapeHtml(`<script>alert("x")</script> & 'y'`)).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;y&#39;',
    );
  });

  it('thoát & trước nên không thoát đôi', () => {
    expect(escapeHtml('&lt;')).toBe('&amp;lt;');
  });

  it('giữ nguyên chữ có dấu và chuỗi rỗng', () => {
    expect(escapeHtml('Nguyễn Văn Á')).toBe('Nguyễn Văn Á');
    expect(escapeHtml('')).toBe('');
  });

  it('giá trị thuộc tính không thoát được dấu nháy kép', () => {
    expect(escapeHtml('x" onerror="alert(1)')).not.toContain('"');
  });
});

describe('toSafeHttpUrl / toSafeHttpsUrl', () => {
  it('nhận http và https hợp lệ', () => {
    expect(toSafeHttpUrl('http://localhost:5173/products')).toBe(
      'http://localhost:5173/products',
    );
    expect(toSafeHttpUrl('https://shop.example.com')).toBe(
      'https://shop.example.com/',
    );
  });

  it.each([
    'javascript:alert(1)',
    'data:text/html,<b>x</b>',
    'ftp://example.com',
    '//example.com',
    'not a url',
    'https://example.com/a b',
    'https://user:pw@example.com',
    'https://example.com/\n<script>',
    '',
    '   ',
  ])('từ chối %j', (value) => {
    expect(toSafeHttpUrl(value)).toBeNull();
  });

  it('toSafeHttpsUrl từ chối http', () => {
    expect(toSafeHttpsUrl('http://example.com/a.jpg')).toBeNull();
    expect(toSafeHttpsUrl('https://example.com/a.jpg')).toBe(
      'https://example.com/a.jpg',
    );
  });
});
