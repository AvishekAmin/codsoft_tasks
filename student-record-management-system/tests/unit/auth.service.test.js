import jwt from 'jsonwebtoken';
import { sanitizeUser, generateToken } from '../../src/services/auth.service.js';
import env from '../../src/config/env.js';

describe('Auth Service Unit Tests', () => {
  const dummyUser = {
    id: 'user-uuid-1234',
    name: 'Test User',
    email: 'test@example.com',
    passwordHash: '$2a$10$hashedsecretpasswordhere',
    role: 'STAFF',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  test('sanitizeUser strips passwordHash from user object', () => {
    const sanitized = sanitizeUser(dummyUser);
    expect(sanitized).toBeDefined();
    expect(sanitized.passwordHash).toBeUndefined();
    expect(sanitized.id).toBe(dummyUser.id);
    expect(sanitized.email).toBe(dummyUser.email);
    expect(sanitized.role).toBe(dummyUser.role);
  });

  test('generateToken produces valid signed JWT with jti', () => {
    const { token, jti } = generateToken(dummyUser);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(jti).toBeDefined();
    expect(typeof jti).toBe('string');

    const decoded = jwt.verify(token, env.JWT_SECRET);
    expect(decoded.id).toBe(dummyUser.id);
    expect(decoded.email).toBe(dummyUser.email);
    expect(decoded.role).toBe(dummyUser.role);
    expect(decoded.jti).toBe(jti);
  });
});
