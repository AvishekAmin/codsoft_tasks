import request from 'supertest';
import app from '../../src/app.js';
import { resetTestDb, getUser1Token } from '../testHelper.js';

describe('Search, Filtering, Sorting and Pagination Integration Tests', () => {
  let token;

  beforeEach(async () => {
    await resetTestDb();
    token = getUser1Token();

    // Populate a test dataset of contacts for User 1
    const testContacts = [
      {
        name: 'Avishek Mukherjee',
        email: 'avishek@example.com',
        phone: '+919876543210',
        companyName: 'OpenAI Partner',
        city: 'Kolkata',
        country: 'India'
      },
      {
        name: 'John Doe',
        email: 'john.doe@techcorp.com',
        phone: '+15551234567',
        companyName: 'TechCorp',
        city: 'San Francisco',
        country: 'USA'
      },
      {
        name: 'Jane Smith',
        email: 'jane.smith@designco.com',
        phone: '+15559876543',
        companyName: 'DesignCo',
        city: 'New York',
        country: 'USA'
      },
      {
        name: 'Carlos Garcia',
        email: 'carlos@logistics.es',
        phone: '+34912345678',
        companyName: 'Global Logistics',
        city: 'Madrid',
        country: 'Spain'
      },
      {
        name: 'Alice Brown',
        email: 'alice@techcorp.com',
        phone: '+15553332211',
        companyName: 'TechCorp',
        city: 'Austin',
        country: 'USA'
      }
    ];

    for (const c of testContacts) {
      await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${token}`)
        .send(c)
        .expect(201);
    }
  });

  describe('Search Functionality', () => {
    it('searches contacts by name keyword (case-insensitive)', async () => {
      const res = await request(app)
        .get('/api/v1/contacts?search=avishek')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].name).toBe('Avishek Mukherjee');
    });

    it('searches contacts by email substring', async () => {
      const res = await request(app)
        .get('/api/v1/contacts?search=techcorp.com')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(2); // John Doe & Alice Brown
    });

    it('searches contacts by phone number digits', async () => {
      const res = await request(app)
        .get('/api/v1/contacts?search=9876543210')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].phone).toBe('+919876543210');
    });

    it('convenience search endpoint GET /api/v1/contacts/search?q=... works identically', async () => {
      const res = await request(app)
        .get('/api/v1/contacts/search?q=carlos')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].name).toBe('Carlos Garcia');
    });
  });

  describe('Filtering Functionality', () => {
    it('filters by companyName', async () => {
      const res = await request(app)
        .get('/api/v1/contacts?companyName=TechCorp')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(2);
      expect(res.body.data.items.every((c) => c.companyName === 'TechCorp')).toBe(true);
    });

    it('filters by city and country simultaneously', async () => {
      const res = await request(app)
        .get('/api/v1/contacts?city=Kolkata&country=India')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].city).toBe('Kolkata');
    });
  });

  describe('Sorting Functionality', () => {
    it('sorts contacts by name ascending', async () => {
      const res = await request(app)
        .get('/api/v1/contacts?sort=name&order=asc')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const names = res.body.data.items.map((c) => c.name);
      expect(names[0]).toBe('Alice Brown');
      expect(names[1]).toBe('Avishek Mukherjee');
    });

    it('sorts contacts by name descending', async () => {
      const res = await request(app)
        .get('/api/v1/contacts?sort=name&order=desc')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const names = res.body.data.items.map((c) => c.name);
      expect(names[0]).toBe('John Doe');
      expect(names[names.length - 1]).toBe('Alice Brown');
    });
  });

  describe('Pagination Functionality', () => {
    it('paginates results with custom limit and page', async () => {
      const res = await request(app)
        .get('/api/v1/contacts?page=1&limit=2&sort=name&order=asc')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.items).toHaveLength(2);
      expect(res.body.data.pagination).toEqual({
        page: 1,
        limit: 2,
        totalItems: 5,
        totalPages: 3
      });
    });

    it('returns empty items array and accurate pagination when no contacts match', async () => {
      const res = await request(app)
        .get('/api/v1/contacts?search=NonExistentKeyword999')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.items).toEqual([]);
      expect(res.body.data.pagination.totalItems).toBe(0);
      expect(res.body.data.pagination.totalPages).toBe(0);
    });
  });
});
