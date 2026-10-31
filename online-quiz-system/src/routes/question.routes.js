import express from 'express';
import * as questionController from '../controllers/question.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  updateQuestionSchema,
  questionIdParamSchema
} from '../validators/question.validator.js';

const router = express.Router();

router.patch(
  '/:questionId',
  authenticate,
  requireAdmin,
  validate(updateQuestionSchema),
  questionController.updateQuestion
);

router.delete(
  '/:questionId',
  authenticate,
  requireAdmin,
  validate(questionIdParamSchema),
  questionController.deleteQuestion
);

export default router;
