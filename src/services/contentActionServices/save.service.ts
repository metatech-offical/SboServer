import mongoose, { Types } from "mongoose";
import { STATUS_CODES } from "../../constants/statusCodes";
import { ApiResponse, printError, ResultDB } from "../../utils/responseHandler";
import { EContentType } from "../../constants/collectionNames";
import { POST_ACTION_MESSAGES } from "../../constants/responseMessage";
import { SavedItemModel } from "../../models/contentActions/save.schema";
import { hasUserLikedContent } from ".";
import { UserFollowService } from "..";
import { IPagination } from "../../types/schema";
import { DEFAULT_PAGINATION } from "../../constants";

export const saveOrUnsaveContent = async (
  contentId: string,
  contentType: EContentType,
  userId: string,
  action: "save" | "unsave"
): Promise<ApiResponse<null>> => {
  try {
    const contentObjectId = new Types.ObjectId(contentId);
    const userObjectId = new Types.ObjectId(userId);

    if (action === "save") {
      // Use upsert to handle race conditions atomically
      const result = await SavedItemModel.updateOne(
        { contentId: contentObjectId, userId: userObjectId },
        {
          $setOnInsert: {
            contentId: contentObjectId,
            userId: userObjectId,
            contentType,
            savedAt: new Date(),
          },
        },
        { upsert: true }
      );

      // Only increment count if a new save was created
      if (result.upsertedCount > 0) {
        // Increment savesCount
        const updatedContent = await mongoose
          .model(contentType)
          .findByIdAndUpdate(
            contentObjectId,
            { $inc: { savesCount: 1 } },
            { new: true }
          );

        if (!updatedContent) {
          console.warn(`Content with ID ${contentId} not found while saving`);
          return ResultDB(
            STATUS_CODES.NOT_FOUND,
            false,
            "Content not found",
            null
          );
        }
      }
    } else if (action === "unsave") {
      const deleteResult = await SavedItemModel.deleteOne({
        contentId: contentObjectId,
        userId: userObjectId,
      });

      // Only decrement count if a save was actually removed
      if (deleteResult.deletedCount > 0) {
        const updatedContent = await mongoose
          .model(contentType)
          .findByIdAndUpdate(
            contentObjectId,
            { $inc: { savesCount: -1 } },
            { new: true }
          );

        if (!updatedContent) {
          console.warn(`Content with ID ${contentId} not found while unsaving`);
        }
      }
    } else {
      return ResultDB(
        STATUS_CODES.BAD_REQUEST,
        false,
        POST_ACTION_MESSAGES.INVALID_ACTION,
        null
      );
    }

    return ResultDB(
      STATUS_CODES.OK,
      true,
      action === "save"
        ? POST_ACTION_MESSAGES.SAVE(contentType)
        : POST_ACTION_MESSAGES.UNSAVE(contentType),
      null
    );
  } catch (error) {
    printError(error, "saveOrUnsaveContent");
    return ResultDB(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      POST_ACTION_MESSAGES.ERROR_SAVE_ACTION,
      null
    );
  }
};

export const getUserSavedItems = async (
  userId: string,
  type: EContentType,
  page: number = 1,
  limit: number = 10
): Promise<
  ApiResponse<{
    content: any;
    pagination: IPagination;
  }>
> => {
  try {
    const userObjectId = new Types.ObjectId(userId);
    const skip = (page - 1) * limit;

    // Build query filter
    const matchQuery: any = { userId: userObjectId };
    if (type) {
      matchQuery.contentType = type;
    }

    // Step 1: Get saved items with pagination (lightweight query)
    const [savedItems, totalCount] = await Promise.all([
      SavedItemModel.find(matchQuery)
        .populate({
          path: "content",
          // select:
          //   "description videoUrl creatorId creator thumbnailUrl duration category tags likesCount commentsCount viewsCount sharesCount",
          options: { strictPopulate: false },
          populate: {
            path: "creator",
            select: "username displayName profilePicture",
            options: { strictPopulate: false },
          },
        })
        .sort({ savedAt: -1 }) // Most recent first
        .skip(skip)
        .limit(limit)
        .lean(),
      SavedItemModel.countDocuments(matchQuery),
    ]);

    if (savedItems.length === 0) {
      return ResultDB(STATUS_CODES.OK, true, "No saved items found", {
        content: [],
        pagination: DEFAULT_PAGINATION,
      });
    }

    const data = await Promise.allSettled(
      savedItems.map(async (item) => {
        const isFollowing = await UserFollowService.isUserFollowingCreator(
          userId,
          item.content.creatorId
        );
        const isLiked = await hasUserLikedContent(
          userId,
          String(item.contentId)
        );
        return {
          ...item,
          isFollowing,
          isLiked,
        };
      })
    );

    // Extract fulfilled results
    const processedData = data
      .filter(
        (result): result is PromiseFulfilledResult<any> =>
          result.status === "fulfilled"
      )
      .map((result) => result.value);

    const pagination: IPagination = {
      limit,
      currentPage: page,
      totalRecords: totalCount,
      totalPages: Math.ceil(totalCount / limit),
    };

    return ResultDB(STATUS_CODES.OK, true, "Saved items fetched successfully", {
      content: processedData,
      pagination,
    });
  } catch (error) {
    printError(error, "getUserSavedItems");
    return ResultDB(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      "Failed to retrieve saved items",
      { content: [], pagination: DEFAULT_PAGINATION }
    );
  }
};

export const hasUserSavedContent = async (
  userId: string,
  contentId: string
) => {
  const userObjectId = new Types.ObjectId(userId);
  const contentObjectId = new Types.ObjectId(contentId);
  const savedItem = await SavedItemModel.findOne({
    userId: userObjectId,
    contentId: contentObjectId,
  });
  return savedItem ? true : false;
};
