import { Booking } from '../models/Booking.js';
import { Slot } from '../models/Slot.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const createBooking = asyncHandler(async (req, res) => {
  const { slotId } = req.validated.body;
  const slot = await Slot.findOne({ _id: slotId, startsAt: { $gt: new Date() } }).lean();
  if (!slot) return res.status(404).json({ success: false, error: { message: 'Future slot not found.' } });

  try {
    const booking = await Booking.create({ slot: slot._id, user: req.user._id });
    await booking.populate([
      { path: 'slot', populate: { path: 'provider', select: 'name email' } },
      { path: 'user', select: 'name email' },
    ]);
    return res.status(201).json({ success: true, data: { booking } });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, error: { message: 'This slot has already been booked.' } });
    }
    throw error;
  }
});

export const listMyBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ user: req.user._id })
    .populate({ path: 'slot', populate: { path: 'provider', select: 'name email' } })
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, data: { bookings, count: bookings.length } });
});

export const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({ _id: req.validated.params.id, status: 'confirmed' }).populate('slot');
  if (!booking) return res.status(404).json({ success: false, error: { message: 'Active booking not found.' } });

  const isOwner = booking.user.toString() === req.user._id.toString();
  const isProvider = req.user.role === 'provider' && booking.slot.provider.toString() === req.user._id.toString();
  if (!isOwner && !isProvider) {
    return res.status(403).json({ success: false, error: { message: 'Only the booking owner or its provider can cancel it.' } });
  }

  booking.status = 'cancelled';
  booking.cancelledAt = new Date();
  await booking.save();
  res.json({ success: true, data: { booking } });
});
