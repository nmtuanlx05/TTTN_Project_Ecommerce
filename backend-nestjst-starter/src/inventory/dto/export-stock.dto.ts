import { IsIn, IsInt, Max, Min, ValidateBy } from 'class-validator';
import { TrimToNull } from '../../common/transforms/trim-to-null';
import {
  EXPORT_REASONS,
  MAX_NOTE_LENGTH,
  MAX_QUANTITY_PER_OPERATION,
} from '../inventory.constants';
import type { ExportReason } from '../inventory.constants';

// Ghi chú: tùy chọn, tối đa MAX_NOTE_LENGTH ký tự; bắt buộc (không rỗng sau khi trim) khi lý do là "Khác"
// vì "Khác" mà không mô tả thì vô nghĩa. Gộp vào một validator để mỗi lỗi chỉ có đúng một thông báo.
// Giá trị đã qua TrimToNull nên chuỗi rỗng đã thành null.
const NOTE_REQUIRED_MESSAGE = 'Xuất kho với lý do "Khác" phải có ghi chú';
const ExportNote = () =>
  ValidateBy({
    name: 'exportNote',
    validator: {
      validate: (value: unknown, args) => {
        if (value === undefined || value === null) {
          return (args?.object as ExportStockDto).reason !== 'OTHER';
        }
        return typeof value === 'string' && value.length <= MAX_NOTE_LENGTH;
      },
      defaultMessage: (args) => {
        const value = args?.value as unknown;
        if (value === undefined || value === null) return NOTE_REQUIRED_MESSAGE;
        return typeof value === 'string'
          ? `Ghi chú không được vượt quá ${MAX_NOTE_LENGTH} ký tự`
          : 'Ghi chú phải là chuỗi';
      },
    },
  });

export class ExportStockDto {
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng phải lớn hơn 0' })
  @Max(MAX_QUANTITY_PER_OPERATION, {
    message: `Số lượng mỗi lần xuất không được vượt quá ${MAX_QUANTITY_PER_OPERATION}`,
  })
  quantity: number;

  @IsIn(EXPORT_REASONS, {
    message: 'Lý do xuất kho phải là DAMAGED, LOST hoặc OTHER',
  })
  reason: ExportReason;

  @TrimToNull()
  @ExportNote()
  note?: string | null;
}
