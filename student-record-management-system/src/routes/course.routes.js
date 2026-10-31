import { Router } from 'express';
import * as courseController from '../controllers/course.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import {
  createCourseSchema,
  updateCourseSchema,
  courseQuerySchema,
  courseParamsSchema
} from '../validators/course.validator.js';
import { enrollmentQuerySchema, courseStudentsParamsSchema } from '../validators/enrollment.validator.js';

const router = Router();

// Protect all course endpoints with JWT authentication
router.use(authenticate);

router.post(
  '/',
  authorize('ADMIN'),
  validate(createCourseSchema),
  courseController.createCourse
);

router.get(
  '/',
  authorize('ADMIN', 'STAFF'),
  validate(courseQuerySchema),
  courseController.getCourses
);

router.get(
  '/:id',
  authorize('ADMIN', 'STAFF'),
  validate({ params: courseParamsSchema }),
  courseController.getCourseById
);

router.patch(
  '/:id',
  authorize('ADMIN', 'STAFF'),
  validate(updateCourseSchema),
  courseController.updateCourse
);

router.delete(
  '/:id',
  authorize('ADMIN'),
  validate({ params: courseParamsSchema }),
  courseController.deleteCourse
);

router.get(
  '/:id/students',
  authorize('ADMIN', 'STAFF'),
  validate({ params: courseStudentsParamsSchema, query: enrollmentQuerySchema.shape.query }),
  courseController.getCourseStudents
);

export default router;
