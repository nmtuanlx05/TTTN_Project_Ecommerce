// Giới hạn tần suất log lỗi lặp lại. Khi Redis mất, ioredis báo lỗi mỗi lần thử nối lại (gần như liên tục);
// ghi hết sẽ làm ngập log. Dòng đầu được ghi ngay, các lỗi tiếp theo trong khoảng intervalMs chỉ được đếm,
// và dòng log kế tiếp cho biết đã ẩn bao nhiêu lỗi. Thuần hàm (không import thư viện) nên test dễ.
export class ThrottledErrorLogger {
  private lastLoggedAt: number | null = null;
  private suppressed = 0;

  constructor(
    private readonly write: (message: string) => void,
    private readonly intervalMs: number,
    // Tiêm đồng hồ để test không phải chờ thật
    private readonly now: () => number = () => Date.now(),
  ) {}

  report(error: unknown): void {
    const at = this.now();
    if (
      this.lastLoggedAt !== null &&
      at - this.lastLoggedAt < this.intervalMs
    ) {
      this.suppressed += 1;
      return;
    }
    // Chỉ ghi message (không ghi cả object lỗi) để không vô tình lộ cấu hình kết nối
    const text = error instanceof Error ? error.message : String(error);
    const hidden =
      this.suppressed > 0
        ? ` (đã ẩn ${this.suppressed} lỗi tương tự trong lúc chờ)`
        : '';
    this.write(`${text}${hidden}`);
    this.lastLoggedAt = at;
    this.suppressed = 0;
  }
}
