export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Service trả về lớp này cho API có phân trang; ResponseInterceptor sẽ tách data/meta ra.
export class Paginated<T> {
  readonly meta: PaginationMeta;

  constructor(
    readonly data: T[],
    params: { page: number; limit: number; total: number },
  ) {
    this.meta = {
      page: params.page,
      limit: params.limit,
      total: params.total,
      totalPages: Math.ceil(params.total / params.limit),
    };
  }
}
