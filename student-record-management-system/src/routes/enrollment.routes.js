import { Router } from 'express';
import * as enrollmentController from '../controllers/enrollment.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import {
  createEnrollmentSchema,
  updateEnrollmentSchema,
  enrollmentQuerySchema,
  enrollmentParamsSchema
} from '../validators/enrollment.validator.js';

const router = Router();

// Protect all enrollment endpoints with JWT authentication
router.use(authenticate);

router.post(
  '/',
  authorize('ADMIN', 'STAFF'),
  validate(createEnrollmentSchema),
  enrollmentController.createEnrollment
);

router.get(
  '/',
  authorize('ADMIN', 'STAFF'),
  validate(enrollmentQuerySchema),
  enrollmentController.getEnrollments
);

router.get(
  '/:id',
  authorize('ADMIN', 'STAFF'),
  validate({ params: enrollmentParamsSchema }),
  enrollmentController.getEnrollmentById
);

router.patch(
  '/:id',
  authorize('ADMIN', 'STAFF'),
  validate(updateEnrollmentSchema),
  enrollmentController.updateEnrollment
);

router.delete(
  '/:id',
  authorize('ADMIN'),
  validate({ params: enrollmentParamsSchema }),
  enrollmentController.deleteEnrollment
);

export default router;
