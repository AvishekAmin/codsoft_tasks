import express from 'express';
import authRoutes from './auth.routes.js';
import quizRoutes from './quiz.routes.js';
import questionRoutes from './question.routes.js';
import attemptRoutes from './attempt.routes.js';
import userRoutes from './user.routes.js';
import healthRoutes from './health.routes.js';

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/quizzes', quizRoutes);
router.use('/questions', questionRoutes);
router.use('/attempts', attemptRoutes);
router.use('/users', userRoutes);

export default router;
