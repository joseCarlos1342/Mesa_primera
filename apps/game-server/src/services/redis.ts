import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

/** Shared Redis client for general commands (publish, get, set). */
export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

/**
 * Creates a dedicated Redis subscriber instance.
 * Subscribers cannot issue other commands while subscribed,
 * so each subscription needs its own connection.
 */
export function createRedisSubscriber(): Redis {
  return new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });
}

let lastError = "";
redis.on("error", (err) => {
  if (err.message === lastError) return;
  lastError = err.message;
  if (process.env.NODE_ENV === "development") {
    console.warn("[GameServer Redis]:", err.message);
  }
});
