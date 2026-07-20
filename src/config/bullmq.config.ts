import IORedis from "ioredis";
import { REDIS_URL } from "./environment";

const redisOptions = {
  maxRetriesPerRequest: null as null,
  enableReadyCheck: false,
  // Railway Redis / dual-stack DNS
  family: 0,
  ...(REDIS_URL.startsWith("rediss://")
    ? { tls: { rejectUnauthorized: false } }
    : {}),
};

export const notificationQueueConnection = new IORedis(REDIS_URL || undefined, redisOptions);

export const likeQueueConnection = new IORedis(REDIS_URL || undefined, redisOptions);

notificationQueueConnection.on("error", (err) => {
  console.error("BullMQ notification Redis error:", err.message);
});

likeQueueConnection.on("error", (err) => {
  console.error("BullMQ like Redis error:", err.message);
});
