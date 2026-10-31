import { createStudentSchema, updateStudentSchema } from '../../src/validators/student.validator.js';
import { createCourseSchema, updateCourseSchema } from '../../src/validators/course.validator.js';
import { createEnrollmentSchema, updateEnrollmentSchema } from '../../src/validators/enrollment.validator.js';
import { registerSchema, loginSchema } from '../../src/validators/auth.validator.js';

describe('Validation Schemas Unit Tests', () => {
  describe('Student Validator', () => {
    test('validates valid student payload successfully', () => {
      const valid = {
        body: {
          studentCode: 'cs101',
          firstName: 'John',
          lastName: 'Doe',
          email: 'John.Doe@Example.com',
          status: 'ACTIVE'
        }
      };

      const result = createStudentSchema.safeParse(valid);
      expect(result.success).toBe(true);
      expect(result.data.body.studentCode).toBe('CS101');
      expect(result.data.body.email).toBe('john.doe@example.com');
    });

    test('rejects missing required student fields', () => {
      const invalid = { body: { firstName: 'John' } };
      const result = createStudentSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      const fields = result.error.issues.map((i) => i.path.join('.'));
      expect(fields).toContain('body.studentCode');
      expect(fields).toContain('body.lastName');
      expect(fields).toContain('body.email');
    });

    test('rejects invalid email format', () => {
      const invalid = {
        body: {
          studentCode: 'CS102',
          firstName: 'John',
          lastName: 'Doe',
          email: 'not-an-email'
        }
      };
      const result = createStudentSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain('email');
    });

    test('rejects mass-assignment of arbitrary internal fields', () => {
      const payload = {
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
        body: {
          firstName: 'Jane',
          id: 'hacked-id',
          createdAt: new Date()
        }
      };
      const result = updateStudentSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('Course Validator', () => {
    test('validates valid course payload and uppercases courseCode', () => {
      const valid = {
        body: {
          courseCode: 'cs202',
          title: 'Algorithms',
          credits: 4,
          department: 'Computer Science'
        }
      };
      const result = createCourseSchema.safeParse(valid);
      expect(result.success).toBe(true);
      expect(result.data.body.courseCode).toBe('CS202');
    });

    test('rejects credits less than 1 or greater than 10', () => {
      const invalidLow = {
        body: {
          courseCode: 'CS202',
          title: 'Algorithms',
          credits: 0
        }
      };
      expect(createCourseSchema.safeParse(invalidLow).success).toBe(false);

      const invalidHigh = {
        body: {
          courseCode: 'CS202',
          title: 'Algorithms',
          credits: 15
        }
      };
      expect(createCourseSchema.safeParse(invalidHigh).success).toBe(false);
    });

    test('rejects decimal credits', () => {
      const invalid = {
        body: {
          courseCode: 'CS202',
          title: 'Algorithms',
          credits: 3.5
        }
      };
      expect(createCourseSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('Enrollment Validator', () => {
    const validStudentId = '123e4567-e89b-12d3-a456-426614174000';
    const validCourseId = '223e4567-e89b-12d3-a456-426614174000';

    test('validates valid enrollment payload', () => {
      const valid = {
        body: {
          studentId: validStudentId,
          courseId: validCourseId,
          grade: 85.5
        }
      };
      const result = createEnrollmentSchema.safeParse(valid);
      expect(result.success).toBe(true);
      expect(result.data.body.status).toBe('ENROLLED');
    });

    test('rejects malformed UUIDs in enrollment payload', () => {
      const invalid = {
        body: {
          studentId: 'not-a-uuid',
          courseId: validCourseId
        }
      };
      const result = createEnrollmentSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    test('rejects grade outside 0 to 100 range', () => {
      const invalidNegative = {
        body: {
          studentId: validStudentId,
          courseId: validCourseId,
          grade: -5
        }
      };
      expect(createEnrollmentSchema.safeParse(invalidNegative).success).toBe(false);

      const invalidOver100 = {
        body: {
          studentId: validStudentId,
          courseId: validCourseId,
          grade: 105
        }
      };
      expect(createEnrollmentSchema.safeParse(invalidOver100).success).toBe(false);
    });
  });

  describe('Auth Validator', () => {
    test('validates valid registration payload', () => {
      const valid = {
        body: {
          name: 'Alice Staff',
          email: 'Alice@Example.com',
          password: 'Password123!'
        }
      };
      const result = registerSchema.safeParse(valid);
      expect(result.success).toBe(true);
      expect(result.data.body.email).toBe('alice@example.com');
      expect(result.data.body.role).toBe('STAFF');
    });

    test('rejects password shorter than 8 characters', () => {
      const invalid = {
        body: {
          name: 'Alice Staff',
          email: 'alice@example.com',
          password: '1234'
        }
      };
      const result = registerSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    test('rejects public role escalation attempt to ADMIN', () => {
      const escalationPayload = {
        body: {
          name: 'Hacker',
          email: 'hacker@example.com',
          password: 'Password123!',
          role: 'ADMIN'
        }
      };
      const result = registerSchema.safeParse(escalationPayload);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain('Public registration only permits STAFF role');
    });
  });
});
