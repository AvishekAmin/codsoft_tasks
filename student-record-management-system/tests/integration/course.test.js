import request from 'supertest';
import app from '../../src/app.js';
import { resetTestDb, getAdminToken, getStaffToken, inMemoryPrisma } from '../testHelper.js';

describe('Course Endpoints Integration Tests', () => {
  let adminToken;
  let staffToken;

  beforeEach(async () => {
    await resetTestDb();
    adminToken = getAdminToken();
    staffToken = getStaffToken();
  });

  describe('POST /api/v1/courses', () => {
    test('admin creates course successfully', async () => {
      const res = await request(app)
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          courseCode: 'CS301',
          title: 'Database Management Systems',
          description: 'SQL, normalization, relational algebra',
          department: 'Computer Science',
          credits: 4,
          instructor: 'Dr. Alan Turing',
          status: 'ACTIVE'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.courseCode).toBe('CS301');
      expect(res.body.data.credits).toBe(4);
    });

    test('rejects course creation from non-admin STAFF with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          courseCode: 'CS302',
          title: 'Operating Systems',
          credits: 3
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('required role \'ADMIN\'');
    });

    test('rejects duplicate courseCode with 409 Conflict', async () => {
      await inMemoryPrisma.course.create({
        data: {
          courseCode: 'CS301',
          title: 'Existing DB',
          credits: 3
        }
      });

      const res = await request(app)
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          courseCode: 'CS301',
          title: 'Duplicate DB Course',
          credits: 4
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('already exists');
    });
  });

  describe('GET /api/v1/courses', () => {
    beforeEach(async () => {
      await inMemoryPrisma.course.create({
        data: {
          courseCode: 'CS101',
          title: 'Data Structures',
          department: 'Computer Science',
          credits: 4,
          status: 'ACTIVE'
        }
      });
      await inMemoryPrisma.course.create({
        data: {
          courseCode: 'MATH201',
          title: 'Linear Algebra',
          department: 'Mathematics',
          credits: 3,
          status: 'ACTIVE'
        }
      });
    });

    test('retrieves courses with search and department filtering', async () => {
      const res = await request(app)
        .get('/api/v1/courses?department=Mathematics')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].courseCode).toBe('MATH201');
    });

    test('searches courses by keyword', async () => {
      const res = await request(app)
        .get('/api/v1/courses?search=structures')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].courseCode).toBe('CS101');
    });
  });

  describe('DELETE /api/v1/courses/:id', () => {
    test('admin can delete course without dependent enrollments', async () => {
      const course = await inMemoryPrisma.course.create({
        data: {
          courseCode: 'DEL101',
          title: 'To Be Deleted',
          credits: 2
        }
      });

      const res = await request(app)
        .delete(`/api/v1/courses/${course.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(204);
    });

    test('prevents deleting course with dependent enrollments with 409 Conflict', async () => {
      const course = await inMemoryPrisma.course.create({
        data: {
          courseCode: 'DEP101',
          title: 'Dependent Course',
          credits: 3
        }
      });

      const student = await inMemoryPrisma.student.create({
        data: {
          studentCode: 'STU-DEP',
          firstName: 'Dep',
          lastName: 'Student',
          email: 'dep@example.com'
        }
      });

      await inMemoryPrisma.enrollment.create({
        data: {
          studentId: student.id,
          courseId: course.id,
          status: 'ENROLLED'
        }
      });

      const res = await request(app)
        .delete(`/api/v1/courses/${course.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('dependent enrollment');
    });
  });
});
