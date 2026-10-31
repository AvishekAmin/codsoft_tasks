import { Question } from '../models/Question.js';
import { Quiz } from '../models/Quiz.js';
import { QuizAttempt } from '../models/QuizAttempt.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createQuestion = asyncHandler(async (req, res) => {
  const { quizId } = req.params;
  const { text, options } = req.body;

  const quiz = await Quiz.findById(quizId);
  if (!quiz) {
    throw ApiError.notFound('Quiz not found');
  }

  // Prevent modifying questions once attempts have commenced
  const existingAttempts = await QuizAttempt.countDocuments({ quizId: quiz._id });
  if (existingAttempts > 0) {
    throw ApiError.conflict(
      `Cannot add questions to quiz because ${existingAttempts} participant attempt(s) already exist.`
    );
  }

  const question = await Question.create({
    quizId: quiz._id,
    text,
    options
  });

  return ApiResponse.created(res, 'Question added successfully', {
    question
  });
});

export const getQuizQuestions = asyncHandler(async (req, res) => {
  const { quizId } = req.params;

  const quiz = await Quiz.findById(quizId);
  if (!quiz) {
    throw ApiError.notFound('Quiz not found');
  }

  // Admin-only question retrieval: includes answer keys
  const questions = await Question.find({ quizId: quiz._id }).lean();

  return ApiResponse.success(res, 'Quiz questions retrieved successfully', {
    questions,
    count: questions.length
  });
});

export const updateQuestion = asyncHandler(async (req, res) => {
  const { questionId } = req.params;
  const { text, options } = req.body;

  const question = await Question.findById(questionId);
  if (!question) {
    throw ApiError.notFound('Question not found');
  }

  // Check if attempts exist for the parent quiz
  const existingAttempts = await QuizAttempt.countDocuments({ quizId: question.quizId });
  if (existingAttempts > 0) {
    throw ApiError.conflict(
      `Cannot modify question because ${existingAttempts} participant attempt(s) exist for this quiz.`
    );
  }

  if (text !== undefined) question.text = text;
  if (options !== undefined) question.options = options;

  await question.save();

  return ApiResponse.success(res, 'Question updated successfully', {
    question
  });
});

export const deleteQuestion = asyncHandler(async (req, res) => {
  const { questionId } = req.params;

  const question = await Question.findById(questionId);
  if (!question) {
    throw ApiError.notFound('Question not found');
  }

  // Check if attempts exist for the parent quiz
  const existingAttempts = await QuizAttempt.countDocuments({ quizId: question.quizId });
  if (existingAttempts > 0) {
    throw ApiError.conflict(
      `Cannot delete question because ${existingAttempts} participant attempt(s) exist for this quiz.`
    );
  }

  await Question.findByIdAndDelete(questionId);

  return ApiResponse.success(res, 'Question deleted successfully');
});
