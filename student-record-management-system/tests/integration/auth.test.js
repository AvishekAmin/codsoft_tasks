import request from 'supertest';
import app from '../../src/app.js';
import { resetTestDb, getAdminToken, getStaffToken } from '../testHelper.js';

describe('Auth Endpoints Integration Tests', () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  describe('POST /api/v1/auth/register', () => {
    test('successfully registers a new staff account', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'New Staff',
          email: 'newstaff@example.com',
          password: 'Password123!'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe('newstaff@example.com');
      expect(res.body.data.user.role).toBe('STAFF');
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(res.body.data.token).toBeDefined();
    });

    test('rejects duplicate email registration with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Duplicate Staff',
          email: 'staff@example.com', // already seeded
          password: 'Password123!'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });

    test('rejects short passwords with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Short Password User',
          email: 'shortpass@example.com',
          password: '123'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('rejects role escalation to ADMIN with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Hacker User',
          email: 'hacker@example.com',
          password: 'Password123!',
          role: 'ADMIN'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    test('logs in successfully with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'Admin@SecurePassword123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.role).toBe('ADMIN');
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });

    test('rejects login with incorrect password with 401', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'WrongPassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('rejects login for non-existent user with 401', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'ghost@example.com',
          password: 'Password123!'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    test('returns authenticated profile with valid token', async () => {
      const token = getAdminToken();

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('admin@example.com');
      expect(res.body.data.user.role).toBe('ADMIN');
    });

    test('rejects request without authorization header with 401', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('rejects request with invalid token with 401', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token-string');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    test('revokes token on logout and rejects subsequent calls', async () => {
      // 1. Log in to get a fresh token with real jti
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'Admin@SecurePassword123!'
        });

      const token = loginRes.body.data.token;

      // 2. Call /auth/me to verify it works
      const meResBefore = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(meResBefore.status).toBe(200);

      // 3. Logout
      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`);
      expect(logoutRes.status).toBe(200);

      // 4. Try using the same token again -> should be rejected with 401
      const meResAfter = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(meResAfter.status).toBe(401);
      expect(meResAfter.body.message).toContain('revoked');
    });
  });
});
