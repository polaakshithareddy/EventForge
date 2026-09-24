import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  speakers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  room: { type: String, trim: true },
  capacity: { type: Number },
  tags: [{ type: String }],
});

const eventSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true },
    type: {
      type: String,
      enum: ['conference', 'workshop', 'exhibition', 'corporate', 'webinar', 'other'],
      default: 'conference',
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'cancelled', 'completed'],
      default: 'draft',
    },
    // All dates stored in UTC (user-approved change #6)
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    timezone: { type: String, default: 'UTC' }, // display only
    venue: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue' },
    isVirtual: { type: Boolean, default: false },
    virtualLink: { type: String, trim: true },
    capacity: { type: Number, required: true, min: 1 },
    registrationDeadline: { type: Date },
    ticketTypes: [
      {
        name: { type: String, required: true },
        price: { type: Number, required: true, min: 0 },
        quantity: { type: Number, required: true, min: 0 },
        sold: { type: Number, default: 0 },
        description: { type: String },
      },
    ],
    sessions: [sessionSchema],
    tags: [{ type: String }],
    coverImage: { type: String },
    isPublic: { type: Boolean, default: true },
    registrationCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

eventSchema.index({ organization: 1, status: 1 });
eventSchema.index({ startDate: 1 });
eventSchema.index({ status: 1, isPublic: 1 });

export const Event = mongoose.model('Event', eventSchema);
