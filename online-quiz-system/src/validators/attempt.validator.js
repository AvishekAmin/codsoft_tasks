import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const attemptIdParamSchema = z.object({
  params: z.object({
    attemptId: z.string().regex(objectIdRegex, 'Invalid attempt ID format')
  })
});

export const saveAnswerSchema = z.object({
  params: z.object({
    attemptId: z.string().regex(objectIdRegex, 'Invalid attempt ID format')
  }),
  body: z.union([
    // Single answer format
    z.object({
      questionId: z.string().regex(objectIdRegex, 'Invalid question ID format'),
      selectedOptionId: z.string().regex(objectIdRegex, 'Invalid option ID format')
    }),
    // Bulk answers format
    z.object({
      answers: z
        .array(
          z.object({
            questionId: z.string().regex(objectIdRegex, 'Invalid question ID format'),
            selectedOptionId: z.string().regex(objectIdRegex, 'Invalid option ID format')
          })
        )
        .min(1, 'Answers array must contain at least one answer')
    })
  ])
});

export const paginationQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10)
  })
});
