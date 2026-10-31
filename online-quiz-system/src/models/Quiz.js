import mongoose from 'mongoose';

const quizSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Quiz title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [150, 'Title must not exceed 150 characters']
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Description must not exceed 1000 characters']
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Quiz creator is required'],
      index: true
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
      index: true
    },
    durationMinutes: {
      type: Number,
      required: [true, 'Duration in minutes is required'],
      min: [1, 'Duration must be at least 1 minute'],
      max: [300, 'Duration cannot exceed 300 minutes']
    },
    marksPerQuestion: {
      type: Number,
      required: [true, 'Marks per question is required'],
      min: [0.5, 'Marks per question must be at least 0.5'],
      default: 1
    },
    negativeMarks: {
      type: Number,
      default: 0,
      min: [0, 'Negative marks cannot be less than 0']
    },
    passPercentage: {
      type: Number,
      required: [true, 'Pass percentage is required'],
      min: [0, 'Pass percentage must be at least 0%'],
      max: [100, 'Pass percentage cannot exceed 100%'],
      default: 50
    },
    randomizeQuestions: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

quizSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

export const Quiz = mongoose.model('Quiz', quizSchema);
