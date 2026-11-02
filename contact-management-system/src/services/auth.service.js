import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../config/db.js';
import env from '../config/env.js';
import { AppError } from '../middleware/error.middleware.js';

/**
 * Removes sensitive fields like passwordHash from user records.
 *
 * @param {object} user
 * @returns {object} Clean user profile
 */
export const sanitizeUser = (user) => {
  if (!user) return null;
  const { passwordHash, ...cleanUser } = user;
  return cleanUser;
};

/**
 * Generates a signed JWT access token containing standard payload and unique JTI.
 *
 * @param {object} user
 * @param {string} [jti]
 * @returns {string} Signed JWT
 */
export const generateToken = (user, jti = crypto.randomUUID()) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      jti
    },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN
    }
  );
};

/**
 * Registers a new user account with hashed password.
 *
 * @param {object} payload
 * @param {string} payload.name
 * @param {string} payload.email
 * @param {string} payload.password
 * @returns {Promise<object>} Sanitized created user
 */
export const registerUser = async ({ name, email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });

  if (existingUser) {
    throw new AppError('A user account with this email address already exists', 409);
  }

  const salt = await bcrypt.genSalt(env.BCRYPT_SALT_ROUNDS);
  const passwordHash = await bcrypt.hash(password, salt);

  const newUser = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash
    }
  });

  return sanitizeUser(newUser);
};

/**
 * Authenticates user credentials and generates a session access token.
 *
 * @param {object} credentials
 * @param {string} credentials.email
 * @param {string} credentials.password
 * @returns {Promise<{ token: string, user: object }>}
 */
export const loginUser = async ({ email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });

  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = generateToken(user);

  return {
    token,
    user: sanitizeUser(user)
  };
};

/**
 * Invalidates a JWT by recording its JTI in the revoked tokens repository.
 *
 * @param {object} params
 * @param {string} params.jti
 * @param {string} params.userId
 * @param {Date} [params.expiresAt]
 * @returns {Promise<void>}
 */
export const logoutUser = async ({ jti, userId, expiresAt }) => {
  if (!jti) return;

  const expirationDate = expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.revokedToken.create({
    data: {
      tokenId: jti,
      userId: userId || null,
      expiresAt: expirationDate
    }
  });
};
