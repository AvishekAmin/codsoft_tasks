import {
  getPaginationParams,
  getSortingParams,
  buildPaginationMetadata,
  MAX_PAGE_LIMIT,
  DEFAULT_PAGE_LIMIT,
  DEFAULT_PAGE
} from '../../src/utils/queryUtils.js';

describe('Query Utilities Unit Tests', () => {
  describe('getPaginationParams', () => {
    test('returns default pagination parameters when query is empty', () => {
      const result = getPaginationParams({});
      expect(result).toEqual({
        page: DEFAULT_PAGE,
        limit: DEFAULT_PAGE_LIMIT,
        skip: 0,
        take: DEFAULT_PAGE_LIMIT
      });
    });

    test('correctly calculates skip and take for valid page and limit', () => {
      const result = getPaginationParams({ page: '3', limit: '20' });
      expect(result).toEqual({
        page: 3,
        limit: 20,
        skip: 40,
        take: 20
      });
    });

    test('clamps limit to MAX_PAGE_LIMIT when limit exceeds 100', () => {
      const result = getPaginationParams({ page: '1', limit: '500' });
      expect(result.limit).toBe(MAX_PAGE_LIMIT);
      expect(result.take).toBe(MAX_PAGE_LIMIT);
    });

    test('reverts invalid or negative page and limit to safe defaults', () => {
      const result = getPaginationParams({ page: '-5', limit: 'not-a-number' });
      expect(result.page).toBe(DEFAULT_PAGE);
      expect(result.limit).toBe(DEFAULT_PAGE_LIMIT);
    });
  });

  describe('getSortingParams', () => {
    const allowed = ['title', 'credits', 'createdAt'];

    test('uses requested sort and order when valid', () => {
      const result = getSortingParams('title', 'asc', allowed, 'createdAt', 'desc');
      expect(result.sort).toBe('title');
      expect(result.order).toBe('asc');
      expect(result.orderBy).toEqual([{ title: 'asc' }, { id: 'desc' }]);
    });

    test('falls back to default sort when requested field is not allowed', () => {
      const result = getSortingParams('maliciousField', 'desc', allowed, 'createdAt', 'desc');
      expect(result.sort).toBe('createdAt');
      expect(result.order).toBe('desc');
      expect(result.orderBy).toEqual([{ createdAt: 'desc' }, { id: 'desc' }]);
    });

    test('omits id tie-breaker when sorting directly by id', () => {
      const result = getSortingParams('id', 'asc', ['id', 'createdAt'], 'createdAt', 'desc');
      expect(result.sort).toBe('id');
      expect(result.orderBy).toEqual([{ id: 'asc' }]);
    });
  });

  describe('buildPaginationMetadata', () => {
    test('computes totalPages correctly with exact division', () => {
      const meta = buildPaginationMetadata(50, 1, 10);
      expect(meta).toEqual({
        page: 1,
        limit: 10,
        totalItems: 50,
        totalPages: 5
      });
    });

    test('computes totalPages correctly with remainder', () => {
      const meta = buildPaginationMetadata(53, 2, 10);
      expect(meta.totalPages).toBe(6);
    });

    test('returns 0 totalPages when totalItems is 0', () => {
      const meta = buildPaginationMetadata(0, 1, 10);
      expect(meta.totalItems).toBe(0);
      expect(meta.totalPages).toBe(0);
    });
  });
});
