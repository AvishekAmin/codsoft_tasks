import jwt from 'jsonwebtoken';
import env from '../../src/config/env.js';
import { sanitizeUser, generateToken } from '../../src/services/auth.service.js';

describe('Auth Service Unit Tests', () => {
  it('sanitizeUser strips passwordHash from user object', () => {
    const rawUser = {
      id: 'test-uuid-1',
      name: 'Avishek Mukherjee',
      email: 'avishek@example.com',
      passwordHash: '$2a$10$encryptedSecretHashValue12345',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const clean = sanitizeUser(rawUser);
    expect(clean).not.toHaveProperty('passwordHash');
    expect(clean.id).toBe(rawUser.id);
    expect(clean.name).toBe(rawUser.name);
    expect(clean.email).toBe(rawUser.email);
  });

  it('generateToken produces valid signed JWT with jti', () => {
    const user = {
      id: 'user-uuid-1',
      email: 'avishek@example.com'
    };

    const token = generateToken(user, 'custom-jti-token-id');
    expect(typeof token).toBe('string');

    const decoded = jwt.verify(token, env.JWT_SECRET);
    expect(decoded.id).toBe(user.id);
    expect(decoded.email).toBe(user.email);
    expect(decoded.jti).toBe('custom-jti-token-id');
  });
});
