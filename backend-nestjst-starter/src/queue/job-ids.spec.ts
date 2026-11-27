import { Job } from 'bullmq';
import { generateOrderCode } from '../orders/order-code';
import { orderConfirmationJobId, paymentReceivedJobId } from './job-ids';

// Queue giả TỐI THIỂU để dựng Job của BullMQ mà không cần Redis: constructor chỉ cần toKey (và qualifiedName).
// validateOptions là ĐÚNG hàm BullMQ gọi trước khi ghi job vào Redis (Job.addJob), nên test này dùng quy tắc thật,
// không mô phỏng lại. Nâng cấp bullmq mà đổi quy tắc jobId thì test đỏ.
const queueStub = {
  opts: {},
  toKey: (type: string) => type,
  qualifiedName: 'test:email',
};

// validateOptions là protected: lớp con chỉ để gọi đúng hàm đó (không ép kiểu, không đổi hành vi)
class ProbeJob extends Job {
  check() {
    this.validateOptions(this.asJSON());
  }
}

function bullmqAccepts(jobId: string): string | null {
  try {
    new ProbeJob(
      queueStub as never,
      'order-confirmation',
      { orderId: 1 },
      { jobId },
    ).check();
    return null;
  } catch (error) {
    return (error as Error).message;
  }
}

describe('orderConfirmationJobId', () => {
  it('đúng tiền tố và mã đơn, nối bằng "-"', () => {
    expect(orderConfirmationJobId('MS-261126-AB12')).toBe(
      'order-confirmation-MS-261126-AB12',
    );
  });

  it('mã đơn thật (generateOrderCode): không ":", không phải số nguyên, khác "0", BullMQ chấp nhận', () => {
    for (let i = 0; i < 50; i++) {
      const id = orderConfirmationJobId(generateOrderCode(new Date()));
      expect(id).toMatch(/^order-confirmation-/);
      expect(id).not.toContain(':');
      expect(`${parseInt(id, 10)}`).not.toBe(id);
      expect(id).not.toBe('0');
      expect(bullmqAccepts(id)).toBeNull();
    }
  });

  it('đối chứng: BullMQ từ chối jobId có ":" và jobId là số nguyên (test thật sự gọi tới quy tắc của BullMQ)', () => {
    expect(bullmqAccepts('a:b')).toBe('Custom Id cannot contain :');
    expect(bullmqAccepts('123')).toBe('Custom Id cannot be integers');
  });

  it.each([['MS-1:2'], [''], ['MS 1'], ['MS/1']])(
    'mã đơn lạ (%p) => ném lỗi, không đặt job với id sai',
    (code) => {
      expect(() => orderConfirmationJobId(code)).toThrow();
    },
  );
});

describe('paymentReceivedJobId', () => {
  it('đúng tiền tố và mã đơn, nối bằng "-"', () => {
    expect(paymentReceivedJobId('MS-261126-AB12')).toBe(
      'payment-received-MS-261126-AB12',
    );
  });

  it('mã đơn thật: không ":", không phải số nguyên, khác "0", BullMQ chấp nhận; khác jobId thư xác nhận đơn', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateOrderCode(new Date());
      const id = paymentReceivedJobId(code);
      expect(id).toMatch(/^payment-received-/);
      expect(id).not.toContain(':');
      expect(`${parseInt(id, 10)}`).not.toBe(id);
      expect(id).not.toBe('0');
      expect(bullmqAccepts(id)).toBeNull();
      expect(id).not.toBe(orderConfirmationJobId(code));
    }
  });

  it.each([['MS-1:2'], [''], ['MS 1'], ['MS/1']])(
    'mã đơn lạ (%p) => ném lỗi',
    (code) => {
      expect(() => paymentReceivedJobId(code)).toThrow();
    },
  );
});
