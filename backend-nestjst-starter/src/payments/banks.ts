// Bảng BIN -> tên ngân hàng để hiển thị cho khách. Chỉ MB (970422) đã được kiểm chứng với tài khoản thật;
// các BIN còn lại ĐƯỢC GHI TỪ TRÍ NHỚ, CHƯA KIỂM CHỨNG: hãy đối chiếu danh sách NAPAS trước khi dùng ngân hàng đó,
// hoặc đặt VIETQR_BANK_NAME để ghi đè tên hiển thị. BIN sai làm QR chuyển nhầm ngân hàng, nên nhớ tự quét thử.
export interface BankInfo {
  code: string;
  name: string;
  verified: boolean;
}

export const BANKS: Record<string, BankInfo> = {
  '970422': { code: 'MB', name: 'MB Bank (Quân đội)', verified: true },
  '970436': { code: 'VCB', name: 'Vietcombank', verified: false },
  '970415': { code: 'CTG', name: 'VietinBank', verified: false },
  '970418': { code: 'BIDV', name: 'BIDV', verified: false },
  '970405': { code: 'AGRIBANK', name: 'Agribank', verified: false },
  '970407': { code: 'TCB', name: 'Techcombank', verified: false },
  '970416': { code: 'ACB', name: 'ACB', verified: false },
  '970432': { code: 'VPB', name: 'VPBank', verified: false },
  '970423': { code: 'TPB', name: 'TPBank', verified: false },
  '970403': { code: 'STB', name: 'Sacombank', verified: false },
  '970437': { code: 'HDB', name: 'HDBank', verified: false },
  '970441': { code: 'VIB', name: 'VIB', verified: false },
  '970443': { code: 'SHB', name: 'SHB', verified: false },
  '970448': { code: 'OCB', name: 'OCB', verified: false },
  '970426': { code: 'MSB', name: 'MSB', verified: false },
  '970440': { code: 'SEAB', name: 'SeABank', verified: false },
};

export const findBank = (bin: string): BankInfo | undefined => BANKS[bin];
