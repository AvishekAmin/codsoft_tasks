import { z } from 'zod';

export const uuidSchema = z.string().uuid({ message: 'Invalid identifier: must be a valid UUID v4' });

export const studentParamsSchema = z.object({
  id: uuidSchema
});

export const createStudentSchema = z.object({
  body: z.object({
    studentCode: z
      .string({ required_error: 'Student code is required' })
      .trim()
      .min(2, 'Student code must be at least 2 characters')
      .max(30, 'Student code cannot exceed 30 characters')
      .toUpperCase(),
    firstName: z
      .string({ required_error: 'First name is required' })
      .trim()
      .min(1, 'First name cannot be empty')
      .max(50, 'First name cannot exceed 50 characters'),
    lastName: z
      .string({ required_error: 'Last name is required' })
      .trim()
      .min(1, 'Last name cannot be empty')
      .max(50, 'Last name cannot exceed 50 characters'),
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .email('Invalid email address format')
      .toLowerCase(),
    phone: z
      .string()
      .trim()
      .max(20, 'Phone cannot exceed 20 characters')
      .optional()
      .nullable(),
    dateOfBirth: z
      .string()
      .datetime({ message: 'Date of birth must be a valid ISO 8601 date string' })
      .optional()
      .nullable(),
    gender: z
      .string()
      .trim()
      .max(20, 'Gender cannot exceed 20 characters')
      .optional()
      .nullable(),
    address: z
      .string()
      .trim()
      .max(255, 'Address cannot exceed 255 characters')
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

export const updateStudentSchema = z.object({
  params: studentParamsSchema,
  body: z.object({
    studentCode: z
      .string()
      .trim()
      .min(2, 'Student code must be at least 2 characters')
      .max(30, 'Student code cannot exceed 30 characters')
      .toUpperCase()
      .optional(),
    firstName: z
      .string()
      .trim()
      .min(1, 'First name cannot be empty')
      .max(50, 'First name cannot exceed 50 characters')
      .optional(),
    lastName: z
      .string()
      .trim()
      .min(1, 'Last name cannot be empty')
      .max(50, 'Last name cannot exceed 50 characters')
      .optional(),
    email: z
      .string()
      .trim()
      .email('Invalid email address format')
      .toLowerCase()
      .optional(),
    phone: z
      .string()
      .trim()
      .max(20, 'Phone cannot exceed 20 characters')
      .optional()
      .nullable(),
    dateOfBirth: z
      .string()
      .datetime({ message: 'Date of birth must be a valid ISO 8601 date string' })
      .optional()
      .nullable(),
    gender: z
      .string()
      .trim()
      .max(20, 'Gender cannot exceed 20 characters')
      .optional()
      .nullable(),
    address: z
      .string()
      .trim()
      .max(255, 'Address cannot exceed 255 characters')
      .optional()
      .nullable(),
    status: z
      .enum(['ACTIVE', 'INACTIVE'], {
        errorMap: () => ({ message: 'Status must be ACTIVE or INACTIVE' })
      })
      .optional()
  }).strict()
});

export const studentQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(10),
    search: z.string().trim().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    sort: z.enum(['studentCode', 'firstName', 'lastName', 'email', 'createdAt', 'status']).optional().default('createdAt'),
    order: z.enum(['asc', 'desc', 'ASC', 'DESC']).optional().default('desc')
  })
});
