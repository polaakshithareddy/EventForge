import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    globalRole: {
      type: String,
      enum: ['admin', 'user'],
      default: 'user',
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      // Optional: users might not belong to an org initially, or attendees might not need one
    },
    interests: [{ type: String }],
    avatar: { type: String },
    bio: { type: String, trim: true },
    company: { type: String, trim: true },
    jobTitle: { type: String, trim: true },
    socialLinks: {
      twitter: { type: String, trim: true },
      linkedin: { type: String, trim: true },
      github: { type: String, trim: true },
      website: { type: String, trim: true },
    },
    speakerTopics: [{ type: String }],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

userSchema.index({ organization: 1 });

export const User = mongoose.model('User', userSchema);
