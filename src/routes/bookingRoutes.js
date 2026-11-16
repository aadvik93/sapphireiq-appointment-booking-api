import { Router } from 'express';
import { cancelBooking, createBooking, listMyBookings } from '../controllers/bookingController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { bookSlotSchema, bookingIdSchema } from '../validators/schemas.js';

const router = Router();
router.use(requireAuth);
router.post('/', requireRole('user'), validate(bookSlotSchema), createBooking);
router.get('/mine', requireRole('user'), listMyBookings);
router.patch('/:id/cancel', validate(bookingIdSchema), cancelBooking);
export default router;
