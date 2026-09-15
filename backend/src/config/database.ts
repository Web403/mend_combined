import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../core/utils/logger';

export const connectDatabase = async (): Promise<void> => {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    logger.info('✅ MongoDB connected');
  } catch (error) {
    logger.error('MongoDB connection error', error);
    process.exit(1);
  }
};
