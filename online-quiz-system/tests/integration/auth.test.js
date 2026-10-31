import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app.js';
import { setupTestDB } from '../testHelper.js';

describe('Authentication Integration Tests', () => {
  setupTestDB();

  it('registers a participant successfully and enforces participant role', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Alice Participant',
        email: 'alice@example.com',
        password: 'Password123!',
        role: 'admin' // Attempting privilege escalation
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.role).toBe('participant'); // Escalation prevented
    expect(res.body.data.user.passwordHash).toBeUndefined(); // Never returned
    expect(res.body.data.token).toBeDefined();
  });

  it('rejects registration with duplicate email address', async () => {
    // First registration
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Bob Participant',
        email: 'bob@example.com',
        password: 'Password123!'
      });

    // Duplicate registration
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Bob Duplicate',
        email: 'bob@example.com',
        password: 'Password123!'
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('authenticates valid credentials and rejects incorrect password', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Charlie Participant',
        email: 'charlie@example.com',
        password: 'CorrectPassword123!'
      });

    // Invalid password
    const failRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'charlie@example.com',
        password: 'WrongPassword'
      });

    expect(failRes.status).toBe(401);
    expect(failRes.body.success).toBe(false);

    // Valid password
    const successRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'charlie@example.com',
        password: 'CorrectPassword123!'
      });

    expect(successRes.status).toBe(200);
    expect(successRes.body.success).toBe(true);
    expect(successRes.body.data.token).toBeDefined();
  });

  it('retrieves user profile for authenticated user via /auth/me', async () => {
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Dave Participant',
        email: 'dave@example.com',
        password: 'Password123!'
      });

    const token = regRes.body.data.token;

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe('dave@example.com');
  });

  it('revokes token on logout and rejects subsequent requests using revoked token', async () => {
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Eve Participant',
        email: 'eve@example.com',
        password: 'Password123!'
      });

    const token = regRes.body.data.token;

    // Logout
    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.success).toBe(true);

    // Try accessing /auth/me with the revoked token
    const blockedRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(blockedRes.status).toBe(401);
    expect(blockedRes.body.success).toBe(false);
  });
});
