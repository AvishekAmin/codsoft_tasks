import express from 'express';
import * as quizController from '../controllers/quiz.controller.js';
import * as questionController from '../controllers/question.controller.js';
import * as attemptController from '../controllers/attempt.controller.js';
import * as leaderboardController from '../controllers/leaderboard.controller.js';
import * as statsController from '../controllers/stats.controller.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware.js';
import { requireAdmin, requireParticipant } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createQuizSchema,
  updateQuizSchema,
  quizIdParamSchema,
  listQuizQuerySchema
} from '../validators/quiz.validator.js';
import { createQuestionSchema } from '../validators/question.validator.js';

const router = express.Router();

// Quiz Management
router.post(
  '/',
  authenticate,
  requireAdmin,
  validate(createQuizSchema),
  quizController.createQuiz
);

router.get(
  '/',
  optionalAuthenticate,
  validate(listQuizQuerySchema),
  quizController.listQuizzes
);

router.get(
  '/:quizId',
  optionalAuthenticate,
  validate(quizIdParamSchema),
  quizController.getQuizById
);

router.patch(
  '/:quizId',
  authenticate,
  requireAdmin,
  validate(updateQuizSchema),
  quizController.updateQuiz
);

router.delete(
  '/:quizId',
  authenticate,
  requireAdmin,
  validate(quizIdParamSchema),
  quizController.deleteQuiz
);

router.patch(
  '/:quizId/publish',
  authenticate,
  requireAdmin,
  validate(quizIdParamSchema),
  quizController.publishQuiz
);

// Quiz Questions (Admin Only)
router.post(
  '/:quizId/questions',
  authenticate,
  requireAdmin,
  validate(createQuestionSchema),
  questionController.createQuestion
);

router.get(
  '/:quizId/questions',
  authenticate,
  requireAdmin,
  validate(quizIdParamSchema),
  questionController.getQuizQuestions
);

// Attempt Initiation (Participant Only)
router.post(
  '/:quizId/attempts',
  authenticate,
  requireParticipant,
  validate(quizIdParamSchema),
  attemptController.startAttempt
);

// Quiz Leaderboard
router.get(
  '/:quizId/leaderboard',
  optionalAuthenticate,
  validate(quizIdParamSchema),
  leaderboardController.getQuizLeaderboard
);

// Quiz Performance Statistics (Admin Only)
router.get(
  '/:quizId/statistics',
  authenticate,
  requireAdmin,
  validate(quizIdParamSchema),
  statsController.getQuizStatistics
);

export default router;
