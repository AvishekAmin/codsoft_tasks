import { Quiz } from '../models/Quiz.js';
import { Question } from '../models/Question.js';
import { QuizAttempt } from '../models/QuizAttempt.js';
import { QuizResult } from '../models/QuizResult.js';
import { ApiError } from '../utils/apiError.js';
import { ScoringService } from './scoring.service.js';

export class QuizService {
  /**
   * Shuffles an array using the Fisher-Yates algorithm.
   */
  static shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Checks if an attempt is expired based on server time and quiz duration.
   * A grace period of 10 seconds is allowed for network transmission.
   */
  static isAttemptExpired(attempt, quiz, graceSeconds = 10) {
    const startTime = new Date(attempt.startedAt).getTime();
    const durationMs = quiz.durationMinutes * 60 * 1000;
    const graceMs = graceSeconds * 1000;
    const now = Date.now();
    return now > startTime + durationMs + graceMs;
  }

  /**
   * Automatically finalizes an attempt if it expired or is being submitted.
   */
  static async finalizeAttempt(attemptId) {
    const attempt = await QuizAttempt.findById(attemptId);
    if (!attempt) {
      throw ApiError.notFound('Attempt not found');
    }

    // Check if result already exists (idempotency check)
    const existingResult = await QuizResult.findOne({ attemptId: attempt._id });
    if (existingResult) {
      return { attempt, result: existingResult, alreadySubmitted: true };
    }

    const quiz = await Quiz.findById(attempt.quizId);
    if (!quiz) {
      throw ApiError.notFound('Quiz associated with this attempt not found');
    }

    const questions = await Question.find({ quizId: quiz._id });

    // Calculate score
    const scoringResult = ScoringService.calculateScore({
      questions,
      answers: attempt.answers || [],
      marksPerQuestion: quiz.marksPerQuestion,
      negativeMarks: quiz.negativeMarks,
      passPercentage: quiz.passPercentage
    });

    const now = new Date();
    const startTime = new Date(attempt.startedAt).getTime();
    const timeTaken = Math.min(
      Math.max(1, Math.round((now.getTime() - startTime) / 1000)),
      quiz.durationMinutes * 60
    );

    // Update attempt
    attempt.status = 'submitted';
    attempt.submittedAt = now;
    attempt.timeTakenSeconds = timeTaken;
    await attempt.save();

    // Create result record (prevent duplicates via unique index fallback)
    let result;
    try {
      result = await QuizResult.create({
        attemptId: attempt._id,
        userId: attempt.userId,
        quizId: quiz._id,
        correctCount: scoringResult.correctCount,
        wrongCount: scoringResult.wrongCount,
        unansweredCount: scoringResult.unansweredCount,
        score: scoringResult.score,
        totalMarks: scoringResult.totalMarks,
        percentage: scoringResult.percentage,
        passed: scoringResult.passed,
        certificateEligible: scoringResult.certificateEligible,
        timeTakenSeconds: timeTaken,
        createdAt: now
      });
    } catch (err) {
      if (err.code === 11000) {
        // Handled duplicate creation gracefully
        result = await QuizResult.findOne({ attemptId: attempt._id });
      } else {
        throw err;
      }
    }

    return { attempt, result, alreadySubmitted: false };
  }
}
