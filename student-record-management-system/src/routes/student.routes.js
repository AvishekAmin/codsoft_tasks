import { Router } from 'express';
import * as studentController from '../controllers/student.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import {
  createStudentSchema,
  updateStudentSchema,
  studentQuerySchema,
  studentParamsSchema
} from '../validators/student.validator.js';
import { enrollmentQuerySchema, studentEnrollmentsParamsSchema } from '../validators/enrollment.validator.js';

const router = Router();

// Protect all student endpoints with JWT authentication
router.use(authenticate);

router.post(
  '/',
  authorize('ADMIN', 'STAFF'),
  validate(createStudentSchema),
  studentController.createStudent
);

router.get(
  '/',
  authorize('ADMIN', 'STAFF'),
  validate(studentQuerySchema),
  studentController.getStudents
);

router.get(
  '/:id',
  authorize('ADMIN', 'STAFF'),
  validate({ params: studentParamsSchema }),
  studentController.getStudentById
);

router.patch(
  '/:id',
  authorize('ADMIN', 'STAFF'),
  validate(updateStudentSchema),
  studentController.updateStudent
);

router.delete(
  '/:id',
  authorize('ADMIN'),
  validate({ params: studentParamsSchema }),
  studentController.deleteStudent
);

router.get(
  '/:id/enrollments',
  authorize('ADMIN', 'STAFF'),
  validate({ params: studentEnrollmentsParamsSchema, query: enrollmentQuerySchema.shape.query }),
  studentController.getStudentEnrollments
);

export default router;
