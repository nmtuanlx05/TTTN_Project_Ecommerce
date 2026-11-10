import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class QueryPaymentTransactionsDto {
  // pending (mặc định): chưa xử lý; resolved: đã xử lý; all: cả hai
  @IsOptional()
  @IsIn(['pending', 'resolved', 'all'], {
    message: 'review phải là pending, resolved hoặc all',
  })
  review: 'pending' | 'resolved' | 'all' = 'pending';

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page phải là số nguyên' })
  @Min(1, { message: 'page phải lớn hơn hoặc bằng 1' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit phải là số nguyên' })
  @Min(1, { message: 'limit phải lớn hơn hoặc bằng 1' })
  @Max(100, { message: 'limit không được vượt quá 100' })
  limit: number = 10;
}
