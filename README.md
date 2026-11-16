# Appointment Booking API

A REST API for provider availability and appointment bookings, built with Node.js 18+, Express, MongoDB/Mongoose, JWT, bcrypt, and Zod. It demonstrates role-based access, time-slot management, cancellation, conflict prevention, centralized errors, and automated API tests.

## Run locally

1. Install Node.js 18+ and MongoDB, or create a MongoDB Atlas database.
2. Copy `.env.example` to `.env`. Set `MONGODB_URI` and replace `JWT_SECRET` with a random secret of at least 32 characters.
3. Run `npm install`.
4. Start the API with `npm run dev` or `npm start`.
5. Check `http://localhost:5000/api/health`.

The application refuses to start without a sufficiently long JWT secret. Keep `.env` private; it is excluded from Git.

## API overview

All routes are under `/api`. Successful responses use `{ "success": true, "data": ... }`; errors use `{ "success": false, "error": { "message": ... } }`. Validation errors include field-level details.

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/health` | Public | Health check |
| POST | `/auth/register` | Public | Register a standard user |
| POST | `/auth/login` | Public | Log in and receive a JWT |
| GET | `/auth/me` | Authenticated | Get the current account |
| GET | `/slots/available` | Public | List future slots that are not booked |
| POST | `/slots` | Provider | Create an available slot |
| GET | `/slots/mine` | Provider | List the provider's slots |
| POST | `/bookings` | User | Book an available slot |
| GET | `/bookings/mine` | User | List the user's bookings |
| PATCH | `/bookings/:id/cancel` | Booking owner or slot provider | Cancel an active booking |

For protected routes, send `Authorization: Bearer <token>`. Public registration always creates a `user` role. Provider accounts are created through the seed script so clients cannot grant themselves provider access.

### Example workflow

Register and log in:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Jamie User","email":"jamie@example.com","password":"a-long-password-123"}'

curl -X POST http://localhost:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"jamie@example.com","password":"a-long-password-123"}'
```

Create a provider and demo slots:

```bash
SEED_PROVIDER_PASSWORD='choose-a-long-demo-password' npm run seed
```

The seed script creates three demo providers and up to seven future slots per provider. It is safe to rerun and does not overwrite existing provider passwords. Use the demo provider emails in `scripts/seed.js` with the password you supplied to sign in and create more slots.

List and book availability:

```bash
curl 'http://localhost:5000/api/slots/available?from=2027-01-01T00:00:00.000Z&to=2027-01-08T00:00:00.000Z'

curl -X POST http://localhost:5000/api/bookings \
  -H 'Authorization: Bearer USER_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"slotId":"SLOT_ID"}'

curl -X PATCH http://localhost:5000/api/bookings/BOOKING_ID/cancel \
  -H 'Authorization: Bearer USER_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

## Booking integrity

Confirmed bookings have a partial unique MongoDB index on `slot`. The database therefore accepts only one confirmed booking per slot, even when two booking requests arrive at the same time. Cancellation changes the booking state, releasing the unique constraint so the slot becomes available again. Providers cannot create overlapping slots through the API.

## Automated tests

Run `npm test`. Jest and Supertest exercise the actual Express routes against an isolated in-memory MongoDB. The suite covers registration and password hashing, login, JWT protection, role checks, slot validation, overlap rejection, simultaneous booking conflicts, cancellation, and ownership checks.

## Seeded demo providers

The seed script uses these demo accounts; the password is the `SEED_PROVIDER_PASSWORD` value passed when seeding:

- `alex.morgan@example.com`
- `sam.taylor@example.com`
- `jordan.lee@example.com`

## Project structure

```text
src/
  app.js                   Express setup and route wiring
  server.js                Startup, MongoDB connection, shutdown
  config/database.js       Mongoose connection and index setup
  controllers/             Authentication, slots, and bookings
  middleware/              JWT/role guards, validation, errors
  models/                  User, Slot, and Booking schemas
  routes/                  REST endpoint definitions
  validators/schemas.js    Zod request schemas
scripts/seed.js            Demo providers and future slots
tests/api.test.js          Jest/Supertest integration tests
```

The five guide modules are reflected in the structure: setup and modeling, JWT and roles, slot/booking routes, validation and conflict prevention, and errors/testing.
