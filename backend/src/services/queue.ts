import { Queue, Worker, QueueEvents } from 'bullmq';
import { createClient } from 'redis';

const redisConfig = {
  host: process.env.REDIS_URL ? new URL(process.env.REDIS_URL).hostname : 'localhost',
  port: process.env.REDIS_URL ? parseInt(new URL(process.env.REDIS_URL).port || '6379') : 6379,
  password: process.env.REDIS_URL ? new URL(process.env.REDIS_URL).password || undefined : undefined,
};

// Redis client for caching
export const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
  console.log('Redis Client Error (non-fatal):', err.message);
});

export const connectRedis = async () => {
  try {
    await redisClient.connect();
    console.log('✅ Redis connected');
  } catch (err) {
    console.log('⚠️  Redis not available, running without cache');
  }
};

// BullMQ Assessment Queue
export const assessmentQueue = new Queue('assessment-generation', {
  connection: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 100
  }
});

export const assessmentQueueEvents = new QueueEvents('assessment-generation', {
  connection: redisConfig
});

export { redisConfig };
