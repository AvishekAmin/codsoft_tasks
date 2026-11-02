import { z } from 'zod';

export const registerSchema = z
  .object({
    name: z
      .string({ required_error: 'Name is required' })
      .trim()
      .min(1, 'Name cannot be empty')
      .max(100, 'Name must be 100 characters or fewer'),
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .email('Invalid email address format')
      .max(255, 'Email must be 255 characters or fewer'),
    password: z
      .string({ required_error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters long')
      .max(128, 'Password must not exceed 128 characters')
      .regex(/[A-Za-z]/, 'Password must contain at least one letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
  })
  .strict({ message: 'Unrecognized fields are not permitted in registration request' });

export const loginSchema = z
  .object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .email('Invalid email address format'),
    password: z
      .string({ required_error: 'Password is required' })
      .min(1, 'Password is required')
  })
  .strict({ message: 'Unrecognized fields are not permitted in login request' });
