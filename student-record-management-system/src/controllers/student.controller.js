import * as studentService from '../services/student.service.js';
import ApiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

export const createStudent = asyncHandler(async (req, res) => {
  const student = await studentService.createStudent(req.body);
  return ApiResponse.created(res, 'Student record created successfully', student);
});

export const getStudents = asyncHandler(async (req, res) => {
  const { items, pagination } = await studentService.getStudents(req.query);
  return ApiResponse.paginated(res, 'Students retrieved successfully', items, pagination);
});

export const getStudentById = asyncHandler(async (req, res) => {
  const student = await studentService.getStudentById(req.params.id);
  return ApiResponse.success(res, 'Student retrieved successfully', student);
});

export const updateStudent = asyncHandler(async (req, res) => {
  const updatedStudent = await studentService.updateStudent(req.params.id, req.body);
  return ApiResponse.success(res, 'Student updated successfully', updatedStudent);
});

export const deleteStudent = asyncHandler(async (req, res) => {
  await studentService.deleteStudent(req.params.id);
  return ApiResponse.noContent(res);
});

export const getStudentEnrollments = asyncHandler(async (req, res) => {
  const { student, items, pagination } = await studentService.getStudentEnrollments(req.params.id, req.query);
  return ApiResponse.paginated(
    res,
    `Enrollments for student ${student.studentCode} retrieved successfully`,
    items,
    pagination
  );
});

export default {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  getStudentEnrollments
};
