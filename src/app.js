import express from 'express';
import authRoutes from './routes/authRoutes.js';
import slotRoutes from './routes/slotRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.get('/api/health', (req, res) => res.json({ success: true, data: { status: 'ok', service: 'appointment-booking-api' } }));
app.use('/api/auth', authRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/bookings', bookingRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
