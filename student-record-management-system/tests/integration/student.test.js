import request from 'supertest';
import app from '../../src/app.js';
import { resetTestDb, getAdminToken, getStaffToken, inMemoryPrisma } from '../testHelper.js';

describe('Student Endpoints Integration Tests', () => {
  let adminToken;
  let staffToken;

  beforeEach(async () => {
    await resetTestDb();
    adminToken = getAdminToken();
    staffToken = getStaffToken();
  });

  describe('POST /api/v1/students', () => {
    test('creates student record successfully', async () => {
      const payload = {
        studentCode: 'CS2026-001',
        firstName: 'Avishek',
        lastName: 'Kumar',
        email: 'avishek.kumar@example.com',
        phone: '+91-9876543210',
        gender: 'Male',
        address: 'Noida, UP',
        status: 'ACTIVE'
      };

      const res = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${staffToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.studentCode).toBe('CS2026-001');
      expect(res.body.data.email).toBe('avishek.kumar@example.com');
      expect(res.body.data.id).toBeDefined();
    });

    test('rejects missing required student fields with 400', async () => {
      const res = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ firstName: 'Avishek' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('rejects duplicate studentCode with 409 Conflict', async () => {
      await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          studentCode: 'CS2026-001',
          firstName: 'Avishek',
          lastName: 'Kumar',
          email: 'avishek1@example.com'
        });

      const res = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          studentCode: 'CS2026-001',
          firstName: 'Another',
          lastName: 'Student',
          email: 'another@example.com'
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('already exists');
    });

    test('rejects duplicate email with 409 Conflict', async () => {
      await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          studentCode: 'CS2026-001',
          firstName: 'Avishek',
          lastName: 'Kumar',
          email: 'duplicate@example.com'
        });

      const res = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          studentCode: 'CS2026-002',
          firstName: 'Second',
          lastName: 'Student',
          email: 'duplicate@example.com'
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('already exists');
    });
  });

  describe('GET /api/v1/students', () => {
    beforeEach(async () => {
      // Seed two students
      await inMemoryPrisma.student.create({
        data: {
          studentCode: 'STU-001',
          firstName: 'Avishek',
          lastName: 'Kumar',
          email: 'avishek@example.com',
          status: 'ACTIVE'
        }
      });
      await inMemoryPrisma.student.create({
        data: {
          studentCode: 'STU-002',
          firstName: 'Rahul',
          lastName: 'Sharma',
          email: 'rahul@example.com',
          status: 'INACTIVE'
        }
      });
    });

    test('retrieves paginated students list', async () => {
      const res = await request(app)
        .get('/api/v1/students?page=1&limit=10')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(2);
      expect(res.body.data.pagination.totalItems).toBe(2);
      expect(res.body.data.pagination.page).toBe(1);
    });

    test('filters students by status', async () => {
      const res = await request(app)
        .get('/api/v1/students?status=ACTIVE')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].studentCode).toBe('STU-001');
    });

    test('searches students by keyword across name and email', async () => {
      const res = await request(app)
        .get('/api/v1/students?search=rahul')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].firstName).toBe('Rahul');
    });
  });

  describe('GET /api/v1/students/:id', () => {
    test('retrieves student by valid UUID', async () => {
      const student = await inMemoryPrisma.student.create({
        data: {
          studentCode: 'STU-003',
          firstName: 'Priya',
          lastName: 'Singh',
          email: 'priya@example.com'
        }
      });

      const res = await request(app)
        .get(`/api/v1/students/${student.id}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(student.id);
      expect(res.body.data.studentCode).toBe('STU-003');
    });

    test('rejects malformed UUID with 400 Bad Request', async () => {
      const res = await request(app)
        .get('/api/v1/students/not-a-valid-uuid')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('returns 404 for non-existent UUID', async () => {
      const res = await request(app)
        .get('/api/v1/students/00000000-0000-0000-0000-000000000999')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/students/:id', () => {
    test('updates allowed student details successfully', async () => {
      const student = await inMemoryPrisma.student.create({
        data: {
          studentCode: 'STU-004',
          firstName: 'Ankit',
          lastName: 'Verma',
          email: 'ankit@example.com'
        }
      });

      const res = await request(app)
        .patch(`/api/v1/students/${student.id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          phone: '+91-9123456789',
          status: 'INACTIVE'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.phone).toBe('+91-9123456789');
      expect(res.body.data.status).toBe('INACTIVE');
    });
  });

  describe('DELETE /api/v1/students/:id', () => {
    test('rejects delete operation from non-admin STAFF with 403 Forbidden', async () => {
      const student = await inMemoryPrisma.student.create({
        data: {
          studentCode: 'STU-005',
          firstName: 'Staff',
          lastName: 'Target',
          email: 'staff.target@example.com'
        }
      });

      const res = await request(app)
        .delete(`/api/v1/students/${student.id}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('required role \'ADMIN\'');
    });

    test('admin can delete a student without dependent enrollments (204)', async () => {
      const student = await inMemoryPrisma.student.create({
        data: {
          studentCode: 'STU-006',
          firstName: 'Deletable',
          lastName: 'Student',
          email: 'deletable@example.com'
        }
      });

      const res = await request(app)
        .delete(`/api/v1/students/${student.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(204);

      // Verify deletion
      const check = await inMemoryPrisma.student.findUnique({ where: { id: student.id } });
      expect(check).toBeNull();
    });

    test('prevents deletion of student with dependent enrollments with 409 Conflict', async () => {
      const student = await inMemoryPrisma.student.create({
        data: {
          studentCode: 'STU-007',
          firstName: 'Enrolled',
          lastName: 'Student',
          email: 'enrolled@example.com'
        }
      });

      const course = await inMemoryPrisma.course.create({
        data: {
          courseCode: 'CS101',
          title: 'Intro to CS',
          credits: 3
        }
      });

      // Add enrollment
      await inMemoryPrisma.enrollment.create({
        data: {
          studentId: student.id,
          courseId: course.id,
          status: 'ENROLLED'
        }
      });

      const res = await request(app)
        .delete(`/api/v1/students/${student.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('dependent enrollment');
    });
  });
});
