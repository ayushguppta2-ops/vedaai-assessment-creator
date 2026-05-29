import { Queue } from 'bullmq';
import { createClient } from 'redis';
function getRedisConnection() {
  const url = process.env.REDIS_URL || '';
  if (!url) return { host: 'localhost', port: 6379 };
  try {
    const p = new URL(url);
    const cfg: any = { host: p.hostname, port: parseInt(p.port || '6379') };
    if (p.password) cfg.password = decodeURIComponent(p.password);
    if (p.protocol === 'rediss:') cfg.tls = { rejectUnauthorized: false };
    return cfg;
  } catch { return { host: 'localhost', port: 6379 }; }
}
export const redisConfig = getRedisConnection();
export const redisClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379', socket: process.env.REDIS_URL?.startsWith('rediss://') ? { tls: true, rejectUnauthorized: false } : undefined });
redisClient.on('error', () => {});
export const connectRedis = async () => { try { await redisClient.connect(); console.log('✅ Redis connected'); } catch { console.log('⚠️ Redis not available'); } };
let queueInstance: Queue | null = null;
export function getAssessmentQueue(): Queue | null {
  if (queueInstance) return queueInstance;
  try { queueInstance = new Queue('assessment-generation', { connection: redisConfig, defaultJobOptions: { attempts: 3, removeOnComplete: 100, removeOnFail: 100 } }); return queueInstance; } catch { return null; }
}
