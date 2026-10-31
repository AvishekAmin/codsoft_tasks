import mongoose from 'mongoose';

const optionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Option text is required'],
    trim: true,
    minlength: [1, 'Option text cannot be empty']
  },
  isCorrect: {
    type: Boolean,
    required: true,
    default: false
  }
});

const questionSchema = new mongoose.Schema(
  {
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      required: [true, 'Quiz reference is required'],
      index: true
    },
    text: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
      minlength: [3, 'Question text must be at least 3 characters']
    },
    options: {
      type: [optionSchema],
      validate: [
        {
          validator: (options) => Array.isArray(options) && options.length >= 2,
          message: 'Question must have at least 2 options'
        },
        {
          validator: (options) =>
            Array.isArray(options) &&
            options.filter((opt) => opt.isCorrect === true).length === 1,
          message: 'Question must have exactly one correct option'
        }
      ]
    }
  },
  {
    timestamps: true
  }
);

questionSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

export const Question = mongoose.model('Question', questionSchema);
