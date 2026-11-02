import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { TrimToNull } from '../../common/transforms/trim-to-null';
import {
  MAX_NOTE_LENGTH,
  MAX_QUANTITY_PER_OPERATION,
} from '../inventory.constants';

export class ImportStockDto {
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng phải lớn hơn 0' })
  @Max(MAX_QUANTITY_PER_OPERATION, {
    message: `Số lượng mỗi lần nhập không được vượt quá ${MAX_QUANTITY_PER_OPERATION}`,
  })
  quantity: number;

  // Chuỗi rỗng được đổi thành null (không có ghi chú)
  @IsOptional()
  @TrimToNull()
  @IsString({ message: 'Ghi chú phải là chuỗi' })
  @MaxLength(MAX_NOTE_LENGTH, {
    message: `Ghi chú không được vượt quá ${MAX_NOTE_LENGTH} ký tự`,
  })
  note?: string | null;
}
