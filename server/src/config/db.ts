import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

export async function connectMongo(): Promise<void> {
  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error', { error: err.message });
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  await mongoose.connect(env.MONGO_URI);
  logger.info('MongoDB connected', { uri: redactUri(env.MONGO_URI) });
}

export function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

function redactUri(uri: string): string {
  // Avoid logging credentials if present in the connection string.
  return uri.replace(/\/\/[^@]+@/, '//***:***@');
}
