export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
  offset: number;
}

export function parsePage(value: string | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 10_000 ? parsed : 1;
}

export function paginateItems<T>(items: T[], page: number, pageSize: number): PaginatedResult<T> {
  const total = items.length;
  const pageCount = Math.max(Math.ceil(total / pageSize), 1);
  const currentPage = Math.min(Math.max(page, 1), pageCount);
  const offset = (currentPage - 1) * pageSize;
  return {
    items: items.slice(offset, offset + pageSize),
    page: currentPage,
    pageSize,
    pageCount,
    total,
    offset,
  };
}

export function paginationResult<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResult<T> {
  const pageCount = Math.max(Math.ceil(total / pageSize), 1);
  return {
    items,
    page,
    pageSize,
    pageCount,
    total,
    offset: (page - 1) * pageSize,
  };
}
