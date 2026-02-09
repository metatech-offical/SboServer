import { Queue, Worker } from "bullmq";
import { QUEUE } from "../constants/queue";
import { notificationQueueConnection as connection } from "../config/bullmq.config";
import { sendFirebaseNotification } from "../services/notificationService/notification.service";

export const NotificationQueue = new Queue(QUEUE.NOTIFICATION.NAME, {
  connection,
});

const worker = new Worker(
  QUEUE.NOTIFICATION.NAME,
  async (job) => {
    const { title, body, token } = job.data;
    await sendFirebaseNotification(token, { title, body });
  },
  {
    connection,
    concurrency: QUEUE.NOTIFICATION.CONCURRENCY, // for faster performance
  }
);

worker.on("completed", (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`❌ Job ${job} failed:`, err);
});

export const addNotificationToQueue = async (
  token: string,
  title: string,
  body: string
) => {
  await NotificationQueue.add(
    "sendNotification",
    {
      title,
      body,
      token,
    },
    {
      delay: 0,
      removeOnComplete: true,
      removeOnFail: {
        age: 24 * 3600, // keep up to 24 hours - for debugging
      },
    }
  );
};
