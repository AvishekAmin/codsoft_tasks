import mongoose from 'mongoose';

const quizResultSchema = new mongoose.Schema(
  {
    attemptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QuizAttempt',
      required: true,
      unique: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      required: true,
      index: true
    },
    correctCount: {
      type: Number,
      required: true,
      min: 0
    },
    wrongCount: {
      type: Number,
      required: true,
      min: 0
    },
    unansweredCount: {
      type: Number,
      required: true,
      min: 0
    },
    score: {
      type: Number,
      required: true,
      min: 0
    },
    totalMarks: {
      type: Number,
      required: true,
      min: 0
    },
    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    passed: {
      type: Boolean,
      required: true
    },
    certificateEligible: {
      type: Boolean,
      required: true
    },
    timeTakenSeconds: {
      type: Number,
      default: 0
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: false
  }
);

quizResultSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

export const QuizResult = mongoose.model('QuizResult', quizResultSchema);
