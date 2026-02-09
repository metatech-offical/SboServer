/**
 * Pagination utility to prevent DoS attacks via unlimited query results
 */

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 100;

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

/**
 * Sanitize pagination parameters to prevent abuse
 * - Ensures page is at least 1
 * - Enforces maximum limit to prevent memory exhaustion
 * - Returns computed skip value for MongoDB
 */
export const sanitizePagination = (
  page?: number | string,
  limit?: number | string
): PaginationParams => {
  const sanitizedPage = Math.max(1, parseInt(String(page)) || DEFAULT_PAGE);
  const sanitizedLimit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(String(limit)) || DEFAULT_LIMIT)
  );
  const skip = (sanitizedPage - 1) * sanitizedLimit;

  return {
    page: sanitizedPage,
    limit: sanitizedLimit,
    skip,
  };
};
