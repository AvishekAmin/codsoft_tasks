import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const quizIdParamSchema = z.object({
  params: z.object({
    quizId: z.string().regex(objectIdRegex, 'Invalid quiz ID format')
  })
});

export const createQuizSchema = z.object({
  body: z.object({
    title: z
      .string({ required_error: 'Title is required' })
      .trim()
      .min(3, 'Title must be at least 3 characters')
      .max(150, 'Title cannot exceed 150 characters'),
    description: z
      .string()
      .trim()
      .max(1000, 'Description cannot exceed 1000 characters')
      .optional()
      .default(''),
    durationMinutes: z
      .number({ required_error: 'Duration in minutes is required' })
      .int('Duration must be an integer')
      .min(1, 'Duration must be at least 1 minute')
      .max(300, 'Duration cannot exceed 300 minutes'),
    marksPerQuestion: z
      .number({ required_error: 'Marks per question is required' })
      .min(0.5, 'Marks per question must be at least 0.5')
      .default(1),
    negativeMarks: z
      .number()
      .min(0, 'Negative marks cannot be negative')
      .default(0),
    passPercentage: z
      .number()
      .min(0, 'Pass percentage cannot be less than 0')
      .max(100, 'Pass percentage cannot exceed 100')
      .default(50),
    randomizeQuestions: z.boolean().default(false)
  })
});

export const updateQuizSchema = z.object({
  params: z.object({
    quizId: z.string().regex(objectIdRegex, 'Invalid quiz ID format')
  }),
  body: z
    .object({
      title: z
        .string()
        .trim()
        .min(3, 'Title must be at least 3 characters')
        .max(150, 'Title cannot exceed 150 characters')
        .optional(),
      description: z
        .string()
        .trim()
        .max(1000, 'Description cannot exceed 1000 characters')
        .optional(),
      durationMinutes: z
        .number()
        .int('Duration must be an integer')
        .min(1, 'Duration must be at least 1 minute')
        .max(300, 'Duration cannot exceed 300 minutes')
        .optional(),
      marksPerQuestion: z
        .number()
        .min(0.5, 'Marks per question must be at least 0.5')
        .optional(),
      negativeMarks: z
        .number()
        .min(0, 'Negative marks cannot be negative')
        .optional(),
      passPercentage: z
        .number()
        .min(0, 'Pass percentage cannot be less than 0')
        .max(100, 'Pass percentage cannot exceed 100')
        .optional(),
      randomizeQuestions: z.boolean().optional(),
      status: z.enum(['draft', 'published']).optional()
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided for update'
    })
});

export const listQuizQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    search: z.string().trim().optional(),
    status: z.enum(['draft', 'published', 'all']).optional(),
    sort: z.string().default('createdAt'),
    order: z.enum(['asc', 'desc']).default('desc')
  })
});
