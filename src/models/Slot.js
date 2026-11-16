import mongoose from 'mongoose';

const slotSchema = new mongoose.Schema(
  {
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    notes: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { timestamps: true, versionKey: false },
);

slotSchema.index({ provider: 1, startsAt: 1, endsAt: 1 }, { unique: true });
slotSchema.index({ startsAt: 1, endsAt: 1 });

export const Slot = mongoose.model('Slot', slotSchema);
