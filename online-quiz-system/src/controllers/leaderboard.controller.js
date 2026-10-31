import mongoose from 'mongoose';
import { QuizResult } from '../models/QuizResult.js';
import { Quiz } from '../models/Quiz.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getQuizLeaderboard = asyncHandler(async (req, res) => {
  const { quizId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const quiz = await Quiz.findById(quizId);
  if (!quiz) {
    throw ApiError.notFound('Quiz not found');
  }

  // Participants can only view leaderboard of published quizzes
  if ((!req.user || req.user.role === 'participant') && quiz.status !== 'published') {
    throw ApiError.notFound('Quiz not found or not published');
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [results, totalResults] = await Promise.all([
    QuizResult.find({ quizId: new mongoose.Types.ObjectId(quizId) })
      // Stable tie-breaking: higher score -> shorter completion time -> earlier submission
      .sort({ score: -1, timeTakenSeconds: 1, createdAt: 1 })
      .skip(skip)
      .limit(limitNum)
      .populate('userId', 'name')
      .lean(),
    QuizResult.countDocuments({ quizId: new mongoose.Types.ObjectId(quizId) })
  ]);

  const leaderboard = results.map((r, index) => ({
    rank: skip + index + 1,
    participantName: r.userId ? r.userId.name : 'Unknown Participant',
    score: r.score,
    totalMarks: r.totalMarks,
    percentage: r.percentage,
    passed: r.passed,
    certificateEligible: r.certificateEligible,
    timeTakenSeconds: r.timeTakenSeconds || 0,
    submittedAt: r.createdAt
  }));

  return ApiResponse.success(res, 'Leaderboard retrieved successfully', {
    quiz: {
      id: quiz._id,
      title: quiz.title,
      durationMinutes: quiz.durationMinutes,
      marksPerQuestion: quiz.marksPerQuestion,
      passPercentage: quiz.passPercentage
    },
    leaderboard,
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalCount: totalResults,
      totalPages: Math.ceil(totalResults / limitNum)
    }
  });
});
