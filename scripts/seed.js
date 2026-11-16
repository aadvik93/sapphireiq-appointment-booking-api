import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/database.js';
import { User } from '../src/models/User.js';
import { Slot } from '../src/models/Slot.js';

const password = process.env.SEED_PROVIDER_PASSWORD;
if (!password || password.length < 12 || password.length > 72) {
  console.error('Set SEED_PROVIDER_PASSWORD to a password between 12 and 72 characters before seeding.');
  process.exit(1);
}

try {
  await connectDatabase();
  const providers = [];
  for (const [name, email] of [
    ['Dr. Alex Morgan', 'alex.morgan@example.com'],
    ['Dr. Sam Taylor', 'sam.taylor@example.com'],
    ['Dr. Jordan Lee', 'jordan.lee@example.com'],
  ]) {
    let provider = await User.findOne({ email });
    if (!provider) provider = await User.create({ name, email, password, role: 'provider' });
    providers.push(provider);
  }

  let created = 0;
  for (const [index, provider] of providers.entries()) {
    for (let day = 1; day <= 7; day += 1) {
      const startsAt = new Date();
      startsAt.setDate(startsAt.getDate() + day);
      startsAt.setHours(9 + index, 0, 0, 0);
      const endsAt = new Date(startsAt.getTime() + 30 * 60 * 1000);
      const exists = await Slot.exists({ provider: provider._id, startsAt, endsAt });
      if (!exists) {
        await Slot.create({ provider: provider._id, startsAt, endsAt, notes: 'Seeded demo availability' });
        created += 1;
      }
    }
  }
  console.log(`Seed complete: ${providers.length} providers; ${created} new slots.`);
} catch (error) {
  console.error(`Seed failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
