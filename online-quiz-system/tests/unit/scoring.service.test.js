import { describe, it, expect } from '@jest/globals';
import { ScoringService } from '../../src/services/scoring.service.js';

describe('ScoringService Unit Tests', () => {
  // Sample 4-question set
  const sampleQuestions = [
    {
      _id: '64f000000000000000000001',
      options: [
        { _id: '64f00000000000000000001a', isCorrect: true },
        { _id: '64f00000000000000000001b', isCorrect: false }
      ]
    },
    {
      _id: '64f000000000000000000002',
      options: [
        { _id: '64f00000000000000000002a', isCorrect: false },
        { _id: '64f00000000000000000002b', isCorrect: true }
      ]
    },
    {
      _id: '64f000000000000000000003',
      options: [
        { _id: '64f00000000000000000003a', isCorrect: true },
        { _id: '64f00000000000000000003b', isCorrect: false }
      ]
    },
    {
      _id: '64f000000000000000000004',
      options: [
        { _id: '64f00000000000000000004a', isCorrect: false },
        { _id: '64f00000000000000000004b', isCorrect: true }
      ]
    }
  ];

  it('evaluates all answers correct accurately without negative marking', () => {
    const answers = [
      { questionId: '64f000000000000000000001', selectedOptionId: '64f00000000000000000001a' },
      { questionId: '64f000000000000000000002', selectedOptionId: '64f00000000000000000002b' },
      { questionId: '64f000000000000000000003', selectedOptionId: '64f00000000000000000003a' },
      { questionId: '64f000000000000000000004', selectedOptionId: '64f00000000000000000004b' }
    ];

    const result = ScoringService.calculateScore({
      questions: sampleQuestions,
      answers,
      marksPerQuestion: 2,
      negativeMarks: 0,
      passPercentage: 50
    });

    expect(result.correctCount).toBe(4);
    expect(result.wrongCount).toBe(0);
    expect(result.unansweredCount).toBe(0);
    expect(result.score).toBe(8);
    expect(result.totalMarks).toBe(8);
    expect(result.percentage).toBe(100);
    expect(result.passed).toBe(true);
    expect(result.certificateEligible).toBe(true);
  });

  it('evaluates all answers incorrect accurately with zero negative marking', () => {
    const answers = [
      { questionId: '64f000000000000000000001', selectedOptionId: '64f00000000000000000001b' },
      { questionId: '64f000000000000000000002', selectedOptionId: '64f00000000000000000002a' },
      { questionId: '64f000000000000000000003', selectedOptionId: '64f00000000000000000003b' },
      { questionId: '64f000000000000000000004', selectedOptionId: '64f00000000000000000004a' }
    ];

    const result = ScoringService.calculateScore({
      questions: sampleQuestions,
      answers,
      marksPerQuestion: 2,
      negativeMarks: 0,
      passPercentage: 50
    });

    expect(result.correctCount).toBe(0);
    expect(result.wrongCount).toBe(4);
    expect(result.unansweredCount).toBe(0);
    expect(result.score).toBe(0);
    expect(result.totalMarks).toBe(8);
    expect(result.percentage).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.certificateEligible).toBe(false);
  });

  it('correctly tracks unanswered questions and calculates partial score', () => {
    // Only answer 2 of the 4 questions (1 correct, 1 wrong)
    const answers = [
      { questionId: '64f000000000000000000001', selectedOptionId: '64f00000000000000000001a' },
      { questionId: '64f000000000000000000002', selectedOptionId: '64f00000000000000000002a' }
    ];

    const result = ScoringService.calculateScore({
      questions: sampleQuestions,
      answers,
      marksPerQuestion: 2,
      negativeMarks: 0.5,
      passPercentage: 50
    });

    expect(result.correctCount).toBe(1);
    expect(result.wrongCount).toBe(1);
    expect(result.unansweredCount).toBe(2);
    // score = (1 * 2) - (1 * 0.5) = 1.5
    expect(result.score).toBe(1.5);
    expect(result.totalMarks).toBe(8);
    // percentage = (1.5 / 8) * 100 = 18.75%
    expect(result.percentage).toBe(18.75);
    expect(result.passed).toBe(false);
    expect(result.certificateEligible).toBe(false);
  });

  it('deducts negative marking accurately', () => {
    // 3 correct, 1 wrong with marksPerQuestion = 4, negativeMarks = 1
    const answers = [
      { questionId: '64f000000000000000000001', selectedOptionId: '64f00000000000000000001a' },
      { questionId: '64f000000000000000000002', selectedOptionId: '64f00000000000000000002b' },
      { questionId: '64f000000000000000000003', selectedOptionId: '64f00000000000000000003a' },
      { questionId: '64f000000000000000000004', selectedOptionId: '64f00000000000000000004a' } // wrong
    ];

    const result = ScoringService.calculateScore({
      questions: sampleQuestions,
      answers,
      marksPerQuestion: 4,
      negativeMarks: 1,
      passPercentage: 65
    });

    expect(result.correctCount).toBe(3);
    expect(result.wrongCount).toBe(1);
    expect(result.unansweredCount).toBe(0);
    // score = (3 * 4) - (1 * 1) = 11
    expect(result.score).toBe(11);
    expect(result.totalMarks).toBe(16);
    // percentage = (11 / 16) * 100 = 68.75%
    expect(result.percentage).toBe(68.75);
    expect(result.passed).toBe(true);
    expect(result.certificateEligible).toBe(true);
  });

  it('clamps final score at zero when negative marking would result in negative total', () => {
    // 1 correct, 3 wrong with marksPerQuestion = 1, negativeMarks = 1
    // rawScore = (1 * 1) - (3 * 1) = -2 -> clamp to 0
    const answers = [
      { questionId: '64f000000000000000000001', selectedOptionId: '64f00000000000000000001a' },
      { questionId: '64f000000000000000000002', selectedOptionId: '64f00000000000000000002a' },
      { questionId: '64f000000000000000000003', selectedOptionId: '64f00000000000000000003b' },
      { questionId: '64f000000000000000000004', selectedOptionId: '64f00000000000000000004a' }
    ];

    const result = ScoringService.calculateScore({
      questions: sampleQuestions,
      answers,
      marksPerQuestion: 1,
      negativeMarks: 1,
      passPercentage: 50
    });

    expect(result.correctCount).toBe(1);
    expect(result.wrongCount).toBe(3);
    expect(result.score).toBe(0); // Clamped at 0
    expect(result.percentage).toBe(0);
    expect(result.passed).toBe(false);
  });

  it('handles pass-threshold boundary conditions precisely', () => {
    // Exactly at passPercentage: 2 out of 4 correct with 0 negative mark = 50%
    const answers = [
      { questionId: '64f000000000000000000001', selectedOptionId: '64f00000000000000000001a' },
      { questionId: '64f000000000000000000002', selectedOptionId: '64f00000000000000000002b' }
    ];

    // Case 1: passPercentage = 50 -> passed is true
    const resultAtThreshold = ScoringService.calculateScore({
      questions: sampleQuestions,
      answers,
      marksPerQuestion: 1,
      negativeMarks: 0,
      passPercentage: 50
    });
    expect(resultAtThreshold.percentage).toBe(50);
    expect(resultAtThreshold.passed).toBe(true);
    expect(resultAtThreshold.certificateEligible).toBe(true);

    // Case 2: passPercentage = 50.01 -> passed is false
    const resultBelowThreshold = ScoringService.calculateScore({
      questions: sampleQuestions,
      answers,
      marksPerQuestion: 1,
      negativeMarks: 0,
      passPercentage: 50.01
    });
    expect(resultBelowThreshold.percentage).toBe(50);
    expect(resultBelowThreshold.passed).toBe(false);
    expect(resultBelowThreshold.certificateEligible).toBe(false);
  });

  it('safely handles empty questions list without throwing or dividing by zero', () => {
    const result = ScoringService.calculateScore({
      questions: [],
      answers: [],
      marksPerQuestion: 1,
      negativeMarks: 0,
      passPercentage: 50
    });

    expect(result.score).toBe(0);
    expect(result.totalMarks).toBe(0);
    expect(result.percentage).toBe(0);
    expect(result.passed).toBe(false);
  });
});
