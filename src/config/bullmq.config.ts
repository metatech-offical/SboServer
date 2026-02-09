import IORedis from "ioredis";
import { REDIS_URL } from "./environment";

export const notificationQueueConnection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const likeQueueConnection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
});
