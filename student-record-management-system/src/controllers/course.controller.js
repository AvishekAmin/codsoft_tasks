import * as courseService from '../services/course.service.js';
import ApiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

export const createCourse = asyncHandler(async (req, res) => {
  const course = await courseService.createCourse(req.body);
  return ApiResponse.created(res, 'Course created successfully', course);
});

export const getCourses = asyncHandler(async (req, res) => {
  const { items, pagination } = await courseService.getCourses(req.query);
  return ApiResponse.paginated(res, 'Courses retrieved successfully', items, pagination);
});

export const getCourseById = asyncHandler(async (req, res) => {
  const course = await courseService.getCourseById(req.params.id);
  return ApiResponse.success(res, 'Course retrieved successfully', course);
});

export const updateCourse = asyncHandler(async (req, res) => {
  const updatedCourse = await courseService.updateCourse(req.params.id, req.body);
  return ApiResponse.success(res, 'Course updated successfully', updatedCourse);
});

export const deleteCourse = asyncHandler(async (req, res) => {
  await courseService.deleteCourse(req.params.id);
  return ApiResponse.noContent(res);
});

export const getCourseStudents = asyncHandler(async (req, res) => {
  const { course, items, pagination } = await courseService.getCourseStudents(req.params.id, req.query);
  return ApiResponse.paginated(
    res,
    `Students enrolled in course ${course.courseCode} retrieved successfully`,
    items,
    pagination
  );
});

export default {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  getCourseStudents
};
