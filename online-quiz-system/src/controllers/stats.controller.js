import mongoose from 'mongoose';
import { QuizResult } from '../models/QuizResult.js';
import { QuizAttempt } from '../models/QuizAttempt.js';
import { Quiz } from '../models/Quiz.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getQuizStatistics = asyncHandler(async (req, res) => {
  const { quizId } = req.params;

  const quiz = await Quiz.findById(quizId);
  if (!quiz) {
    throw ApiError.notFound('Quiz not found');
  }

  const quizObjectId = new mongoose.Types.ObjectId(quizId);

  // Aggregation pipeline for quiz performance statistics
  const statsAggregation = await QuizResult.aggregate([
    { $match: { quizId: quizObjectId } },
    {
      $group: {
        _id: '$quizId',
        totalResults: { $sum: 1 },
        uniqueParticipants: { $addToSet: '$userId' },
        avgScore: { $avg: '$score' },
        highestScore: { $max: '$score' },
        lowestScore: { $min: '$score' },
        avgPercentage: { $avg: '$percentage' },
        passedCount: {
          $sum: { $cond: [{ $eq: ['$passed', true] }, 1, 0] }
        },
        failedCount: {
          $sum: { $cond: [{ $eq: ['$passed', false] }, 1, 0] }
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalResults: 1,
        uniqueParticipantsCount: { $size: '$uniqueParticipants' },
        avgScore: { $round: ['$avgScore', 2] },
        highestScore: 1,
        lowestScore: 1,
        avgPercentage: { $round: ['$avgPercentage', 2] },
        passedCount: 1,
        failedCount: 1,
        passRate: {
          $cond: [
            { $gt: ['$totalResults', 0] },
            {
              $round: [
                {
                  $multiply: [
                    { $divide: ['$passedCount', '$totalResults'] },
                    100
                  ]
                },
                2
              ]
            },
            0
          ]
        }
      }
    }
  ]);

  const totalAttemptsStarted = await QuizAttempt.countDocuments({ quizId: quizObjectId });

  const defaultStats = {
    totalAttemptsStarted,
    totalFinalizedResults: 0,
    uniqueParticipantsCount: 0,
    avgScore: 0,
    highestScore: 0,
    lowestScore: 0,
    avgPercentage: 0,
    passedCount: 0,
    failedCount: 0,
    passRate: 0
  };

  const stats = statsAggregation.length > 0
    ? {
        totalAttemptsStarted,
        totalFinalizedResults: statsAggregation[0].totalResults,
        uniqueParticipantsCount: statsAggregation[0].uniqueParticipantsCount,
        avgScore: statsAggregation[0].avgScore,
        highestScore: statsAggregation[0].highestScore,
        lowestScore: statsAggregation[0].lowestScore,
        avgPercentage: statsAggregation[0].avgPercentage,
        passedCount: statsAggregation[0].passedCount,
        failedCount: statsAggregation[0].failedCount,
        passRate: statsAggregation[0].passRate
      }
    : defaultStats;

  return ApiResponse.success(res, 'Quiz statistics retrieved successfully', {
    quiz: {
      id: quiz._id,
      title: quiz.title,
      status: quiz.status,
      passPercentage: quiz.passPercentage,
      marksPerQuestion: quiz.marksPerQuestion
    },
    statistics: stats
  });
});

export const getMyStatistics = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [totalAttempts, completedResults, recentResults] = await Promise.all([
    QuizAttempt.countDocuments({ userId }),
    QuizResult.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$userId',
          completedQuizzes: { $sum: 1 },
          passedQuizzes: {
            $sum: { $cond: [{ $eq: ['$passed', true] }, 1, 0] }
          },
          avgScore: { $avg: '$score' },
          avgPercentage: { $avg: '$percentage' }
        }
      }
    ]),
    QuizResult.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('quizId', 'title durationMinutes passPercentage')
      .lean()
  ]);

  const summary = completedResults.length > 0
    ? {
        totalAttemptsStarted: totalAttempts,
        completedQuizzes: completedResults[0].completedQuizzes,
        passedQuizzes: completedResults[0].passedQuizzes,
        failedQuizzes: completedResults[0].completedQuizzes - completedResults[0].passedQuizzes,
        avgScore: Math.round(completedResults[0].avgScore * 100) / 100,
        avgPercentage: Math.round(completedResults[0].avgPercentage * 100) / 100,
        overallPassRate: completedResults[0].completedQuizzes > 0
          ? Math.round(
              (completedResults[0].passedQuizzes / completedResults[0].completedQuizzes) * 10000
            ) / 100
          : 0
      }
    : {
        totalAttemptsStarted: totalAttempts,
        completedQuizzes: 0,
        passedQuizzes: 0,
        failedQuizzes: 0,
        avgScore: 0,
        avgPercentage: 0,
        overallPassRate: 0
      };

  const formattedRecent = recentResults.map((r) => ({
    resultId: r._id,
    quizId: r.quizId?._id || r.quizId,
    quizTitle: r.quizId?.title || 'Unknown Quiz',
    score: r.score,
    totalMarks: r.totalMarks,
    percentage: r.percentage,
    passed: r.passed,
    certificateEligible: r.certificateEligible,
    date: r.createdAt
  }));

  return ApiResponse.success(res, 'User statistics retrieved successfully', {
    summary,
    recentResults: formattedRecent
  });
});
