import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { TokenBlocklist } from '../models/TokenBlocklist.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      name: user.name,
      email: user.email
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn
    }
  );
};

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw ApiError.conflict('An account with this email address already exists');
  }

  // Hash password
  const salt = await bcrypt.genSalt(env.bcryptSaltRounds);
  const passwordHash = await bcrypt.hash(password, salt);

  // Security constraint: Public registration always creates a participant
  const user = await User.create({
    name,
    email,
    passwordHash,
    role: 'participant'
  });

  const token = generateToken(user);

  return ApiResponse.created(res, 'User registered successfully', {
    user: user.toJSON(),
    token
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const token = generateToken(user);

  return ApiResponse.success(res, 'Login successful', {
    user: user.toJSON(),
    token
  });
});

export const getMe = asyncHandler(async (req, res) => {
  return ApiResponse.success(res, 'Current user profile fetched successfully', {
    user: req.user.toJSON()
  });
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.token;
  const tokenPayload = req.tokenPayload;

  if (token) {
    // Determine expiration date from token or default to 24 hours
    const expiresAt = tokenPayload && tokenPayload.exp
      ? new Date(tokenPayload.exp * 1000)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Save token to revocation blocklist
    await TokenBlocklist.findOneAndUpdate(
      { token },
      { token, expiresAt },
      { upsert: true, new: true }
    );
  }

  return ApiResponse.success(res, 'Logged out successfully. Authentication token has been invalidated.');
});
