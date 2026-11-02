import { registerSchema, loginSchema } from '../../src/validators/auth.validator.js';
import {
  createContactSchema,
  updateContactSchema,
  contactIdParamSchema,
  listContactsQuerySchema
} from '../../src/validators/contact.validator.js';

describe('Validation Schemas Unit Tests', () => {
  describe('Auth Validators', () => {
    it('validates a correct registration payload', async () => {
      const payload = {
        name: 'Avishek Mukherjee',
        email: 'Avishek@Example.com ',
        password: 'Password123!'
      };
      const result = await registerSchema.parseAsync(payload);
      expect(result.email).toBe('avishek@example.com');
      expect(result.name).toBe('Avishek Mukherjee');
    });

    it('rejects passwords shorter than 8 characters', async () => {
      const payload = {
        name: 'Avishek',
        email: 'avishek@example.com',
        password: 'Pass1'
      };
      await expect(registerSchema.parseAsync(payload)).rejects.toThrow();
    });

    it('rejects passwords without numbers', async () => {
      const payload = {
        name: 'Avishek',
        email: 'avishek@example.com',
        password: 'PasswordWithoutNumbers'
      };
      await expect(registerSchema.parseAsync(payload)).rejects.toThrow();
    });

    it('rejects mass-assignment of arbitrary internal fields', async () => {
      const payload = {
        name: 'Avishek',
        email: 'avishek@example.com',
        password: 'Password123!',
        role: 'ADMIN',
        ownerId: 'hacker-uuid'
      };
      await expect(registerSchema.parseAsync(payload)).rejects.toThrow();
    });

    it('validates correct login credentials', async () => {
      const payload = {
        email: 'avishek@example.com',
        password: 'Password123!'
      };
      const result = await loginSchema.parseAsync(payload);
      expect(result.email).toBe('avishek@example.com');
    });
  });

  describe('Contact Validators', () => {
    it('validates a complete contact creation payload with email and phone', async () => {
      const payload = {
        name: 'John Doe',
        email: 'John.Doe@Example.COM',
        phone: '+1 (555) 123-4567',
        companyName: 'TechCorp',
        jobTitle: 'Senior Engineer',
        city: 'San Francisco',
        country: 'USA'
      };
      const result = await createContactSchema.parseAsync(payload);
      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john.doe@example.com');
      expect(result.phone).toBe('+15551234567');
    });

    it('accepts a contact with only phone (no email)', async () => {
      const payload = {
        name: 'Phone Only Person',
        phone: '+91 98765 43210'
      };
      const result = await createContactSchema.parseAsync(payload);
      expect(result.name).toBe('Phone Only Person');
      expect(result.email).toBeNull();
      expect(result.phone).toBe('+919876543210');
    });

    it('accepts a contact with only email (no phone)', async () => {
      const payload = {
        name: 'Email Only Person',
        email: 'emailonly@example.com'
      };
      const result = await createContactSchema.parseAsync(payload);
      expect(result.name).toBe('Email Only Person');
      expect(result.email).toBe('emailonly@example.com');
      expect(result.phone).toBeNull();
    });

    it('rejects contact creation when neither email nor phone is provided', async () => {
      const payload = {
        name: 'Nameless Contact',
        companyName: 'TechCorp'
      };
      await expect(createContactSchema.parseAsync(payload)).rejects.toThrow(
        /at least one contact method/i
      );
    });

    it('rejects contact creation when name is empty or whitespace', async () => {
      const payload = {
        name: '   ',
        email: 'test@example.com'
      };
      await expect(createContactSchema.parseAsync(payload)).rejects.toThrow();
    });

    it('rejects invalid email formats', async () => {
      const payload = {
        name: 'Bad Email',
        email: 'not-an-email',
        phone: '+15551234567'
      };
      await expect(createContactSchema.parseAsync(payload)).rejects.toThrow(/Invalid email/i);
    });

    it('rejects invalid phone formats', async () => {
      const payload = {
        name: 'Bad Phone',
        phone: '123'
      };
      await expect(createContactSchema.parseAsync(payload)).rejects.toThrow(/Invalid phone number format/i);
    });

    it('rejects update payload if empty', async () => {
      await expect(updateContactSchema.parseAsync({})).rejects.toThrow(/At least one field/i);
    });

    it('validates UUID param schema', async () => {
      const valid = { contactId: 'a123e456-e89b-12d3-a456-426614174000' };
      const parsed = await contactIdParamSchema.parseAsync(valid);
      expect(parsed.contactId).toBe(valid.contactId);

      const invalid = { contactId: 'not-a-uuid' };
      await expect(contactIdParamSchema.parseAsync(invalid)).rejects.toThrow(/must be a valid UUID/i);
    });

    it('validates list query schema with clamping', async () => {
      const query = {
        page: '2',
        limit: '25',
        sort: 'name',
        order: 'asc'
      };
      const result = await listContactsQuerySchema.parseAsync(query);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(25);
      expect(result.sort).toBe('name');
      expect(result.order).toBe('asc');
    });
  });
});
