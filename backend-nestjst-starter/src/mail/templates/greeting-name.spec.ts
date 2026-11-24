import { GREETING_NAME_MAX_LENGTH, resolveGreetingName } from './greeting-name';

describe('resolveGreetingName', () => {
  it('có tên thật thì trả tên (đã trim)', () => {
    expect(resolveGreetingName('  Nguyễn Văn A ', 'a@example.com')).toBe(
      'Nguyễn Văn A',
    );
  });

  it.each([null, undefined, '', '   ', '\n\t'])(
    'tên %j thì chào chung (null)',
    (name) => {
      expect(resolveGreetingName(name, 'a@example.com')).toBeNull();
    },
  );

  it('tên trùng phần trước @ của email (không phân biệt hoa thường) thì null', () => {
    expect(
      resolveGreetingName('nguyenvana', 'nguyenvana@gmail.com'),
    ).toBeNull();
    expect(
      resolveGreetingName('NguyenVanA', 'nguyenvana@gmail.com'),
    ).toBeNull();
    expect(
      resolveGreetingName(' nguyenvana ', 'NGUYENVANA@GMAIL.COM'),
    ).toBeNull();
  });

  it('tên chỉ GIỐNG MỘT PHẦN phần trước @ thì vẫn dùng', () => {
    expect(resolveGreetingName('An', 'an.nguyen@gmail.com')).toBe('An');
  });

  it('cắt tên dài tối đa 60 ký tự', () => {
    const long = 'A'.repeat(200);
    const result = resolveGreetingName(long, 'x@example.com')!;
    expect(Array.from(result)).toHaveLength(GREETING_NAME_MAX_LENGTH);
  });

  it('không cắt đôi ký tự ngoài BMP (emoji)', () => {
    const result = resolveGreetingName('😀'.repeat(100), 'x@example.com')!;
    expect(Array.from(result)).toHaveLength(GREETING_NAME_MAX_LENGTH);
    expect(result).not.toMatch(/[\uD800-\uDBFF]$/);
  });

  it('xuống dòng/tab trong tên thành dấu cách (không chèn được dòng mới)', () => {
    expect(resolveGreetingName('An\r\nBình\tChi', 'x@example.com')).toBe(
      'An Bình Chi',
    );
  });

  it('trả chuỗi thô, không escape (việc escape là của nơi chèn HTML)', () => {
    expect(resolveGreetingName('<b>An</b>', 'x@example.com')).toBe('<b>An</b>');
  });
});
