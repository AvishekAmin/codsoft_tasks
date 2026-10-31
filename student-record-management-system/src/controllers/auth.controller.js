import * as authService from '../services/auth.service.js';
import ApiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  return ApiResponse.created(res, 'User registered successfully', result);
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  return ApiResponse.success(res, 'Login successful', result);
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.tokenPayload);
  return ApiResponse.success(res, 'Logout successful. Token has been revoked.', {});
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user.id);
  return ApiResponse.success(res, 'Current user profile retrieved successfully', { user });
});

export default {
  register,
  login,
  logout,
  getMe
};
