import cron from "node-cron";
import {
  updateTrendingScoresOfShorts,
  updateTrendingScoresOfStreams,
} from "../services/trendingService/trending.service";

cron.schedule("*/30 * * * *", async () => {
  try {
    console.log(" Trending Score Job Started for short and stream...");
    await updateTrendingScoresOfShorts();
    await updateTrendingScoresOfStreams();
    console.log("Trending Score Job Completed.");
  } catch (error) {
    console.error("Trending Score Job Failed:", error);
  }
});
