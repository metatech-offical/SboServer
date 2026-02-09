export const QUEUE = {
  NOTIFICATION: {
    NAME: "notificationQueue",
    CONCURRENCY: 5,
    TTL: 0,
  },
  LIKE: {
    NAME: "likesQueue",
    CONCURRENCY: 5,
    TTL: 7 * 24 * 3600,
    BATCH_INTERVAL_MS: 3000,
    BATCH_SIZE: 200,
    SYNC_LIKE_DOCS: true, // turn off if you don't need per-like docs
  },
};
