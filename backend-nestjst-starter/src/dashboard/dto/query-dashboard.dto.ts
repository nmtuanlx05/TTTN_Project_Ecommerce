import { Matches } from 'class-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class QueryDashboardDto {
  // Ngày dạng YYYY-MM-DD theo GMT+7; from tính từ 00:00, to tính đến hết ngày đó
  @Matches(DATE_REGEX, { message: 'from phải có dạng YYYY-MM-DD' })
  from!: string;

  @Matches(DATE_REGEX, { message: 'to phải có dạng YYYY-MM-DD' })
  to!: string;
}
