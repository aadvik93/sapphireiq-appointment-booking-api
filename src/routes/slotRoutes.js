import { Router } from 'express';
import { createSlot, listAvailableSlots, listProviderSlots } from '../controllers/slotController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createSlotSchema, listSlotsSchema } from '../validators/schemas.js';

const router = Router();
router.get('/available', validate(listSlotsSchema), listAvailableSlots);
router.post('/', requireAuth, requireRole('provider'), validate(createSlotSchema), createSlot);
router.get('/mine', requireAuth, requireRole('provider'), listProviderSlots);
export default router;
