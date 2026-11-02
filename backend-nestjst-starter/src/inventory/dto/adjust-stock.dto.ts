import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Trim } from '../../common/transforms/trim';
import { TrimToNull } from '../../common/transforms/trim-to-null';
import {
  MAX_NOTE_LENGTH,
  MAX_REASON_LENGTH,
  MAX_STOCK,
} from '../inventory.constants';

export class AdjustStockDto {
  // Số đếm thực tế trong kho; hệ thống tự tính chênh lệch so với tồn hiện tại
  @IsInt({ message: 'Số lượng thực tế phải là số nguyên' })
  @Min(0, { message: 'Số lượng thực tế không được âm' })
  @Max(MAX_STOCK, {
    message: `Số lượng thực tế không được vượt quá ${MAX_STOCK}`,
  })
  newStock: number;

  // Lý do tự do (vd "Kiểm kê cuối tháng"); bắt buộc để có dấu vết điều chỉnh
  @Trim()
  @IsString({ message: 'Lý do phải là chuỗi' })
  @IsNotEmpty({ message: 'Lý do điều chỉnh không được để trống' })
  @MaxLength(MAX_REASON_LENGTH, {
    message: `Lý do không được vượt quá ${MAX_REASON_LENGTH} ký tự`,
  })
  reason: string;

  @IsOptional()
  @TrimToNull()
  @IsString({ message: 'Ghi chú phải là chuỗi' })
  @MaxLength(MAX_NOTE_LENGTH, {
    message: `Ghi chú không được vượt quá ${MAX_NOTE_LENGTH} ký tự`,
  })
  note?: string | null;
}
