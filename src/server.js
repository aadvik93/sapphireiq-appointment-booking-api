import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app.js';
import { connectDatabase } from './config/database.js';

const port = Number(process.env.PORT || 5000);

try {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be set to a random secret of at least 32 characters.');
  }
  await connectDatabase();
  const server = app.listen(port, () => console.log(`API listening on http://localhost:${port}`));

  const shutdown = (signal) => {
    console.log(`${signal} received. Closing server...`);
    server.close(async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
} catch (error) {
  console.error(`Unable to start API: ${error.message}`);
  process.exit(1);
}
