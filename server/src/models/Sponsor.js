import mongoose from 'mongoose';

const sponsorSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Sponsor company name is required'],
      trim: true,
    },
    tier: {
      type: String,
      enum: ['platinum', 'gold', 'silver', 'bronze', 'partner'],
      default: 'silver',
      index: true,
    },
    logoUrl: {
      type: String,
      trim: true,
      default: '',
    },
    websiteUrl: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    boothNumber: {
      type: String,
      trim: true,
      default: '',
    },
    contactName: {
      type: String,
      trim: true,
      default: '',
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    // Authenticated file storage (User-approved change #7)
    contractDocument: {
      filename: { type: String, default: '' },
      originalName: { type: String, default: '' },
      mimeType: { type: String, default: '' },
      size: { type: Number, default: 0 },
      uploadedAt: { type: Date },
    },
    representatives: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
sponsorSchema.index({ event: 1, tier: 1 });
sponsorSchema.index({ event: 1, boothNumber: 1 });

export const Sponsor = mongoose.model('Sponsor', sponsorSchema);
