import request from 'supertest';
import app from '../../src/app.js';
import { resetTestDb, getUser1Token } from '../testHelper.js';

describe('Auth Endpoints Integration Tests', () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  describe('POST /api/v1/auth/register', () => {
    it('successfully registers a new user account with hashed password (201)', async () => {
      const payload = {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'Password123!'
      };

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(payload)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.email).toBe('newuser@example.com');
      expect(res.body.data.name).toBe('New User');
      expect(res.body.data).not.toHaveProperty('passwordHash');
    });

    it('rejects duplicate email registration with 409 Conflict', async () => {
      const payload = {
        name: 'Duplicate Guy',
        email: 'avishek@example.com', // Already registered in resetTestDb
        password: 'Password123!'
      };

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(payload)
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already exists/i);
    });

    it('rejects short passwords with 400 Bad Request', async () => {
      const payload = {
        name: 'Short Password Guy',
        email: 'shortpass@example.com',
        password: 'pass'
      };

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(payload)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('rejects passwords without numbers with 400 Bad Request', async () => {
      const payload = {
        name: 'No Number Guy',
        email: 'nonumbers@example.com',
        password: 'PasswordWithoutNumbers'
      };

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(payload)
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('logs in successfully with valid credentials and returns JWT token (200)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'avishek@example.com',
          password: 'Password123!'
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data.user.email).toBe('avishek@example.com');
      expect(res.body.data.user).not.toHaveProperty('passwordHash');
    });

    it('rejects login with incorrect password with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'avishek@example.com',
          password: 'WrongPassword123!'
        })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid email or password/i);
    });

    it('rejects login for non-existent user with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'ghost@example.com',
          password: 'Password123!'
        })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid email or password/i);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('returns authenticated profile with valid token (200)', async () => {
      const token = getUser1Token();

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('avishek@example.com');
      expect(res.body.data).not.toHaveProperty('passwordHash');
    });

    it('rejects request without authorization header with 401', async () => {
      const res = await request(app).get('/api/v1/auth/me').expect(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects request with invalid token with 401', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.fake.token')
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('revokes token on logout and rejects subsequent calls using that token (401)', async () => {
      const jti = 'unique-logout-test-jti-1';
      const token = getUser1Token(jti);

      // Verify token works initially
      await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Perform logout
      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(logoutRes.body.success).toBe(true);

      // Subsequent call with the same token must be rejected
      const retryRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(retryRes.body.success).toBe(false);
      expect(retryRes.body.message).toMatch(/revoked/i);
    });
  });
});
