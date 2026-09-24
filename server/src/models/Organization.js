import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    subscription: {
      tier: {
        type: String,
        enum: ['free', 'pro', 'enterprise'],
        default: 'free',
      },
      status: {
        type: String,
        enum: ['active', 'past_due', 'canceled'],
        default: 'active',
      },
      limits: {
        maxEvents: { type: Number, default: 1 },
        maxAttendees: { type: Number, default: 100 },
      },
    },
    contact: {
      email: { type: String, trim: true, lowercase: true },
      phone: { type: String, trim: true },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const Organization = mongoose.model('Organization', organizationSchema);
