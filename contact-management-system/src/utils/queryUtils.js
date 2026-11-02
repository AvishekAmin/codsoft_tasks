/**
 * Query utilities for search, filtering, sorting, and pagination.
 */

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const MAX_PAGE_LIMIT = 100;

export const ALLOWED_SORT_FIELDS = [
  'name',
  'email',
  'phone',
  'companyName',
  'city',
  'country',
  'createdAt',
  'updatedAt'
];

/**
 * Extracts and clamps pagination parameters from a request query object.
 *
 * @param {object} query
 * @returns {{ page: number, limit: number, skip: number, take: number }}
 */
export const getPaginationParams = (query = {}) => {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);

  if (isNaN(page) || page < 1) {
    page = DEFAULT_PAGE;
  }

  if (isNaN(limit) || limit < 1) {
    limit = DEFAULT_LIMIT;
  } else if (limit > MAX_PAGE_LIMIT) {
    limit = MAX_PAGE_LIMIT;
  }

  const skip = (page - 1) * limit;
  const take = limit;

  return { page, limit, skip, take };
};

/**
 * Validates and extracts sorting options.
 *
 * @param {object} query
 * @param {string[]} allowedFields
 * @param {string} defaultSort
 * @param {string} defaultOrder
 * @returns {Array<object>} Prisma orderBy array with stable ID tie-breaker
 */
export const getSortingParams = (
  query = {},
  allowedFields = ALLOWED_SORT_FIELDS,
  defaultSort = 'createdAt',
  defaultOrder = 'desc'
) => {
  const requestedSort = query.sort ? String(query.sort).trim() : defaultSort;
  const requestedOrder = query.order ? String(query.order).toLowerCase().trim() : defaultOrder;

  const sortField = allowedFields.includes(requestedSort) ? requestedSort : defaultSort;
  const sortOrder = requestedOrder === 'asc' ? 'asc' : 'desc';

  const orderBy = [{ [sortField]: sortOrder }];

  // Stable sorting tie-breaker
  if (sortField !== 'id') {
    orderBy.push({ id: 'asc' });
  }

  return orderBy;
};

/**
 * Builds Prisma where filter object for owner-scoped contact queries.
 *
 * @param {string} ownerId
 * @param {object} query
 * @returns {object} Prisma where clause
 */
export const buildContactWhereClause = (ownerId, query = {}) => {
  const where = {
    ownerId
  };

  const andConditions = [];

  // Keyword search across name, email, and phone
  if (query.search && typeof query.search === 'string') {
    const search = query.search.trim();
    if (search.length > 0) {
      andConditions.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } }
        ]
      });
    }
  }

  // Exact or partial filters
  if (query.companyName && typeof query.companyName === 'string') {
    const company = query.companyName.trim();
    if (company) {
      andConditions.push({
        companyName: { contains: company, mode: 'insensitive' }
      });
    }
  }

  if (query.city && typeof query.city === 'string') {
    const city = query.city.trim();
    if (city) {
      andConditions.push({
        city: { contains: city, mode: 'insensitive' }
      });
    }
  }

  if (query.country && typeof query.country === 'string') {
    const country = query.country.trim();
    if (country) {
      andConditions.push({
        country: { contains: country, mode: 'insensitive' }
      });
    }
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  return where;
};

/**
 * Computes standard pagination metadata.
 *
 * @param {number} totalItems
 * @param {number} page
 * @param {number} limit
 * @returns {{ page: number, limit: number, totalItems: number, totalPages: number }}
 */
export const buildPaginationMetadata = (totalItems, page, limit) => {
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);
  return {
    page,
    limit,
    totalItems,
    totalPages
  };
};
