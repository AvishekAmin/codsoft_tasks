import express from 'express';
import * as attemptController from '../controllers/attempt.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireParticipant } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  attemptIdParamSchema,
  saveAnswerSchema
} from '../validators/attempt.validator.js';

const router = express.Router();

router.get(
  '/:attemptId/questions',
  authenticate,
  requireParticipant,
  validate(attemptIdParamSchema),
  attemptController.getAttemptQuestions
);

router.patch(
  '/:attemptId/answers',
  authenticate,
  requireParticipant,
  validate(saveAnswerSchema),
  attemptController.saveAnswer
);

router.post(
  '/:attemptId/submit',
  authenticate,
  requireParticipant,
  validate(attemptIdParamSchema),
  attemptController.submitAttempt
);

router.get(
  '/:attemptId/result',
  authenticate,
  validate(attemptIdParamSchema),
  attemptController.getAttemptResult
);

export default router;
