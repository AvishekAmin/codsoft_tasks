import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import env from '../src/config/env.js';
import inMemoryPrisma from '../src/config/testDb.js';

export const mockAdminUser = {
  id: 'a0000000-0000-0000-0000-000000000001',
  name: 'System Administrator',
  email: 'admin@example.com',
  passwordHash: '$2a$10$wO3nE8ZqJmR1Vz4L9w8NseLq3p4Mvj6h8Y6gZ1r4W9lQ2k7V8o3mG',
  role: 'ADMIN',
  createdAt: new Date(),
  updatedAt: new Date()
};

export const mockStaffUser = {
  id: 's0000000-0000-0000-0000-000000000002',
  name: 'Staff Member',
  email: 'staff@example.com',
  passwordHash: '$2a$10$wO3nE8ZqJmR1Vz4L9w8NseLq3p4Mvj6h8Y6gZ1r4W9lQ2k7V8o3mG',
  role: 'STAFF',
  createdAt: new Date(),
  updatedAt: new Date()
};

export const createTestToken = (user, jti = 'test-token-jti-12345') => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      jti
    },
    env.JWT_SECRET,
    {
      expiresIn: '2h'
    }
  );
};

export const getAdminToken = () => createTestToken(mockAdminUser, 'admin-token-jti');
export const getStaffToken = () => createTestToken(mockStaffUser, 'staff-token-jti');

export const resetTestDb = async () => {
  inMemoryPrisma.reset();

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Admin@SecurePassword123!', salt);
  mockAdminUser.passwordHash = passwordHash;

  const staffHash = await bcrypt.hash('StaffPassword123!', salt);
  mockStaffUser.passwordHash = staffHash;

  inMemoryPrisma.users.push({ ...mockAdminUser });
  inMemoryPrisma.users.push({ ...mockStaffUser });
};

export { inMemoryPrisma };
