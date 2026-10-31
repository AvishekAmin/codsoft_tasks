import { Quiz } from '../models/Quiz.js';
import { Question } from '../models/Question.js';
import { QuizAttempt } from '../models/QuizAttempt.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createQuiz = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    durationMinutes,
    marksPerQuestion,
    negativeMarks,
    passPercentage,
    randomizeQuestions
  } = req.body;

  const quiz = await Quiz.create({
    title,
    description,
    durationMinutes,
    marksPerQuestion,
    negativeMarks,
    passPercentage,
    randomizeQuestions,
    status: 'draft',
    createdBy: req.user._id
  });

  return ApiResponse.created(res, 'Quiz created successfully as draft', {
    quiz,
    questionCount: 0
  });
});

export const listQuizzes = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, status, sort = 'createdAt', order = 'desc' } = req.query;

  const filter = {};

  // Role-based visibility check: Participants ONLY see published quizzes
  if (!req.user || req.user.role === 'participant') {
    filter.status = 'published';
  } else if (status && status !== 'all') {
    filter.status = status;
  }

  // Search filter
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (page - 1) * limit;
  const sortDirection = order === 'asc' ? 1 : -1;

  const [quizzes, totalCount] = await Promise.all([
    Quiz.find(filter)
      .sort({ [sort]: sortDirection })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email')
      .lean(),
    Quiz.countDocuments(filter)
  ]);

  // Aggregate question counts for returned quizzes
  const quizIds = quizzes.map((q) => q._id);
  const questionCounts = await Question.aggregate([
    { $match: { quizId: { $in: quizIds } } },
    { $group: { _id: '$quizId', count: { $sum: 1 } } }
  ]);

  const countMap = new Map(questionCounts.map((qc) => [qc._id.toString(), qc.count]));

  const data = quizzes.map((q) => ({
    ...q,
    questionCount: countMap.get(q._id.toString()) || 0
  }));

  return ApiResponse.success(res, 'Quizzes retrieved successfully', {
    quizzes: data,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      totalCount,
      totalPages: Math.ceil(totalCount / limit)
    }
  });
});

export const getQuizById = asyncHandler(async (req, res) => {
  const { quizId } = req.params;

  const quiz = await Quiz.findById(quizId).populate('createdBy', 'name email').lean();
  if (!quiz) {
    throw ApiError.notFound('Quiz not found');
  }

  // Participants can only view published quizzes
  if ((!req.user || req.user.role === 'participant') && quiz.status !== 'published') {
    throw ApiError.notFound('Quiz not found or not currently available');
  }

  const questionCount = await Question.countDocuments({ quizId: quiz._id });

  return ApiResponse.success(res, 'Quiz retrieved successfully', {
    quiz: {
      ...quiz,
      questionCount
    }
  });
});

export const updateQuiz = asyncHandler(async (req, res) => {
  const { quizId } = req.params;

  const quiz = await Quiz.findById(quizId);
  if (!quiz) {
    throw ApiError.notFound('Quiz not found');
  }

  // Check if attempts already exist for this quiz
  const existingAttemptsCount = await QuizAttempt.countDocuments({ quizId: quiz._id });
  if (existingAttemptsCount > 0) {
    // Prevent modifying scoring rules or unpublishing to preserve historical integrity
    const criticalFields = ['marksPerQuestion', 'negativeMarks', 'passPercentage', 'randomizeQuestions', 'status'];
    const attemptedModifications = criticalFields.filter((f) => req.body[f] !== undefined && req.body[f] !== quiz[f]);
    if (attemptedModifications.length > 0) {
      throw ApiError.conflict(
        `Cannot modify critical fields [${attemptedModifications.join(', ')}] because ${existingAttemptsCount} participant attempt(s) already exist for this quiz.`
      );
    }
  }

  // Update allowed fields
  const allowedUpdates = [
    'title',
    'description',
    'durationMinutes',
    'marksPerQuestion',
    'negativeMarks',
    'passPercentage',
    'randomizeQuestions',
    'status'
  ];

  for (const field of allowedUpdates) {
    if (req.body[field] !== undefined) {
      quiz[field] = req.body[field];
    }
  }

  await quiz.save();

  const questionCount = await Question.countDocuments({ quizId: quiz._id });

  return ApiResponse.success(res, 'Quiz updated successfully', {
    quiz,
    questionCount
  });
});

export const deleteQuiz = asyncHandler(async (req, res) => {
  const { quizId } = req.params;

  const quiz = await Quiz.findById(quizId);
  if (!quiz) {
    throw ApiError.notFound('Quiz not found');
  }

  // Integrity constraint: cannot delete quiz with existing attempts
  const attemptsCount = await QuizAttempt.countDocuments({ quizId: quiz._id });
  if (attemptsCount > 0) {
    throw ApiError.conflict(
      `Cannot delete quiz because it has ${attemptsCount} existing participant attempt(s) and results. Quiz must be preserved for historical records.`
    );
  }

  // Safe deletion: delete associated questions and quiz document
  await Promise.all([
    Question.deleteMany({ quizId: quiz._id }),
    Quiz.findByIdAndDelete(quiz._id)
  ]);

  return ApiResponse.success(res, 'Quiz and its questions deleted successfully');
});

export const publishQuiz = asyncHandler(async (req, res) => {
  const { quizId } = req.params;

  const quiz = await Quiz.findById(quizId);
  if (!quiz) {
    throw ApiError.notFound('Quiz not found');
  }

  const questionCount = await Question.countDocuments({ quizId: quiz._id });
  if (questionCount === 0) {
    throw ApiError.badRequest(
      'Cannot publish quiz. A quiz must contain at least one valid question before it can be published.'
    );
  }

  quiz.status = 'published';
  await quiz.save();

  return ApiResponse.success(res, 'Quiz published successfully', {
    quiz,
    questionCount
  });
});
