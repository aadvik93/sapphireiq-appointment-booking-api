import { Booking } from '../models/Booking.js';
import { Slot } from '../models/Slot.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const createSlot = asyncHandler(async (req, res) => {
  const { startsAt, endsAt, notes } = req.validated.body;
  const overlaps = await Slot.exists({
    provider: req.user._id,
    startsAt: { $lt: new Date(endsAt) },
    endsAt: { $gt: new Date(startsAt) },
  });
  if (overlaps) return res.status(409).json({ success: false, error: { message: 'This slot overlaps an existing slot for the provider.' } });

  const slot = await Slot.create({ provider: req.user._id, startsAt, endsAt, notes });
  res.status(201).json({ success: true, data: { slot } });
});

export const listAvailableSlots = asyncHandler(async (req, res) => {
  const { from, to, providerId } = req.validated.query;
  const bookedSlotIds = await Booking.distinct('slot', { status: 'confirmed' });
  const filter = { startsAt: { $gt: new Date(), ...(from && { $gte: new Date(from) }) }, _id: { $nin: bookedSlotIds } };
  if (to) filter.startsAt.$lte = new Date(to);
  if (providerId) filter.provider = providerId;

  const slots = await Slot.find(filter)
    .populate('provider', 'name email')
    .sort({ startsAt: 1 })
    .lean();
  res.json({ success: true, data: { slots, count: slots.length } });
});

export const listProviderSlots = asyncHandler(async (req, res) => {
  const slots = await Slot.find({ provider: req.user._id }).sort({ startsAt: 1 }).lean();
  res.json({ success: true, data: { slots, count: slots.length } });
});
