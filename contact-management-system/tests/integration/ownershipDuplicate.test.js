import request from 'supertest';
import app from '../../src/app.js';
import { resetTestDb, getUser1Token, getUser2Token } from '../testHelper.js';

describe('Ownership Isolation and Duplicate Prevention Tests', () => {
  let user1Token;
  let user2Token;

  beforeEach(async () => {
    await resetTestDb();
    user1Token = getUser1Token();
    user2Token = getUser2Token();
  });

  describe('Multi-Tenant Contact Ownership Isolation', () => {
    it('User 1 can view their own contact, but User 2 receives 404 for User 1 contact', async () => {
      // User 1 creates contact
      const createRes = await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Private Contact of User 1',
          email: 'user1.private@example.com'
        })
        .expect(201);

      const contactId = createRes.body.data.id;

      // User 1 can access it
      const user1Get = await request(app)
        .get(`/api/v1/contacts/${contactId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(user1Get.body.data.name).toBe('Private Contact of User 1');

      // User 2 is rejected with 404 Not Found
      const user2Get = await request(app)
        .get(`/api/v1/contacts/${contactId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(404);

      expect(user2Get.body.success).toBe(false);
    });

    it('User 2 cannot update User 1 contact (404 Not Found)', async () => {
      const createRes = await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Target Contact',
          email: 'target@example.com'
        })
        .expect(201);

      const contactId = createRes.body.data.id;

      await request(app)
        .patch(`/api/v1/contacts/${contactId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ name: 'Hacked Name' })
        .expect(404);

      // Verify User 1 contact was not changed
      const verifyRes = await request(app)
        .get(`/api/v1/contacts/${contactId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(verifyRes.body.data.name).toBe('Target Contact');
    });

    it('User 2 cannot delete User 1 contact (404 Not Found)', async () => {
      const createRes = await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Protected Contact',
          email: 'protected@example.com'
        })
        .expect(201);

      const contactId = createRes.body.data.id;

      await request(app)
        .delete(`/api/v1/contacts/${contactId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(404);

      // Verify contact still exists under User 1
      await request(app)
        .get(`/api/v1/contacts/${contactId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);
    });

    it('Listing contacts returns only records owned by the authenticated caller', async () => {
      // User 1 creates 2 contacts
      await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ name: 'User 1 Contact A', email: 'u1a@example.com' })
        .expect(201);

      await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ name: 'User 1 Contact B', email: 'u1b@example.com' })
        .expect(201);

      // User 2 creates 1 contact
      await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ name: 'User 2 Contact C', email: 'u2c@example.com' })
        .expect(201);

      // User 1 listing must only have 2 items
      const u1List = await request(app)
        .get('/api/v1/contacts')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(u1List.body.data.items).toHaveLength(2);
      expect(u1List.body.data.items.every((c) => c.name.startsWith('User 1'))).toBe(true);

      // User 2 listing must only have 1 item
      const u2List = await request(app)
        .get('/api/v1/contacts')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      expect(u2List.body.data.items).toHaveLength(1);
      expect(u2List.body.data.items[0].name).toBe('User 2 Contact C');
    });
  });

  describe('Duplicate Prevention Rules and Owner-Scoped Uniqueness', () => {
    it('rejects duplicate normalized email within the same user contacts (409 Conflict)', async () => {
      await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'First Entry',
          email: 'shared.email@example.com'
        })
        .expect(201);

      // Attempt second entry with same normalized email (case/whitespace variation)
      const dupRes = await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Second Entry',
          email: 'Shared.Email@Example.com '
        })
        .expect(409);

      expect(dupRes.body.success).toBe(false);
      expect(dupRes.body.message).toMatch(/already exists/i);
    });

    it('rejects duplicate normalized phone number within the same user contacts (409 Conflict)', async () => {
      await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'First Phone Entry',
          phone: '+1 (555) 123-4567'
        })
        .expect(201);

      // Attempt second entry with same normalized phone formatted differently
      const dupRes = await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Second Phone Entry',
          phone: '+1-555-123-4567'
        })
        .expect(409);

      expect(dupRes.body.success).toBe(false);
      expect(dupRes.body.message).toMatch(/already exists/i);
    });

    it('permits the same email and phone for different owners', async () => {
      const email = 'common.external.partner@example.com';
      const phone = '+15559998888';

      // User 1 stores partner contact
      await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Partner (User 1 copy)',
          email,
          phone
        })
        .expect(201);

      // User 2 legitimately stores the same person's contact info
      const u2Res = await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          name: 'Partner (User 2 copy)',
          email,
          phone
        })
        .expect(201);

      expect(u2Res.body.success).toBe(true);
      expect(u2Res.body.data.email).toBe(email);
    });

    it('permits contacts with identical names if email/phone differ', async () => {
      await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'John Smith',
          email: 'john.smith.1@example.com'
        })
        .expect(201);

      const secondContact = await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'John Smith',
          email: 'john.smith.2@example.com'
        })
        .expect(201);

      expect(secondContact.body.success).toBe(true);
      expect(secondContact.body.data.name).toBe('John Smith');
    });

    it('rejects updating email to match another contact belonging to the same user (409)', async () => {
      await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ name: 'Contact A', email: 'contact.a@example.com' })
        .expect(201);

      const contactB = await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ name: 'Contact B', email: 'contact.b@example.com' })
        .expect(201);

      const contactBId = contactB.body.data.id;

      // Try updating Contact B to use Contact A's email
      const patchRes = await request(app)
        .patch(`/api/v1/contacts/${contactBId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ email: 'contact.a@example.com' })
        .expect(409);

      expect(patchRes.body.success).toBe(false);
      expect(patchRes.body.message).toMatch(/already exists/i);
    });
  });
});
