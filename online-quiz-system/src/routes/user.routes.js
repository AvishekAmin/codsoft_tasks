import express from 'express';
import * as attemptController from '../controllers/attempt.controller.js';
import * as statsController from '../controllers/stats.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireParticipant } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { paginationQuerySchema } from '../validators/attempt.validator.js';

const router = express.Router();

router.get(
  '/me/attempts',
  authenticate,
  requireParticipant,
  validate(paginationQuerySchema),
  attemptController.getMyAttempts
);

router.get(
  '/me/statistics',
  authenticate,
  requireParticipant,
  statsController.getMyStatistics
);

export default router;
