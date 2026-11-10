import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Trim } from '../../common/transforms/trim';

export class ResolveTransactionDto {
  @Trim()
  @IsString({ message: 'Ghi chú phải là chuỗi' })
  @IsNotEmpty({ message: 'Vui lòng nhập ghi chú xử lý' })
  @MaxLength(500, { message: 'Ghi chú không được vượt quá 500 ký tự' })
  note: string;
}
