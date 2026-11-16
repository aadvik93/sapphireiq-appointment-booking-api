import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Slot } from '../models/Slot.js';
import { Booking } from '../models/Booking.js';

export async function connectDatabase(uri = process.env.MONGODB_URI) {
  if (!uri) throw new Error('MONGODB_URI is not configured. Copy .env.example to .env and set it.');
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  await Promise.all([User.init(), Slot.init(), Booking.init()]);
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}
