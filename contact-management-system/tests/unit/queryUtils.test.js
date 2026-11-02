import {
  getPaginationParams,
  getSortingParams,
  buildContactWhereClause,
  buildPaginationMetadata,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_PAGE_LIMIT
} from '../../src/utils/queryUtils.js';

describe('Query Utilities Unit Tests', () => {
  describe('getPaginationParams', () => {
    it('returns default pagination parameters when query is empty', () => {
      const result = getPaginationParams({});
      expect(result).toEqual({
        page: DEFAULT_PAGE,
        limit: DEFAULT_LIMIT,
        skip: 0,
        take: DEFAULT_LIMIT
      });
    });

    it('correctly calculates skip and take for valid page and limit', () => {
      const result = getPaginationParams({ page: '3', limit: '25' });
      expect(result).toEqual({
        page: 3,
        limit: 25,
        skip: 50,
        take: 25
      });
    });

    it('clamps limit to MAX_PAGE_LIMIT when limit exceeds 100', () => {
      const result = getPaginationParams({ page: '1', limit: '500' });
      expect(result.limit).toBe(MAX_PAGE_LIMIT);
      expect(result.take).toBe(MAX_PAGE_LIMIT);
    });

    it('reverts invalid or negative page and limit to safe defaults', () => {
      const result = getPaginationParams({ page: '-5', limit: 'invalid' });
      expect(result.page).toBe(DEFAULT_PAGE);
      expect(result.limit).toBe(DEFAULT_LIMIT);
      expect(result.skip).toBe(0);
    });
  });

  describe('getSortingParams', () => {
    it('uses requested sort and order when valid', () => {
      const result = getSortingParams({ sort: 'name', order: 'asc' });
      expect(result).toEqual([{ name: 'asc' }, { id: 'asc' }]);
    });

    it('falls back to default sort when requested field is not allowed', () => {
      const result = getSortingParams({ sort: 'maliciousField; DROP TABLE', order: 'asc' });
      expect(result).toEqual([{ createdAt: 'asc' }, { id: 'asc' }]);
    });

    it('handles uppercase order correctly', () => {
      const result = getSortingParams({ sort: 'companyName', order: 'DESC' });
      expect(result).toEqual([{ companyName: 'desc' }, { id: 'asc' }]);
    });
  });

  describe('buildContactWhereClause', () => {
    it('scopes query to ownerId when no filters provided', () => {
      const result = buildContactWhereClause('owner-uuid-1');
      expect(result).toEqual({ ownerId: 'owner-uuid-1' });
    });

    it('constructs keyword search conditions across name, email, and phone', () => {
      const result = buildContactWhereClause('owner-uuid-1', { search: 'John' });
      expect(result.ownerId).toBe('owner-uuid-1');
      expect(result.AND).toHaveLength(1);
      expect(result.AND[0].OR).toEqual([
        { name: { contains: 'John', mode: 'insensitive' } },
        { email: { contains: 'John', mode: 'insensitive' } },
        { phone: { contains: 'John', mode: 'insensitive' } }
      ]);
    });

    it('adds company, city, and country filters', () => {
      const result = buildContactWhereClause('owner-uuid-1', {
        companyName: 'TechCorp',
        city: 'Kolkata',
        country: 'India'
      });
      expect(result.ownerId).toBe('owner-uuid-1');
      expect(result.AND).toHaveLength(3);
    });
  });

  describe('buildPaginationMetadata', () => {
    it('computes totalPages correctly with exact division', () => {
      const meta = buildPaginationMetadata(50, 1, 10);
      expect(meta).toEqual({
        page: 1,
        limit: 10,
        totalItems: 50,
        totalPages: 5
      });
    });

    it('computes totalPages correctly with remainder', () => {
      const meta = buildPaginationMetadata(53, 2, 10);
      expect(meta).toEqual({
        page: 2,
        limit: 10,
        totalItems: 53,
        totalPages: 6
      });
    });

    it('returns 0 totalPages when totalItems is 0', () => {
      const meta = buildPaginationMetadata(0, 1, 10);
      expect(meta.totalPages).toBe(0);
      expect(meta.totalItems).toBe(0);
    });
  });
});
