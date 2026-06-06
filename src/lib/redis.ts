import IORedis from "ioredis";

const globalForRedis = globalThis as typeof globalThis & {
  redis?: IORedis;
};

export function getRedisConnection(): IORedis {
  const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
  const protocol = new URL(redisUrl).protocol;
  globalForRedis.redis ??= new IORedis(redisUrl, {
    ...(protocol === "rediss:" ? { tls: {} } : {}),
    maxRetriesPerRequest: null
  });

  return globalForRedis.redis;
}
