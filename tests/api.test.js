import { afterAll, afterEach, beforeAll, describe, expect, test } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import app from '../src/app.js';
import { Booking } from '../src/models/Booking.js';
import { Slot } from '../src/models/Slot.js';
import { User } from '../src/models/User.js';

let mongo;
let provider;
let providerToken;
let userToken;

async function register(name, email, role = 'user') {
  if (role === 'provider') {
    const user = await User.create({ name, email, password: 'strong-password-123', role });
    const jwt = await import('jsonwebtoken');
    return {
      user,
      token: jwt.default.sign({ sub: user._id.toString(), role }, process.env.JWT_SECRET, { expiresIn: '1h' }),
    };
  }
  const response = await request(app).post('/api/auth/register').send({ name, email, password: 'strong-password-123' });
  return { user: response.body.data.user, token: response.body.data.token, response };
}

async function makeSlot(overrides = {}) {
  const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return Slot.create({
    provider: provider._id,
    startsAt,
    endsAt: new Date(startsAt.getTime() + 30 * 60 * 1000),
    ...overrides,
  });
}

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-only-secret-long-enough-for-jwt-signatures';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Promise.all([User.init(), Slot.init(), Booking.init()]);
  const registeredProvider = await register('Demo Provider', 'provider@example.test', 'provider');
  provider = registeredProvider.user;
  providerToken = registeredProvider.token;
  const registeredUser = await register('Demo User', 'user@example.test');
  userToken = registeredUser.token;
});

afterEach(async () => {
  await Promise.all([Booking.deleteMany({}), Slot.deleteMany({})]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe('authentication and role access', () => {
  test('registers a user with a hashed password and returns a usable JWT', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'New User', email: 'new.user@example.test', password: 'correct-horse-battery',
    });
    expect(response.status).toBe(201);
    expect(response.body.data.user.role).toBe('user');
    expect(response.body.data.user.password).toBeUndefined();
    const saved = await User.findOne({ email: 'new.user@example.test' }).select('+password');
    expect(saved.password).not.toBe('correct-horse-battery');
    expect((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${response.body.data.token}`)).status).toBe(200);
  });

  test('logs in with valid credentials and rejects an invalid password', async () => {
    const saved = await User.findById(provider._id).select('+password');
    const loginUser = await User.create({ name: 'Login User', email: 'login@example.test', password: 'correct-password-123' });
    expect(saved).toBeTruthy();
    expect((await request(app).post('/api/auth/login').send({ email: loginUser.email, password: 'correct-password-123' })).status).toBe(200);
    expect((await request(app).post('/api/auth/login').send({ email: loginUser.email, password: 'wrong-password' })).status).toBe(401);
  });

  test('requires authentication and denies users provider-only slot creation', async () => {
    const noToken = await request(app).post('/api/slots').send({});
    const userAttempt = await request(app).post('/api/slots').set('Authorization', `Bearer ${userToken}`).send({
      startsAt: new Date(Date.now() + 86400000).toISOString(),
      endsAt: new Date(Date.now() + 88200000).toISOString(),
    });
    expect(noToken.status).toBe(401);
    expect(userAttempt.status).toBe(403);
  });
});

describe('slots and bookings', () => {
  test('lets providers create future slots and lists them as available', async () => {
    const startsAt = new Date(Date.now() + 86400000).toISOString();
    const endsAt = new Date(Date.now() + 88200000).toISOString();
    const created = await request(app).post('/api/slots').set('Authorization', `Bearer ${providerToken}`).send({ startsAt, endsAt });
    expect(created.status).toBe(201);
    const available = await request(app).get('/api/slots/available');
    expect(available.status).toBe(200);
    expect(available.body.data.slots).toHaveLength(1);
    expect(available.body.data.slots[0].provider.email).toBe('provider@example.test');
  });

  test('rejects invalid time ranges and overlapping provider slots', async () => {
    const startsAt = new Date(Date.now() + 86400000);
    const endsAt = new Date(startsAt.getTime() + 30 * 60 * 1000);
    expect((await request(app).post('/api/slots').set('Authorization', `Bearer ${providerToken}`).send({ startsAt: endsAt.toISOString(), endsAt: startsAt.toISOString() })).status).toBe(400);
    await makeSlot({ startsAt, endsAt });
    const overlap = await request(app).post('/api/slots').set('Authorization', `Bearer ${providerToken}`).send({
      startsAt: new Date(startsAt.getTime() + 10 * 60 * 1000).toISOString(),
      endsAt: new Date(endsAt.getTime() + 10 * 60 * 1000).toISOString(),
    });
    expect(overlap.status).toBe(409);
  });

  test('only one of two simultaneous booking requests succeeds', async () => {
    const slot = await makeSlot();
    const payload = { slotId: slot._id.toString() };
    const responses = await Promise.all([
      request(app).post('/api/bookings').set('Authorization', `Bearer ${userToken}`).send(payload),
      request(app).post('/api/bookings').set('Authorization', `Bearer ${userToken}`).send(payload),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    expect(await Booking.countDocuments({ slot: slot._id, status: 'confirmed' })).toBe(1);
  });

  test('cancelling a booking makes its slot available again', async () => {
    const slot = await makeSlot();
    const booked = await request(app).post('/api/bookings').set('Authorization', `Bearer ${userToken}`).send({ slotId: slot._id.toString() });
    expect(booked.status).toBe(201);
    expect((await request(app).get('/api/slots/available')).body.data.slots).toHaveLength(0);
    const cancelled = await request(app).patch(`/api/bookings/${booked.body.data.booking._id}/cancel`).set('Authorization', `Bearer ${userToken}`).send({});
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.booking.status).toBe('cancelled');
    expect((await request(app).get('/api/slots/available')).body.data.slots).toHaveLength(1);
  });

  test('prevents another user from cancelling the booking', async () => {
    const other = await register('Other User', 'other@example.test');
    const slot = await makeSlot();
    const booked = await request(app).post('/api/bookings').set('Authorization', `Bearer ${userToken}`).send({ slotId: slot._id.toString() });
    const response = await request(app).patch(`/api/bookings/${booked.body.data.booking._id}/cancel`).set('Authorization', `Bearer ${other.token}`).send({});
    expect(response.status).toBe(403);
  });
});
