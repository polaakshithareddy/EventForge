import mongoose from 'mongoose';

const eventMembershipSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    role: {
      type: String,
      enum: ['organizer', 'staff', 'speaker', 'sponsor'],
      required: true,
    },
  },
  { timestamps: true }
);

// A user can only have one specific role per event
eventMembershipSchema.index({ user: 1, event: 1 }, { unique: true });
eventMembershipSchema.index({ event: 1 });

export const EventMembership = mongoose.model('EventMembership', eventMembershipSchema);
