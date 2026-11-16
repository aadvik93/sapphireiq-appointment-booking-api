import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

function makeToken(user) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be set to a secret of at least 32 characters.');
  }
  return jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  });
}

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.validated.body;
  const user = await User.create({ name, email, password, role: 'user' });
  res.status(201).json({ success: true, data: { user: user.toJSON(), token: makeToken(user) } });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.validated.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ success: false, error: { message: 'Email or password is incorrect.' } });
  }
  res.json({ success: true, data: { user: user.toJSON(), token: makeToken(user) } });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});
