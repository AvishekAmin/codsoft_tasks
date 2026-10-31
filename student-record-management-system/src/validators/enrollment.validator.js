import { z } from 'zod';
import { uuidSchema } from './student.validator.js';

export const enrollmentParamsSchema = z.object({
  id: uuidSchema
});

export const studentEnrollmentsParamsSchema = z.object({
  id: uuidSchema
});

export const courseStudentsParamsSchema = z.object({
  id: uuidSchema
});

export const createEnrollmentSchema = z.object({
  body: z.object({
    studentId: uuidSchema,
    courseId: uuidSchema,
    enrollmentDate: z
      .string()
      .datetime({ message: 'Enrollment date must be a valid ISO 8601 date string' })
      .optional(),
    status: z
      .enum(['ENROLLED', 'COMPLETED', 'WITHDRAWN'], {
        errorMap: () => ({ message: 'Status must be ENROLLED, COMPLETED, or WITHDRAWN' })
      })
      .optional()
      .default('ENROLLED'),
    grade: z
      .number()
      .min(0, 'Grade cannot be less than 0')
      .max(100, 'Grade cannot exceed 100')
      .optional()
      .nullable()
  }).strict()
});

export const updateEnrollmentSchema = z.object({
  params: enrollmentParamsSchema,
  body: z.object({
    status: z
      .enum(['ENROLLED', 'COMPLETED', 'WITHDRAWN'], {
        errorMap: () => ({ message: 'Status must be ENROLLED, COMPLETED, or WITHDRAWN' })
      })
      .optional(),
    grade: z
      .number()
      .min(0, 'Grade cannot be less than 0')
      .max(100, 'Grade cannot exceed 100')
      .optional()
      .nullable(),
    enrollmentDate: z
      .string()
      .datetime({ message: 'Enrollment date must be a valid ISO 8601 date string' })
      .optional()
  }).strict()
});

export const enrollmentQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(10),
    studentId: uuidSchema.optional(),
    courseId: uuidSchema.optional(),
    status: z.enum(['ENROLLED', 'COMPLETED', 'WITHDRAWN']).optional(),
    enrollmentDateFrom: z.string().datetime().optional(),
    enrollmentDateTo: z.string().datetime().optional(),
    sort: z.enum(['enrollmentDate', 'createdAt', 'status', 'grade']).optional().default('createdAt'),
    order: z.enum(['asc', 'desc', 'ASC', 'DESC']).optional().default('desc')
  })
});
