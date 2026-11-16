import { z } from 'zod';

const request = z.object({ body: z.unknown(), params: z.record(z.string()), query: z.record(z.unknown()) });
const objectBody = z.record(z.unknown());
const email = z.string().trim().email().max(254).transform((value) => value.toLowerCase());

export const registerSchema = request.extend({
  body: z.object({
    name: z.string().trim().min(1).max(100),
    email,
    password: z.string().min(8).max(72),
  }).strict(),
});

export const loginSchema = request.extend({
  body: z.object({ email, password: z.string().min(1).max(72) }).strict(),
});

export const createSlotSchema = request.extend({
  body: z.object({
    startsAt: z.string().datetime({ offset: true }),
    endsAt: z.string().datetime({ offset: true }),
    notes: z.string().trim().max(500).optional().default(''),
  }).strict().superRefine((body, ctx) => {
    const start = new Date(body.startsAt);
    const end = new Date(body.endsAt);
    if (end <= start) ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'endsAt must be later than startsAt.' });
    if (start <= new Date()) ctx.addIssue({ code: 'custom', path: ['startsAt'], message: 'startsAt must be in the future.' });
  }),
});

export const listSlotsSchema = request.extend({
  query: z.object({
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
    providerId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  }).passthrough(),
});

export const bookSlotSchema = request.extend({
  body: z.object({ slotId: z.string().regex(/^[a-f\d]{24}$/i) }).strict(),
});

export const bookingIdSchema = request.extend({
  params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) }),
  body: objectBody,
});
