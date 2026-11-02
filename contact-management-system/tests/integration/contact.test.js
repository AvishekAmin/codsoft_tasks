import request from 'supertest';
import app from '../../src/app.js';
import { resetTestDb, getUser1Token } from '../testHelper.js';

describe('Contact CRUD Endpoints Integration Tests', () => {
  let token;

  beforeEach(async () => {
    await resetTestDb();
    token = getUser1Token();
  });

  describe('POST /api/v1/contacts', () => {
    it('creates a complete contact record successfully (201)', async () => {
      const payload = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1 (555) 123-4567',
        companyName: 'TechCorp',
        jobTitle: 'Senior Software Engineer',
        addressLine1: '100 Market St',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94105',
        country: 'USA',
        notes: 'Tech lead contact'
      };

      const res = await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${token}`)
        .send(payload)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.name).toBe('John Doe');
      expect(res.body.data.email).toBe('john.doe@example.com');
      expect(res.body.data.phone).toBe('+15551234567');
      expect(res.body.data.companyName).toBe('TechCorp');
    });

    it('creates a contact with phone only (no email) (201)', async () => {
      const payload = {
        name: 'Alice Brown',
        phone: '+1-555-333-2211',
        companyName: 'TechCorp'
      };

      const res = await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${token}`)
        .send(payload)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBeNull();
      expect(res.body.data.phone).toBe('+15553332211');
    });

    it('creates a contact with email only (no phone) (201)', async () => {
      const payload = {
        name: 'Carlos Garcia',
        email: 'carlos.garcia@global.es',
        city: 'Madrid',
        country: 'Spain'
      };

      const res = await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${token}`)
        .send(payload)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('carlos.garcia@global.es');
      expect(res.body.data.phone).toBeNull();
    });

    it('rejects contact creation when neither email nor phone is provided (400)', async () => {
      const payload = {
        name: 'Ghost Contact',
        companyName: 'Unknown Corp'
      };

      const res = await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${token}`)
        .send(payload)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/validation failed/i);
    });

    it('rejects contact creation with missing name (400)', async () => {
      const payload = {
        email: 'noname@example.com',
        phone: '+15551234567'
      };

      const res = await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${token}`)
        .send(payload)
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/contacts/:contactId', () => {
    it('retrieves an existing contact by valid UUID (200)', async () => {
      const created = await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Jane Smith',
          email: 'jane.smith@designco.com'
        })
        .expect(201);

      const contactId = created.body.data.id;

      const res = await request(app)
        .get(`/api/v1/contacts/${contactId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(contactId);
      expect(res.body.data.name).toBe('Jane Smith');
    });

    it('rejects malformed UUID with 400 Bad Request', async () => {
      const res = await request(app)
        .get('/api/v1/contacts/not-a-valid-uuid')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/validation failed/i);
    });

    it('returns 404 for non-existent UUID', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000099';
      const res = await request(app)
        .get(`/api/v1/contacts/${fakeUuid}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.success).toBe(false);
    });
  });

  describe('PATCH /api/v1/contacts/:contactId', () => {
    it('updates allowed contact details successfully (200)', async () => {
      const created = await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Rahul Sharma',
          email: 'rahul@innovate.in',
          phone: '+91 98765 43210'
        })
        .expect(201);

      const contactId = created.body.data.id;

      const res = await request(app)
        .patch(`/api/v1/contacts/${contactId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          jobTitle: 'Head of Engineering',
          companyName: 'Innovate Labs India'
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.jobTitle).toBe('Head of Engineering');
      expect(res.body.data.companyName).toBe('Innovate Labs India');
      expect(res.body.data.name).toBe('Rahul Sharma');
    });

    it('rejects updates that would clear all contact methods (400)', async () => {
      const created = await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Contact With Only Email',
          email: 'onlyemail@example.com'
        })
        .expect(201);

      const contactId = created.body.data.id;

      // Attempting to clear the email while phone is null
      const res = await request(app)
        .patch(`/api/v1/contacts/${contactId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: null
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/retain at least one contact method/i);
    });
  });

  describe('DELETE /api/v1/contacts/:contactId', () => {
    it('deletes a contact and returns 204 No Content without body', async () => {
      const created = await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Contact to Delete',
          email: 'delete.me@example.com'
        })
        .expect(201);

      const contactId = created.body.data.id;

      const deleteRes = await request(app)
        .delete(`/api/v1/contacts/${contactId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      expect(deleteRes.text).toBe('');

      // Verify it is gone
      await request(app)
        .get(`/api/v1/contacts/${contactId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('returns 404 for deleting non-existent contact', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000099';
      await request(app)
        .delete(`/api/v1/contacts/${fakeUuid}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });
});
