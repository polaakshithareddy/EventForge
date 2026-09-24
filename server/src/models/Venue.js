import mongoose from 'mongoose';

const venueSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: { type: String, trim: true },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true, required: true },
      state: { type: String, trim: true },
      country: { type: String, trim: true, required: true },
      postalCode: { type: String, trim: true },
    },
    capacity: { type: Number, required: true, min: 1 },
    amenities: [{ type: String }],
    contactEmail: { type: String, trim: true, lowercase: true },
    contactPhone: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

venueSchema.index({ organization: 1 });
venueSchema.index({ 'address.city': 1 });

export const Venue = mongoose.model('Venue', venueSchema);
