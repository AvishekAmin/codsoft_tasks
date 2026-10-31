import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const optionSchema = z.object({
  text: z
    .string({ required_error: 'Option text is required' })
    .trim()
    .min(1, 'Option text cannot be empty'),
  isCorrect: z.boolean({ required_error: 'isCorrect is required' })
});

export const createQuestionSchema = z.object({
  params: z.object({
    quizId: z.string().regex(objectIdRegex, 'Invalid quiz ID format')
  }),
  body: z.object({
    text: z
      .string({ required_error: 'Question text is required' })
      .trim()
      .min(3, 'Question text must be at least 3 characters'),
    options: z
      .array(optionSchema)
      .min(2, 'A question must have at least 2 options')
      .refine(
        (opts) => opts.filter((o) => o.isCorrect === true).length === 1,
        {
          message: 'Question must have exactly one correct option'
        }
      )
  })
});

export const updateQuestionSchema = z.object({
  params: z.object({
    questionId: z.string().regex(objectIdRegex, 'Invalid question ID format')
  }),
  body: z
    .object({
      text: z
        .string()
        .trim()
        .min(3, 'Question text must be at least 3 characters')
        .optional(),
      options: z
        .array(optionSchema)
        .min(2, 'A question must have at least 2 options')
        .refine(
          (opts) => opts.filter((o) => o.isCorrect === true).length === 1,
          {
            message: 'Question must have exactly one correct option'
          }
        )
        .optional()
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field (text or options) must be provided for update'
    })
});

export const questionIdParamSchema = z.object({
  params: z.object({
    questionId: z.string().regex(objectIdRegex, 'Invalid question ID format')
  })
});
