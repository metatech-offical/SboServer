import { EContentType } from "../../constants/collectionNames";
import { STATUS_CODES } from "../../constants/statusCodes";
import ShortsModel from "../../models/short/short.schema";
import { IShorts } from "../../models/short/short.type";
import StreamModel from "../../models/stream/stream.schema";
import { IStream } from "../../models/stream/stream.type";
import TrendingScoreModel from "../../models/trendingScore/trendingScore.schema";
import { ResultDB } from "../../utils/responseHandler";
import { calculateTrendingScore } from "../../utils/trending.helper";

const SHORTS_BATCH_LIMIT = 100;
const STREAM_BATCH_LIMIT = 100;

export const updateTrendingScoresOfShorts = async () => {
  const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  let lastId = null;
  let hasMore = true;

  while (hasMore) {
    const shorts: IShorts[] = await ShortsModel.find(
      lastId
        ? {
            _id: { $gt: lastId },
            createdAt: { $gte: cutoffDate },
            deletedAt: null,
          }
        : { createdAt: { $gte: cutoffDate }, deletedAt: null }
    )
      .sort({ _id: 1 })
      .limit(SHORTS_BATCH_LIMIT);

    if (shorts.length === 0) {
      hasMore = false;
      break;
    }

    const updates = await Promise.all(
      shorts.map(async (short) => {
        try {
          const score = await calculateTrendingScore(
            Number(short.viewsCount),
            Number(short.likesCount),
            Number(short.sharesCount),
            short.createdAt
          );
          return {
            updateOne: {
              filter: { contentId: short._id },
              update: {
                contentId: short._id,
                trendingScore: score,
                contentType: EContentType.SHORT,
              },
              upsert: true,
            },
          };
        } catch (err) {
          console.error(`Error calculating score for short ${short._id}:`, err);
          return null;
        }
      })
    );

    const validUpdates = updates.filter(Boolean);
    await bulkUpdateTrendingScores(validUpdates);
    lastId = shorts[shorts.length - 1]._id;
  }

  return ResultDB(
    STATUS_CODES.OK,
    true,
    "Shorts trending score updated!",
    null
  );
};

/**
 * We update stream's trending scores in batches.
 * We set date for last 7 days
 * We update the likes, views etc in bulk by doing bulk write operation.
 * So, only streams created within the last 7 days are considered for updates.
 * Below function will run periodically within cron job
 */
export const updateTrendingScoresOfStreams = async () => {
  const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  let lastId = null;
  let hasMore = true;

  while (hasMore) {
    const streams: IStream[] = await StreamModel.find(
      lastId
        ? {
            _id: { $gt: lastId },
            createdAt: { $gte: cutoffDate },
            videoUrl: { $ne: "" },
          }
        : { createdAt: { $gte: cutoffDate }, videoUrl: { $ne: "" } }
    )
      .sort({ _id: 1 })
      .limit(STREAM_BATCH_LIMIT);

    if (streams.length === 0) {
      hasMore = false;
      break;
    }

    const updates = streams.map(async (stream: IStream) => {
      try {
        const trendingScore = await calculateTrendingScore(
          stream.viewsCount,
          stream.likesCount,
          stream.sharesCount,
          stream.createdAt
        );

        return {
          updateOne: {
            filter: { contentId: stream._id },
            update: {
              contentId: stream._id,
              trendingScore,
              contentType: EContentType.STREAM,
            },
            upsert: true,
          },
        };
      } catch (error) {
        console.error(
          `Error calculating trending score for stream ${stream._id}:`,
          error
        );
        return null;
      }
    });

    const bulkUpdates = await Promise.all(updates);
    await bulkUpdateTrendingScores(bulkUpdates);

    lastId = streams[streams.length - 1]._id;
  }
};

const bulkUpdateTrendingScores = async (updates: any[]) => {
  try {
    const result = await TrendingScoreModel.bulkWrite(updates);
    return result;
  } catch (error) {
    console.error("Error in bulk updating trending short scores:", error);
    throw error;
  }
};
