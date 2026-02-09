// queues/like.queue.ts
import { Queue, Worker, JobsOptions } from "bullmq";
import redisClient from "../config/redis";
import mongoose from "mongoose";
import LikeModel from "../models/contentActions/like.schema";
import { likeQueueConnection as queueConnection } from "../config/bullmq.config";
import { QUEUE } from "../constants/queue";

export const LikeQueue = new Queue(QUEUE.LIKE.NAME, {
  connection: queueConnection,
});

const defaultJobOpts: JobsOptions = {
  removeOnComplete: 1000,
  removeOnFail: 1000,
};

export async function scheduleLikeTick() {
  await LikeQueue.add(
    "batchTick",
    {},
    {
      ...defaultJobOpts,
      jobId: "likes:batch:tick",
      repeat: { every: QUEUE.LIKE.BATCH_INTERVAL_MS },
    }
  );
}

// Worker to process pending sync set
const worker = new Worker(
  QUEUE.LIKE.NAME,
  async () => {
    const pendingSyncSetKey = "likes:pendingSync";
    const BATCH_SIZE = QUEUE.LIKE.BATCH_SIZE;

    let batch: string[] = [];
    if (typeof (redisClient as any).sPop === "function") {
      batch = await (redisClient as any).sPop(pendingSyncSetKey, BATCH_SIZE);
    } else {
      for (let i = 0; i < BATCH_SIZE; i++) {
        const item = await redisClient.sPop(pendingSyncSetKey);
        if (!item) break;
        batch.push(item as any);
      }
    }

    if (!batch || batch.length === 0) {
      return;
    }

    await processPendingSync(batch);
  },
  {
    connection: queueConnection,
    concurrency: QUEUE.LIKE.CONCURRENCY,
  }
);

async function processPendingSync(keys: string[]) {
  for (const key of keys) {
    const [contentType, contentId] = key.split(":");
    const likedUsersSetKey = `likes:users:${contentType}:${contentId}`;

    try {
      const likesCount = await redisClient.sCard(likedUsersSetKey);

      const Model = mongoose.model(contentType as any);
      if (Model) {
        await Model.findByIdAndUpdate(
          contentId,
          { likesCount }, //TODO: Should increase or replave here?
          { lean: true }
        );
      }

      if (QUEUE.LIKE.SYNC_LIKE_DOCS) {
        const likedUserIds = await redisClient.sMembers(likedUsersSetKey);

        const existingLikes = await LikeModel.find({
          contentId: contentId,
          userId: { $in: likedUserIds },
        }).select("userId");

        const existingUserIds = new Set(
          existingLikes.map((l) => String(l.userId))
        );
        const toInsert = likedUserIds.filter((id) => !existingUserIds.has(id));

        const allLikesForContent = await LikeModel.find({ contentId }).select(
          "userId"
        );
        const likedSet = new Set(likedUserIds);
        const toDeleteUserIds = allLikesForContent
          .map((d) => String(d.userId))
          .filter((id) => !likedSet.has(id));

        const bulkOps: any[] = [];

        for (const uId of toInsert) {
          bulkOps.push({
            updateOne: {
              filter: { contentId, userId: uId },
              update: {
                $setOnInsert: {
                  contentType,
                  likedAt: new Date(),
                },
              },
              upsert: true,
            },
          });
        }

        for (const uId of toDeleteUserIds) {
          bulkOps.push({ deleteOne: { filter: { contentId, userId: uId } } });
        }

        if (bulkOps.length) {
          await LikeModel.bulkWrite(bulkOps, { ordered: false });
        }
      }
    } catch (err) {
      console.error("[LikeQueue] processing error:", key, err);
      await redisClient.sAdd("likes:pendingSync", key); // renamed
    }
  }
}

worker.on("completed", (job) => {
  // completed batch tick
});

worker.on("failed", (job, err) => {
  console.error(`❌ Like batch job ${job?.id} failed:`, err);
});
