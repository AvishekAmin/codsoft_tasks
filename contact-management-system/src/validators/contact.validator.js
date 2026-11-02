import { z } from 'zod';
import { isValidPhone, normalizePhone } from '../utils/phoneUtils.js';
import { ALLOWED_SORT_FIELDS } from '../utils/queryUtils.js';

const optionalString = (maxLen) =>
  z
    .string()
    .trim()
    .max(maxLen, `Must not exceed ${maxLen} characters`)
    .optional()
    .nullable()
    .transform((val) => {
      if (val === undefined) return undefined;
      if (val === null) return null;
      const trimmed = val.trim();
      return trimmed.length > 0 ? trimmed : null;
    });

const phoneValidation = z
  .string()
  .trim()
  .optional()
  .nullable()
  .refine((val) => val === undefined || val === null || val === '' || isValidPhone(val), {
    message: 'Invalid phone number format. Must contain between 7 and 15 digits.'
  })
  .transform((val) => {
    if (val === undefined) return undefined;
    if (val === null) return null;
    return normalizePhone(val);
  });

const emailValidation = z
  .string()
  .trim()
  .toLowerCase()
  .optional()
  .nullable()
  .refine((val) => val === undefined || val === null || val === '' || z.string().email().safeParse(val).success, {
    message: 'Invalid email address format'
  })
  .transform((val) => {
    if (val === undefined) return undefined;
    if (val === null) return null;
    const trimmed = val.trim().toLowerCase();
    return trimmed.length > 0 ? trimmed : null;
  });

export const contactIdParamSchema = z
  .object({
    contactId: z.string({ required_error: 'Contact ID is required' }).uuid('Invalid contact ID format: must be a valid UUID')
  })
  .strict();

export const createContactSchema = z
  .object({
    name: z
      .string({ required_error: 'Contact name is required' })
      .trim()
      .min(1, 'Contact name cannot be empty')
      .max(100, 'Contact name must be 100 characters or fewer'),
    email: emailValidation,
    phone: phoneValidation,
    addressLine1: optionalString(255),
    addressLine2: optionalString(255),
    city: optionalString(100),
    state: optionalString(100),
    postalCode: optionalString(20),
    country: optionalString(100),
    companyName: optionalString(150),
    jobTitle: optionalString(100),
    notes: optionalString(1000)
  })
  .strict({ message: 'Unrecognized fields are not permitted in contact creation' })
  .refine((data) => Boolean(data.email || data.phone), {
    message: 'A contact must have at least one contact method: an email address or phone number',
    path: ['email']
  })
  .transform((data) => ({
    name: data.name,
    email: data.email ?? null,
    phone: data.phone ?? null,
    addressLine1: data.addressLine1 ?? null,
    addressLine2: data.addressLine2 ?? null,
    city: data.city ?? null,
    state: data.state ?? null,
    postalCode: data.postalCode ?? null,
    country: data.country ?? null,
    companyName: data.companyName ?? null,
    jobTitle: data.jobTitle ?? null,
    notes: data.notes ?? null
  }));

export const updateContactSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Contact name cannot be empty')
      .max(100, 'Contact name must be 100 characters or fewer')
      .optional(),
    email: emailValidation,
    phone: phoneValidation,
    addressLine1: optionalString(255),
    addressLine2: optionalString(255),
    city: optionalString(100),
    state: optionalString(100),
    postalCode: optionalString(20),
    country: optionalString(100),
    companyName: optionalString(150),
    jobTitle: optionalString(100),
    notes: optionalString(1000)
  })
  .strict({ message: 'Unrecognized or internal fields cannot be modified' })
  .refine((data) => Object.values(data).some((val) => val !== undefined), {
    message: 'At least one field must be provided for update'
  });

export const listContactsQuerySchema = z
  .object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1))
      .refine((val) => !isNaN(val) && val >= 1, { message: 'Page must be a positive integer' }),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 10))
      .refine((val) => !isNaN(val) && val >= 1 && val <= 100, {
        message: 'Limit must be an integer between 1 and 100'
      }),
    search: z.string().trim().max(100).optional(),
    sort: z
      .string()
      .trim()
      .optional()
      .refine((val) => !val || ALLOWED_SORT_FIELDS.includes(val), {
        message: `Sort field must be one of: ${ALLOWED_SORT_FIELDS.join(', ')}`
      }),
    order: z
      .string()
      .trim()
      .toLowerCase()
      .optional()
      .refine((val) => !val || ['asc', 'desc'].includes(val), {
        message: "Order must be either 'asc' or 'desc'"
      }),
    companyName: z.string().trim().max(150).optional(),
    city: z.string().trim().max(100).optional(),
    country: z.string().trim().max(100).optional()
  })
  .passthrough();
