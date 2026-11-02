import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import env from '../src/config/env.js';
import inMemoryPrisma from '../src/config/testDb.js';

export const mockUser1 = {
  id: 'u1000000-0000-0000-0000-000000000001',
  name: 'Avishek Mukherjee',
  email: 'avishek@example.com',
  passwordHash: '$2a$10$wO3nE8ZqJmR1Vz4L9w8NseLq3p4Mvj6h8Y6gZ1r4W9lQ2k7V8o3mG',
  createdAt: new Date(),
  updatedAt: new Date()
};

export const mockUser2 = {
  id: 'u2000000-0000-0000-0000-000000000002',
  name: 'Priya Roy',
  email: 'priya@example.com',
  passwordHash: '$2a$10$wO3nE8ZqJmR1Vz4L9w8NseLq3p4Mvj6h8Y6gZ1r4W9lQ2k7V8o3mG',
  createdAt: new Date(),
  updatedAt: new Date()
};

export const createTestToken = (user, jti = 'test-token-jti-12345') => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      jti
    },
    env.JWT_SECRET,
    {
      expiresIn: '24h'
    }
  );
};

export const getUser1Token = (jti = 'user1-token-jti') => createTestToken(mockUser1, jti);
export const getUser2Token = (jti = 'user2-token-jti') => createTestToken(mockUser2, jti);

export const resetTestDb = async () => {
  inMemoryPrisma.reset();

  const salt = await bcrypt.genSalt(10);
  const hash1 = await bcrypt.hash('Password123!', salt);
  const hash2 = await bcrypt.hash('Password123!', salt);

  mockUser1.passwordHash = hash1;
  mockUser2.passwordHash = hash2;

  inMemoryPrisma.users.push({ ...mockUser1 });
  inMemoryPrisma.users.push({ ...mockUser2 });
};

export { inMemoryPrisma };
