import request from 'supertest';
import app from '../../src/app.js';
import { resetTestDb, getAdminToken, getStaffToken, inMemoryPrisma } from '../testHelper.js';

describe('Enrollment Endpoints Integration Tests', () => {
  let adminToken;
  let staffToken;
  let activeStudent;
  let inactiveStudent;
  let activeCourse;
  let inactiveCourse;

  beforeEach(async () => {
    await resetTestDb();
    adminToken = getAdminToken();
    staffToken = getStaffToken();

    activeStudent = await inMemoryPrisma.student.create({
      data: {
        studentCode: 'ENR-STU-01',
        firstName: 'Active',
        lastName: 'Student',
        email: 'active.student@example.com',
        status: 'ACTIVE'
      }
    });

    inactiveStudent = await inMemoryPrisma.student.create({
      data: {
        studentCode: 'ENR-STU-02',
        firstName: 'Inactive',
        lastName: 'Student',
        email: 'inactive.student@example.com',
        status: 'INACTIVE'
      }
    });

    activeCourse = await inMemoryPrisma.course.create({
      data: {
        courseCode: 'ENR-CRS-01',
        title: 'Active Course',
        credits: 3,
        status: 'ACTIVE'
      }
    });

    inactiveCourse = await inMemoryPrisma.course.create({
      data: {
        courseCode: 'ENR-CRS-02',
        title: 'Archived Course',
        credits: 3,
        status: 'INACTIVE'
      }
    });
  });

  describe('POST /api/v1/enrollments', () => {
    test('successfully enrolls active student in active course', async () => {
      const res = await request(app)
        .post('/api/v1/enrollments')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          studentId: activeStudent.id,
          courseId: activeCourse.id,
          status: 'ENROLLED'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.studentId).toBe(activeStudent.id);
      expect(res.body.data.courseId).toBe(activeCourse.id);
      expect(res.body.data.status).toBe('ENROLLED');
    });

    test('rejects enrollment of INACTIVE student with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/v1/enrollments')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          studentId: inactiveStudent.id,
          courseId: activeCourse.id
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Student is currently INACTIVE');
    });

    test('rejects enrollment in INACTIVE course with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/v1/enrollments')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          studentId: activeStudent.id,
          courseId: inactiveCourse.id
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Course is currently INACTIVE');
    });

    test('rejects nonexistent student with 404 Not Found', async () => {
      const res = await request(app)
        .post('/api/v1/enrollments')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          studentId: '00000000-0000-0000-0000-000000000999',
          courseId: activeCourse.id
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Student with ID');
    });

    test('rejects duplicate active enrollment with 409 Conflict', async () => {
      // First enrollment
      await request(app)
        .post('/api/v1/enrollments')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          studentId: activeStudent.id,
          courseId: activeCourse.id
        });

      // Second duplicate enrollment
      const res = await request(app)
        .post('/api/v1/enrollments')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          studentId: activeStudent.id,
          courseId: activeCourse.id
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('already actively enrolled');
    });

    test('reactivates previously WITHDRAWN enrollment without creating duplicate record', async () => {
      // 1. Initial enrollment
      const createRes = await request(app)
        .post('/api/v1/enrollments')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          studentId: activeStudent.id,
          courseId: activeCourse.id
        });
      const enrollmentId = createRes.body.data.id;

      // 2. Student withdraws from course
      await request(app)
        .patch(`/api/v1/enrollments/${enrollmentId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'WITHDRAWN' });

      // 3. Student re-enrolls in the same course
      const reenrollRes = await request(app)
        .post('/api/v1/enrollments')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          studentId: activeStudent.id,
          courseId: activeCourse.id
        });

      expect(reenrollRes.status).toBe(201);
      expect(reenrollRes.body.data.id).toBe(enrollmentId); // Preserved same ID
      expect(reenrollRes.body.data.status).toBe('ENROLLED');
    });
  });

  describe('PATCH /api/v1/enrollments/:id', () => {
    test('updates enrollment status and grade', async () => {
      const enrollment = await inMemoryPrisma.enrollment.create({
        data: {
          studentId: activeStudent.id,
          courseId: activeCourse.id,
          status: 'ENROLLED'
        }
      });

      const res = await request(app)
        .patch(`/api/v1/enrollments/${enrollment.id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          status: 'COMPLETED',
          grade: 92.5
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('COMPLETED');
      expect(res.body.data.grade).toBe(92.5);
    });

    test('rejects invalid grade outside range with 400', async () => {
      const enrollment = await inMemoryPrisma.enrollment.create({
        data: {
          studentId: activeStudent.id,
          courseId: activeCourse.id,
          status: 'ENROLLED'
        }
      });

      const res = await request(app)
        .patch(`/api/v1/enrollments/${enrollment.id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          grade: 150
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/students/:id/enrollments', () => {
    test('retrieves enrollments history for a student', async () => {
      await inMemoryPrisma.enrollment.create({
        data: {
          studentId: activeStudent.id,
          courseId: activeCourse.id,
          status: 'ENROLLED'
        }
      });

      const res = await request(app)
        .get(`/api/v1/students/${activeStudent.id}/enrollments`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].course.courseCode).toBe('ENR-CRS-01');
    });
  });

  describe('GET /api/v1/courses/:id/students', () => {
    test('retrieves students enrolled in a course', async () => {
      await inMemoryPrisma.enrollment.create({
        data: {
          studentId: activeStudent.id,
          courseId: activeCourse.id,
          status: 'ENROLLED'
        }
      });

      const res = await request(app)
        .get(`/api/v1/courses/${activeCourse.id}/students`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].student.studentCode).toBe('ENR-STU-01');
    });
  });

  describe('DELETE /api/v1/enrollments/:id', () => {
    test('admin can delete enrollment', async () => {
      const enrollment = await inMemoryPrisma.enrollment.create({
        data: {
          studentId: activeStudent.id,
          courseId: activeCourse.id,
          status: 'ENROLLED'
        }
      });

      const res = await request(app)
        .delete(`/api/v1/enrollments/${enrollment.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(204);
    });
  });
});
