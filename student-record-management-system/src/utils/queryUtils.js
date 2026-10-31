/**
 * Pagination and sorting utilities for Prisma queries.
 */

export const MAX_PAGE_LIMIT = 100;
export const DEFAULT_PAGE_LIMIT = 10;
export const DEFAULT_PAGE = 1;

/**
 * Parses and validates pagination query parameters.
 * @param {object} query - Express req.query
 * @returns {{ page: number, limit: number, skip: number, take: number }}
 */
export const getPaginationParams = (query = {}) => {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);

  if (isNaN(page) || page < 1) {
    page = DEFAULT_PAGE;
  }

  if (isNaN(limit) || limit < 1) {
    limit = DEFAULT_PAGE_LIMIT;
  } else if (limit > MAX_PAGE_LIMIT) {
    limit = MAX_PAGE_LIMIT;
  }

  const skip = (page - 1) * limit;
  const take = limit;

  return { page, limit, skip, take };
};

/**
 * Builds Prisma-safe orderBy array with stable tie-breaker.
 * @param {string} requestedSort - Field to sort by
 * @param {string} requestedOrder - 'asc' or 'desc'
 * @param {string[]} allowedFields - Array of field names allowed for sorting
 * @param {string} defaultSort - Default sort field
 * @param {string} defaultOrder - Default sort direction
 * @returns {Array<object>} Prisma orderBy array
 */
export const getSortingParams = (
  requestedSort,
  requestedOrder,
  allowedFields = ['createdAt'],
  defaultSort = 'createdAt',
  defaultOrder = 'desc'
) => {
  const sort = allowedFields.includes(requestedSort) ? requestedSort : defaultSort;
  const order = ['asc', 'desc'].includes(requestedOrder?.toLowerCase())
    ? requestedOrder.toLowerCase()
    : defaultOrder;

  const orderBy = [{ [sort]: order }];

  // Add id tie-breaker for deterministic pagination if sort is not already id
  if (sort !== 'id') {
    orderBy.push({ id: 'desc' });
  }

  return { sort, order, orderBy };
};

/**
 * Computes pagination metadata.
 * @param {number} totalItems - Total matching records count
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {{ page: number, limit: number, totalItems: number, totalPages: number }}
 */
export const buildPaginationMetadata = (totalItems, page, limit) => {
  const totalPages = Math.ceil(totalItems / limit) || (totalItems === 0 ? 0 : 1);
  return {
    page,
    limit,
    totalItems,
    totalPages
  };
};
