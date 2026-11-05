import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { Trim } from '../../common/transforms/trim';
import { QueryOrdersDto } from './query-orders.dto';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class QueryAdminOrdersDto extends QueryOrdersDto {
  // Ngày dạng YYYY-MM-DD theo GMT+7; from tính từ 00:00, to tính đến hết ngày đó
  @IsOptional()
  @Matches(DATE_REGEX, { message: 'from phải có dạng YYYY-MM-DD' })
  from?: string;

  @IsOptional()
  @Matches(DATE_REGEX, { message: 'to phải có dạng YYYY-MM-DD' })
  to?: string;

  // Tìm theo mã đơn, số điện thoại hoặc tên người nhận
  @IsOptional()
  @Trim()
  @IsString({ message: 'Từ khóa tìm kiếm phải là chuỗi' })
  @MaxLength(100, { message: 'Từ khóa tìm kiếm không được vượt quá 100 ký tự' })
  q?: string;
}
