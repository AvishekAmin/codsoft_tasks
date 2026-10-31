import { QuizAttempt } from '../models/QuizAttempt.js';
import { Quiz } from '../models/Quiz.js';
import { Question } from '../models/Question.js';
import { QuizResult } from '../models/QuizResult.js';
import { QuizService } from '../services/quiz.service.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const startAttempt = asyncHandler(async (req, res) => {
  const { quizId } = req.params;
  const userId = req.user._id;

  const quiz = await Quiz.findById(quizId);
  if (!quiz || quiz.status !== 'published') {
    throw ApiError.notFound('Quiz not found or is not currently published for attempts');
  }

  // Fetch all questions for this quiz
  const questions = await Question.find({ quizId: quiz._id }).select('_id').lean();
  if (questions.length === 0) {
    throw ApiError.badRequest('This quiz cannot be attempted because it contains no questions');
  }

  // Check if participant already has an active in_progress attempt
  const activeAttempt = await QuizAttempt.findOne({
    userId,
    quizId: quiz._id,
    status: 'in_progress'
  });

  if (activeAttempt) {
    // Check if the active attempt has expired
    if (QuizService.isAttemptExpired(activeAttempt, quiz)) {
      // Auto-finalize overdue attempt
      await QuizService.finalizeAttempt(activeAttempt._id);
    } else {
      // Resume existing active attempt
      const expiresAt = new Date(
        new Date(activeAttempt.startedAt).getTime() + quiz.durationMinutes * 60 * 1000
      );
      const remainingSeconds = Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 1000));

      return ApiResponse.success(res, 'Resuming active quiz attempt', {
        attemptId: activeAttempt._id,
        quizId: quiz._id,
        quizTitle: quiz.title,
        durationMinutes: quiz.durationMinutes,
        startedAt: activeAttempt.startedAt,
        expiresAt,
        remainingSeconds,
        questionCount: activeAttempt.questionOrder.length,
        status: activeAttempt.status
      });
    }
  }

  // Determine question order
  let questionIds = questions.map((q) => q._id);
  if (quiz.randomizeQuestions) {
    questionIds = QuizService.shuffleArray(questionIds);
  }

  const startedAt = new Date();
  const attempt = await QuizAttempt.create({
    userId,
    quizId: quiz._id,
    questionOrder: questionIds,
    answers: [],
    startedAt,
    status: 'in_progress',
    timeTakenSeconds: 0
  });

  const expiresAt = new Date(startedAt.getTime() + quiz.durationMinutes * 60 * 1000);
  const remainingSeconds = quiz.durationMinutes * 60;

  return ApiResponse.created(res, 'Quiz attempt started successfully', {
    attemptId: attempt._id,
    quizId: quiz._id,
    quizTitle: quiz.title,
    durationMinutes: quiz.durationMinutes,
    startedAt,
    expiresAt,
    remainingSeconds,
    questionCount: questionIds.length,
    status: attempt.status
  });
});

export const getAttemptQuestions = asyncHandler(async (req, res) => {
  const { attemptId } = req.params;
  const userId = req.user._id;

  const attempt = await QuizAttempt.findById(attemptId);
  if (!attempt) {
    throw ApiError.notFound('Quiz attempt not found');
  }

  // Strict ownership check
  if (!attempt.userId.equals(userId)) {
    throw ApiError.forbidden('Forbidden: You can only access your own quiz attempt');
  }

  const quiz = await Quiz.findById(attempt.quizId);
  if (!quiz) {
    throw ApiError.notFound('Associated quiz not found');
  }

  // Check if attempt expired while in_progress
  if (attempt.status === 'in_progress' && QuizService.isAttemptExpired(attempt, quiz)) {
    await QuizService.finalizeAttempt(attempt._id);
    attempt.status = 'submitted';
  }

  // Fetch questions matching stored questionOrder
  const questions = await Question.find({ _id: { $in: attempt.questionOrder } }).lean();

  // Create map of questions by ID
  const questionMap = new Map(questions.map((q) => [q._id.toString(), q]));

  // Reconstruct questions in the EXACT persisted questionOrder
  // PRIVACY: Strictly strip `isCorrect` from every option!
  const orderedQuestions = attempt.questionOrder
    .map((qId) => {
      const q = questionMap.get(qId.toString());
      if (!q) return null;
      return {
        _id: q._id,
        text: q.text,
        options: (q.options || []).map((opt) => ({
          _id: opt._id,
          text: opt.text
          // NOTE: isCorrect is deliberately excluded
        }))
      };
    })
    .filter(Boolean);

  const expiresAt = new Date(
    new Date(attempt.startedAt).getTime() + quiz.durationMinutes * 60 * 1000
  );
  const remainingSeconds = Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 1000));

  return ApiResponse.success(res, 'Attempt questions retrieved successfully', {
    attemptId: attempt._id,
    quizId: quiz._id,
    quizTitle: quiz.title,
    status: attempt.status,
    durationMinutes: quiz.durationMinutes,
    startedAt: attempt.startedAt,
    expiresAt,
    remainingSeconds,
    questionCount: orderedQuestions.length,
    questions: orderedQuestions,
    savedAnswers: attempt.answers || []
  });
});

