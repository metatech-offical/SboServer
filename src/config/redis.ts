import { createClient } from "redis";
import { REDIS_URL } from "./environment";

const redisClient = createClient({
  url: REDIS_URL,
});

redisClient.on("error", (err) => {
  console.error("Redis connection error occurred:", err);
});

redisClient.on("connect", () => {
  console.log("Redis connected");
});

redisClient.on("ready", () => {
  console.log("Redis is ready.");
});

(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error("❗ Redis connection failed:", err);
  }
})();

export default redisClient;
