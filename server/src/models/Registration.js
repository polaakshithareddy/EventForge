import mongoose from 'mongoose';

const registrationSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    ticketType: {
      name: { type: String, required: true },
      price: { type: Number, required: true, min: 0 },
    },
    ticketCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    qrCode: {
      type: String, // Data URL containing QR image
      required: true,
    },
    status: {
      type: String,
      enum: ['confirmed', 'cancelled', 'waitlisted'],
      default: 'confirmed',
    },
    // User-approved change #1: paymentStatus enum with organizer mark-as-paid action
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'free', 'refunded'],
      default: 'unpaid',
    },
    paidAt: { type: Date },
    checkedIn: { type: Boolean, default: false },
    checkedInAt: { type: Date },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

// Attendee access comes from having a Registration for the event (User-approved change #3)
registrationSchema.index({ event: 1, user: 1 }, { unique: true });
registrationSchema.index({ event: 1, status: 1 });
registrationSchema.index({ event: 1, paymentStatus: 1 });
registrationSchema.index({ user: 1 });

export const Registration = mongoose.model('Registration', registrationSchema);
