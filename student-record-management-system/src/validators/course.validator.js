import { z } from 'zod';
import { uuidSchema } from './student.validator.js';

export const courseParamsSchema = z.object({
  id: uuidSchema
});

export const createCourseSchema = z.object({
  body: z.object({
    courseCode: z
      .string({ required_error: 'Course code is required' })
      .trim()
      .min(2, 'Course code must be at least 2 characters')
      .max(20, 'Course code cannot exceed 20 characters')
      .toUpperCase(),
    title: z
      .string({ required_error: 'Title is required' })
      .trim()
      .min(2, 'Course title must be at least 2 characters')
      .max(100, 'Course title cannot exceed 100 characters'),
    description: z
      .string()
      .trim()
      .max(1000, 'Description cannot exceed 1000 characters')
      .optional()
      .nullable(),
    department: z
      .string()
      .trim()
      .max(100, 'Department cannot exceed 100 characters')
      .optional()
      .nullable(),
    credits: z
      .number({ required_error: 'Credits is required' })
      .int('Credits must be an integer')
      .min(1, 'Credits must be at least 1')
      .max(10, 'Credits cannot exceed 10'),
    instructor: z
      .string()
      .trim()
      .max(100, 'Instructor name cannot exceed 100 characters')
      .optional()
      .nullable(),
    status: z
      .enum(['ACTIVE', 'INACTIVE'], {
        errorMap: () => ({ message: 'Status must be ACTIVE or INACTIVE' })
      })
      .optional()
      .default('ACTIVE')
  }).strict()
});

export const updateCourseSchema = z.object({
  params: courseParamsSchema,
  body: z.object({
    courseCode: z
      .string()
      .trim()
      .min(2, 'Course code must be at least 2 characters')
      .max(20, 'Course code cannot exceed 20 characters')
      .toUpperCase()
      .optional(),
    title: z
      .string()
      .trim()
      .min(2, 'Course title must be at least 2 characters')
      .max(100, 'Course title cannot exceed 100 characters')
      .optional(),
    description: z
      .string()
      .trim()
      .max(1000, 'Description cannot exceed 1000 characters')
      .optional()
      .nullable(),
    department: z
      .string()
      .trim()
      .max(100, 'Department cannot exceed 100 characters')
      .optional()
      .nullable(),
    credits: z
      .number()
      .int('Credits must be an integer')
      .min(1, 'Credits must be at least 1')
      .max(10, 'Credits cannot exceed 10')
      .optional(),
    instructor: z
      .string()
      .trim()
      .max(100, 'Instructor name cannot exceed 100 characters')
      .optional()
      .nullable(),
    status: z
      .enum(['ACTIVE', 'INACTIVE'], {
        errorMap: () => ({ message: 'Status must be ACTIVE or INACTIVE' })
      })
      .optional()
  }).strict()
});

export const courseQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(10),
    search: z.string().trim().optional(),
    department: z.string().trim().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    sort: z.enum(['courseCode', 'title', 'credits', 'department', 'createdAt', 'status']).optional().default('createdAt'),
    order: z.enum(['asc', 'desc', 'ASC', 'DESC']).optional().default('desc')
  })
});
