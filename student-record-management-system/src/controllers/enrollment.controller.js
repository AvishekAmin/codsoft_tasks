import * as enrollmentService from '../services/enrollment.service.js';
import ApiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

export const createEnrollment = asyncHandler(async (req, res) => {
  const enrollment = await enrollmentService.createEnrollment(req.body);
  return ApiResponse.created(res, 'Student enrolled successfully', enrollment);
});

export const getEnrollments = asyncHandler(async (req, res) => {
  const { items, pagination } = await enrollmentService.getEnrollments(req.query);
  return ApiResponse.paginated(res, 'Enrollments retrieved successfully', items, pagination);
});

export const getEnrollmentById = asyncHandler(async (req, res) => {
  const enrollment = await enrollmentService.getEnrollmentById(req.params.id);
  return ApiResponse.success(res, 'Enrollment retrieved successfully', enrollment);
});

export const updateEnrollment = asyncHandler(async (req, res) => {
  const updatedEnrollment = await enrollmentService.updateEnrollment(req.params.id, req.body);
  return ApiResponse.success(res, 'Enrollment updated successfully', updatedEnrollment);
});

export const deleteEnrollment = asyncHandler(async (req, res) => {
  await enrollmentService.deleteEnrollment(req.params.id);
  return ApiResponse.noContent(res);
});

export default {
  createEnrollment,
  getEnrollments,
  getEnrollmentById,
  updateEnrollment,
  deleteEnrollment
};
