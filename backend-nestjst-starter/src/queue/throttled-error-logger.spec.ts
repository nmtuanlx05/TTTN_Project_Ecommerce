import { ThrottledErrorLogger } from './throttled-error-logger';

describe('ThrottledErrorLogger', () => {
  let clock: number;
  let lines: string[];
  let logger: ThrottledErrorLogger;

  beforeEach(() => {
    clock = 1_000_000;
    lines = [];
    logger = new ThrottledErrorLogger(
      (m) => lines.push(m),
      30_000,
      () => clock,
    );
  });

  it('ghi ngay lỗi đầu tiên', () => {
    logger.report(new Error('connect ECONNREFUSED'));
    expect(lines).toEqual(['connect ECONNREFUSED']);
  });

  it('lỗi lặp lại trong khoảng giới hạn thì không ghi', () => {
    logger.report(new Error('a'));
    clock += 1000;
    logger.report(new Error('b'));
    clock += 28_000;
    logger.report(new Error('c'));
    expect(lines).toEqual(['a']);
  });

  it('hết khoảng giới hạn thì ghi lại và cho biết đã ẩn bao nhiêu lỗi', () => {
    logger.report(new Error('a'));
    clock += 1000;
    logger.report(new Error('b'));
    logger.report(new Error('c'));
    clock += 30_000;
    logger.report(new Error('d'));
    expect(lines).toEqual(['a', 'd (đã ẩn 2 lỗi tương tự trong lúc chờ)']);
  });

  it('sau khi ghi thì bộ đếm ẩn được đặt lại', () => {
    logger.report(new Error('a'));
    logger.report(new Error('b'));
    clock += 30_000;
    logger.report(new Error('c'));
    clock += 30_000;
    logger.report(new Error('d'));
    expect(lines[2]).toBe('d');
  });

  it('nhận cả giá trị không phải Error', () => {
    logger.report('lỗi chuỗi');
    expect(lines).toEqual(['lỗi chuỗi']);
  });
});
