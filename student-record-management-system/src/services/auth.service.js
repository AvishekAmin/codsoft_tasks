import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';
import env from '../config/env.js';
import ApiError from '../utils/apiError.js';

/**
 * Sanitizes user record by removing passwordHash.
 */
export const sanitizeUser = (user) => {
  if (!user) return null;
  const { passwordHash, ...sanitized } = user;
  return sanitized;
};

/**
 * Generates JWT token with jti (JWT ID) for revocation tracking.
 */
export const generateToken = (user) => {
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      jti
    },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN
    }
  );

  return { token, jti };
};

export const register = async ({ name, email, password }) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });

  if (existingUser) {
    throw ApiError.conflict('An account with this email address already exists');
  }

  // Hash password
  const salt = await bcrypt.genSalt(env.BCRYPT_SALT_ROUNDS);
  const passwordHash = await bcrypt.hash(password, salt);

  // Always register as STAFF to prevent unauthorized admin escalation
  const newUser = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: 'STAFF'
    }
  });

  const { token } = generateToken(newUser);

  return {
    user: sanitizeUser(newUser),
    token
  };
};

export const login = async ({ email, password }) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Find user by normalized email
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });

  if (!user) {
    throw ApiError.unauthorized('Invalid email or password credentials');
  }

  // Verify password hash
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw ApiError.unauthorized('Invalid email or password credentials');
  }

  const { token } = generateToken(user);

  return {
    user: sanitizeUser(user),
    token
  };
};

export const logout = async (tokenPayload) => {
  if (!tokenPayload?.jti) {
    return;
  }

  const expiresAt = tokenPayload.exp
    ? new Date(tokenPayload.exp * 1000)
    : new Date(Date.now() + 24 * 60 * 60 * 1000);

  // Store revoked token identifier
  await prisma.revokedToken.create({
    data: {
      tokenId: tokenPayload.jti,
      expiresAt
    }
  });

  // Opportunistic cleanup of expired tokens
  try {
    await prisma.revokedToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    });
  } catch (err) {
    // Non-blocking cleanup failure
  }
};

export const getMe = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  return sanitizeUser(user);
};

export default {
  sanitizeUser,
  generateToken,
  register,
  login,
  logout,
  getMe
};
