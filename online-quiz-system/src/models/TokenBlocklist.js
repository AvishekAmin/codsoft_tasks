import mongoose from 'mongoose';

const tokenBlocklistSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 } // Document expires at `expiresAt`
    }
  },
  {
    timestamps: true
  }
);

export const TokenBlocklist = mongoose.model('TokenBlocklist', tokenBlocklistSchema);
