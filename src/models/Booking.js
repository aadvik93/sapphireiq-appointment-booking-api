import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    slot: { type: mongoose.Schema.Types.ObjectId, ref: 'Slot', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['confirmed', 'cancelled'], default: 'confirmed', required: true },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

// MongoDB enforces one active booking per slot, including concurrent requests.
bookingSchema.index(
  { slot: 1 },
  { unique: true, partialFilterExpression: { status: 'confirmed' } },
);
bookingSchema.index({ user: 1, createdAt: -1 });

export const Booking = mongoose.model('Booking', bookingSchema);
