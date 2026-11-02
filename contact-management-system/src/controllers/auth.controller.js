import * as authService from '../services/auth.service.js';
import { successResponse } from '../utils/response.js';

export const register = async (req, res, next) => {
  try {
    const user = await authService.registerUser(req.body);
    return successResponse(res, 201, 'User registered successfully', user);
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const result = await authService.loginUser(req.body);
    return successResponse(res, 200, 'Login successful', result);
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    return successResponse(res, 200, 'User profile retrieved successfully', req.user);
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    await authService.logoutUser({
      jti: req.tokenJti,
      userId: req.user.id,
      expiresAt: req.tokenExpiresAt
    });
    return successResponse(res, 200, 'Logout successful. Token revoked.');
  } catch (error) {
    next(error);
  }
};
