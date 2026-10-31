/**
 * Scoring Service
 * Encapsulates the evaluation and score calculation logic for quiz attempts.
 *
 * Scoring Rules:
 * - score = (correctCount * marksPerQuestion) - (wrongCount * negativeMarks)
 * - totalMarks = questionCount * marksPerQuestion
 * - percentage = (score / totalMarks) * 100 (rounded to 2 decimal places)
 * - unansweredCount = questionCount - correctCount - wrongCount
 * - If negative marking produces a score < 0, it is clamped at 0.
 * - passed = percentage >= passPercentage
 * - certificateEligible = passed
 */
export class ScoringService {
  /**
   * Evaluates participant answers against correct question options and computes final score.
   *
   * @param {Object} params
   * @param {Array} params.questions - Array of question documents (with options and isCorrect)
   * @param {Array} params.answers - Array of participant answers [{ questionId, selectedOptionId }]
   * @param {number} params.marksPerQuestion - Positive points for each correct answer
   * @param {number} params.negativeMarks - Deduction points for each wrong answer
   * @param {number} params.passPercentage - Minimum percentage to pass and qualify for certificate
   * @returns {Object} Finalized evaluation metrics
   */
  static calculateScore({
    questions = [],
    answers = [],
    marksPerQuestion = 1,
    negativeMarks = 0,
    passPercentage = 50
  }) {
    const questionCount = questions.length;
    if (questionCount === 0) {
      return {
        correctCount: 0,
        wrongCount: 0,
        unansweredCount: 0,
        score: 0,
        totalMarks: 0,
        percentage: 0,
        passed: false,
        certificateEligible: false
      };
    }

    // Build map of questionId -> correct optionId and valid optionIds
    const questionMap = new Map();
    for (const q of questions) {
      const qIdStr = q._id.toString();
      const correctOption = q.options?.find((opt) => opt.isCorrect === true);
      const validOptionIds = new Set(q.options?.map((opt) => opt._id.toString()) || []);
      questionMap.set(qIdStr, {
        correctOptionId: correctOption ? correctOption._id.toString() : null,
        validOptionIds
      });
    }

    // Map participant answers by questionId
    const answerMap = new Map();
    for (const ans of answers) {
      if (ans && ans.questionId && ans.selectedOptionId) {
        answerMap.set(ans.questionId.toString(), ans.selectedOptionId.toString());
      }
    }

    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;

    for (const [qIdStr, qData] of questionMap.entries()) {
      const selectedOptionId = answerMap.get(qIdStr);

      if (!selectedOptionId) {
        unansweredCount++;
      } else if (qData.validOptionIds.has(selectedOptionId)) {
        if (selectedOptionId === qData.correctOptionId) {
          correctCount++;
        } else {
          wrongCount++;
        }
      } else {
        // If participant submitted an invalid option ID for this question, count as unanswered or wrong
        wrongCount++;
      }
    }

    const totalMarks = Math.round(questionCount * marksPerQuestion * 100) / 100;
    const rawScore = correctCount * marksPerQuestion - wrongCount * negativeMarks;
    // Clamp score at zero to prevent negative total marks
    const score = Math.max(0, Math.round(rawScore * 100) / 100);

    const rawPercentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;
    const percentage = Math.round(rawPercentage * 100) / 100;

    const passed = percentage >= passPercentage;
    const certificateEligible = passed;

    return {
      correctCount,
      wrongCount,
      unansweredCount,
      score,
      totalMarks,
      percentage,
      passed,
      certificateEligible
    };
  }
}
