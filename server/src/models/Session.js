import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    // Multi-track scheduling support
    track: {
      name: { type: String, default: 'General', trim: true },
      color: { type: String, default: '#4f46e5', trim: true },
    },
    room: {
      type: String,
      trim: true,
      default: 'Main Hall',
    },
    // Stored in UTC (User-approved change #6)
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    speakers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    capacity: {
      type: Number,
      min: 1,
    },
    tags: [{ type: String }],
    materials: [
      {
        title: { type: String, required: true },
        fileUrl: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
      default: 'scheduled',
    },
  },
  { timestamps: true }
);

sessionSchema.index({ event: 1, startTime: 1 });
sessionSchema.index({ event: 1, room: 1 });
sessionSchema.index({ event: 1, 'track.name': 1 });
sessionSchema.index({ speakers: 1 });

export const Session = mongoose.model('Session', sessionSchema);