export const saveAnswer = asyncHandler(async (req, res) => {
  const { attemptId } = req.params;
  const userId = req.user._id;

  const attempt = await QuizAttempt.findById(attemptId);
  if (!attempt) {
    throw ApiError.notFound('Quiz attempt not found');
  }

  // Strict ownership check
  if (!attempt.userId.equals(userId)) {
    throw ApiError.forbidden('Forbidden: You can only save answers to your own attempt');
  }

  // Verify attempt is active
  if (attempt.status !== 'in_progress') {
    throw ApiError.conflict('Cannot save answers. This attempt has already been submitted and finalized.');
  }

  const quiz = await Quiz.findById(attempt.quizId);
  if (!quiz) {
    throw ApiError.notFound('Associated quiz not found');
  }

  // Check if timer expired
  if (QuizService.isAttemptExpired(attempt, quiz)) {
    await QuizService.finalizeAttempt(attempt._id);
    throw ApiError.badRequest('Quiz time limit has expired. Your attempt has been automatically finalized.');
  }

  // Normalize incoming payload: supports single answer or array of answers
  const incomingAnswers = req.body.answers
    ? req.body.answers
    : [{ questionId: req.body.questionId, selectedOptionId: req.body.selectedOptionId }];

  // Validate question membership in attempt
  const allowedQuestionIds = new Set(attempt.questionOrder.map((id) => id.toString()));

  // Fetch relevant questions to validate option IDs
  const targetQuestionIds = incomingAnswers.map((a) => a.questionId);
  const questionsInDb = await Question.find({ _id: { $in: targetQuestionIds } }).lean();
  const dbQuestionMap = new Map(questionsInDb.map((q) => [q._id.toString(), q]));

  const currentAnswersMap = new Map(
    attempt.answers.map((a) => [a.questionId.toString(), a.selectedOptionId.toString()])
  );

  let updatedCount = 0;
  for (const item of incomingAnswers) {
    const qIdStr = item.questionId.toString();
    const optIdStr = item.selectedOptionId.toString();

    if (!allowedQuestionIds.has(qIdStr)) {
      throw ApiError.badRequest(`Question ID ${qIdStr} does not belong to this quiz attempt`);
    }

    const questionDoc = dbQuestionMap.get(qIdStr);
    if (!questionDoc) {
      throw ApiError.badRequest(`Question ID ${qIdStr} not found`);
    }

    const validOption = questionDoc.options?.some((opt) => opt._id.toString() === optIdStr);
    if (!validOption) {
      throw ApiError.badRequest(`Option ID ${optIdStr} is not a valid option for Question ID ${qIdStr}`);
    }

    currentAnswersMap.set(qIdStr, optIdStr);
    updatedCount++;
  }

  // Reconstruct answers array
  attempt.answers = Array.from(currentAnswersMap.entries()).map(([qId, optId]) => ({
    questionId: qId,
    selectedOptionId: optId
  }));

  await attempt.save();

  return ApiResponse.success(res, 'Answers saved successfully', {
    attemptId: attempt._id,
    updatedCount,
    totalAnswered: attempt.answers.length,
    totalQuestions: attempt.questionOrder.length
  });
});

export const submitAttempt = asyncHandler(async (req, res) => {
  const { attemptId } = req.params;
  const userId = req.user._id;

  const attempt = await QuizAttempt.findById(attemptId);
  if (!attempt) {
    throw ApiError.notFound('Quiz attempt not found');
  }

  // Strict ownership check
  if (!attempt.userId.equals(userId)) {
    throw ApiError.forbidden('Forbidden: You can only submit your own attempt');
  }

  // Finalize attempt (safe against duplicates / idempotent)
  const { result, alreadySubmitted } = await QuizService.finalizeAttempt(attempt._id);

  const message = alreadySubmitted
    ? 'Attempt was already submitted. Returning finalized result.'
    : 'Quiz attempt submitted and evaluated successfully';

  return ApiResponse.success(res, message, {
    result
  });
});

export const getAttemptResult = asyncHandler(async (req, res) => {
  const { attemptId } = req.params;
  const user = req.user;

  const result = await QuizResult.findOne({ attemptId })
    .populate('quizId', 'title description durationMinutes marksPerQuestion negativeMarks passPercentage')
    .lean();

  if (!result) {
    // If result not found, check if attempt exists
    const attempt = await QuizAttempt.findById(attemptId);
    if (!attempt) {
      throw ApiError.notFound('Attempt not found');
    }

    if (attempt.status === 'in_progress') {
      throw ApiError.badRequest('Attempt is still in progress and has not been submitted yet');
    }

    throw ApiError.notFound('Result not found for this attempt');
  }

  // Participant can only view their own result; Admins can view any
  if (user.role === 'participant' && result.userId.toString() !== user._id.toString()) {
    throw ApiError.forbidden('Forbidden: You can only view your own quiz result');
  }

  return ApiResponse.success(res, 'Quiz result retrieved successfully', {
    result
  });
});

export const getMyAttempts = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { page = 1, limit = 10 } = req.query;

  const skip = (page - 1) * limit;

  const [attempts, totalCount] = await Promise.all([
    QuizAttempt.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('quizId', 'title durationMinutes marksPerQuestion passPercentage status')
      .lean(),
    QuizAttempt.countDocuments({ userId })
  ]);

  // Fetch results for completed attempts
  const attemptIds = attempts.map((a) => a._id);
  const results = await QuizResult.find({ attemptId: { $in: attemptIds } }).lean();
  const resultMap = new Map(results.map((r) => [r.attemptId.toString(), r]));

  const data = attempts.map((attempt) => ({
    ...attempt,
    result: resultMap.get(attempt._id.toString()) || null
  }));

  return ApiResponse.success(res, 'User quiz attempts retrieved successfully', {
    attempts: data,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      totalCount,
      totalPages: Math.ceil(totalCount / limit)
    }
  });
});
