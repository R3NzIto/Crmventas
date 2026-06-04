import IORedis from "ioredis";

const globalForRedis = globalThis as typeof globalThis & {
  redis?: IORedis;
};

export const redisConnection: IORedis =
  globalForRedis.redis ??
  new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: null
  });

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redisConnection;
}
