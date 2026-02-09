import mongoose from "mongoose";
import { MESSAGES, SHORT_MESSAGES } from "../../constants/responseMessage";
import { STATUS_CODES } from "../../constants/statusCodes";
import ShortsModel from "../../models/short/short.schema";
import {
  IShorts,
  IPopulatedShort,
  IShortsQuery,
} from "../../models/short/short.type";
import { ApiResponse, printError, ResultDB } from "../../utils/responseHandler";
import {
  hasUserLikedContent,
  hasUserViewedContent,
} from "../contentActionServices";
import { NotificationService, UserFollowService } from "..";
import { hasUserSavedContent } from "../contentActionServices/save.service";
import { escapeRegex } from "../../utils/regex.helper";
import {
  isFollowingPipeline,
  getRecommendationPipeline,
  isContentLikedPipeline,
  isViewedPipeline,
  isContentSavedPipeline,
  isSubscribedPipeline,
} from "../../utils/pipeline";
import { collectionNames, EContentType } from "../../constants/collectionNames";
import { IPagination } from "../../types/schema";
import { DEFAULT_DATA_WITH_PAGINATION } from "../../constants";
import { IUser } from "../../models/user/user.type";
import {
  filterContentByVisibilityPipeline,
  getTrendingDataPipeline,
  getConditionalVideoUrlProjection,
} from "../../utils/pipeline";
import { hasUserSubscribedCreator } from "../subscription/subscription.service";
import { EContentVisibility } from "../../types/enum";

/**
 * Service function for creating shorts
 */
export const createShorts = async (
  data: Partial<IShorts>,
  creator: IUser
): Promise<ApiResponse<IShorts> | null> => {
  try {
    const newShort = await ShortsModel.create(data);

    //send notification to all followers of creator
    NotificationService.sendNewPostNotification(
      creator,
      newShort._id.toString(),
      EContentType.SHORT
    );
    return ResultDB<IShorts>(
      STATUS_CODES.CREATED,
      true,
      SHORT_MESSAGES.CREATED,
      newShort
    );
  } catch (error) {
    printError(error, "createShorts");
    return null;
  }
};

// get short with keys - isFollowing, isLiked, isViewed, isSaved
export const getPopulatedShortById = async (
  shortId: string,
  userId: string
): Promise<ApiResponse<any | null>> => {
  try {
    const shortObjId = new mongoose.Types.ObjectId(shortId);
    const populatedShort = await ShortsModel.findOne({
      _id: shortObjId,
      deletedAt: null,
    })
      .populate({
        path: "creator",
        select: "username displayName profilePicture",
      })
      .lean();
    if (!populatedShort) {
      return ResultDB(STATUS_CODES.NOT_FOUND, false, MESSAGES.NOT_FOUND, null);
    }

    const [isLiked, isViewed, isSaved, isFollowing, isSubscribed] =
      await Promise.all([
        hasUserLikedContent(userId, shortId),
        hasUserViewedContent(userId, shortId),
        hasUserSavedContent(userId, shortId),
        UserFollowService.isUserFollowingCreator(
          userId,
          populatedShort.creatorId.toString()
        ),
        hasUserSubscribedCreator(userId, String(populatedShort.creatorId)),
      ]);

    // send video url null if not subscribed
    const videoUrl =
      String(userId) === String(populatedShort.creatorId) ||
      populatedShort.settings.visibility === EContentVisibility.everyone
        ? populatedShort.videoUrl
        : isSubscribed
        ? populatedShort.videoUrl
        : null;
    return ResultDB(STATUS_CODES.OK, true, MESSAGES.FETCHED, {
      ...populatedShort,
      _id: String(populatedShort._id),
      isLiked,
      isViewed,
      isSaved,
      isFollowing,
      videoUrl,
    });
  } catch (error) {
    printError(error, "getShortById");
    return ResultDB(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      MESSAGES.INTERNAL_SERVER_ERROR,
      null
    );
  }
};

export const deleteShortById = async (
  shortId: string,
  userId: string
): Promise<ApiResponse<null>> => {
  try {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(shortId)) {
      return ResultDB(STATUS_CODES.BAD_REQUEST, false, MESSAGES.NOT_FOUND, null);
    }

    const shortObjId = new mongoose.Types.ObjectId(shortId);
    const short = await ShortsModel.findOne({
      _id: shortObjId,
      deletedAt: null,
    });
    
    // Edge case: Short doesn't exist or already deleted
    if (!short) {
      return ResultDB(STATUS_CODES.NOT_FOUND, false, MESSAGES.NOT_FOUND, null);
    }

    // Edge case: User trying to delete someone else's short
    if (short.creatorId.toString() !== userId) {
      return ResultDB(STATUS_CODES.FORBIDDEN, false, MESSAGES.FORBIDDEN, null);
    }

    // Soft delete the short
    await ShortsModel.findByIdAndUpdate(shortObjId, {
      deletedAt: new Date(),
    });
    return ResultDB(STATUS_CODES.OK, true, SHORT_MESSAGES.DELETED, null);
  } catch (error) {
    printError(error, "deleteShortById");
    return ResultDB(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      MESSAGES.INTERNAL_SERVER_ERROR,
      null
    );
  }
};

export const getShortsWithFilters = async (
  userId: string,
  creatorId?: string,
  search?: string,
  categoryName?: string,
  page: number = 1,
  limit: number = 10,
  filterMode: "filter" | "nullify" | "" = "filter"
): Promise<
  ApiResponse<{ data: IPopulatedShort[]; pagination: IPagination }>
> => {
  try {
    const skip = (page - 1) * limit;

    const query: IShortsQuery = {};
    if (creatorId) {
      query.creatorId = new mongoose.Types.ObjectId(String(creatorId));
    }
    if (categoryName) {
      query.category = String(categoryName);
    }
    if (search) {
      query.description = { $regex: escapeRegex(String(search)), $options: "i" };
    }

    // Create count pipeline that applies the same visibility filters
    const countPipeline: any[] = [
      {
        $match: {
          ...query,
          deletedAt: null,
        },
      },
      // Apply visibility filtering only when filterMode is not empty
      // This ensures count matches the actual filtered results
      ...(filterMode !== ""
        ? filterContentByVisibilityPipeline(userId, "creatorId", filterMode)
        : []),
      {
        $lookup: {
          from: collectionNames.USER,
          localField: "creatorId",
          foreignField: "_id",
          as: "creator",
          pipeline: [
            {
              $match: {
                isDeleted: false,
              },
            },
          ],
        },
      },
      {
        $match: {
          "creator.0": { $exists: true },
        },
      },
      {
        $count: "totalRecords",
      },
    ];

    // Get total count for pagination using the same filters
    const countResult = await ShortsModel.aggregate(countPipeline);
    const totalRecords =
      countResult.length > 0 ? countResult[0].totalRecords : 0;

    const pipeline: any[] = [
      {
        $match: {
          ...query,
          deletedAt: null,
        },
      },
      ...(filterMode !== ""
        ? filterContentByVisibilityPipeline(userId, "creatorId", filterMode)
        : []),
      {
        $lookup: {
          from: collectionNames.USER,
          localField: "creatorId",
          foreignField: "_id",
          as: "creator",
          pipeline: [
            {
              $match: {
                isDeleted: false,
              },
            },
            {
              $project: {
                username: 1,
                displayName: 1,
                profilePicture: 1,
              },
            },
          ],
        },
      },
      {
        $match: {
          "creator.0": { $exists: true },
        },
      },
      {
        $unwind: "$creator",
      },
      ...isContentLikedPipeline(userId, EContentType.SHORT),
      ...isViewedPipeline(userId, EContentType.SHORT),
      ...isContentSavedPipeline(userId, EContentType.SHORT),
      ...isFollowingPipeline(userId, "creatorId"),
      ...isSubscribedPipeline(userId, "creatorId"),
      // Apply conditional video URL projection only when filterMode is "nullify"
      // When filterMode is "filter", content is already filtered out
      // When filterMode is "", no visibility filtering is applied
      ...(filterMode === "nullify"
        ? [
            {
              $addFields: {
                ...getConditionalVideoUrlProjection("videoUrl", userId),
              },
            },
          ]
        : []),
      {
        $sort: { createdAt: -1 },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ];

    const shorts = await ShortsModel.aggregate(pipeline);

    return ResultDB(STATUS_CODES.OK, true, MESSAGES.FETCHED, {
      data: shorts,
      pagination: {
        limit,
        currentPage: page,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
      },
    });
  } catch (error) {
    printError(error, "getShortsWithFiltersUsingPipeline");
    return ResultDB(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      MESSAGES.INTERNAL_SERVER_ERROR,
      DEFAULT_DATA_WITH_PAGINATION
    );
  }
};

// get recommended shorts based on user preferences and behavior
// TODO : Implement and return pagination
export const getRecommendedShorts = async (
  userId: string,
  page: number,
  limit: number,
  algorithm: string = "hybrid"
): Promise<ApiResponse<IPopulatedShort[]>> => {
  try {
    const userObjId = new mongoose.Types.ObjectId(userId);
    const skip = (page - 1) * limit;

    // Get user's followed creators
    const followedCreators = await mongoose
      .model(collectionNames.USER_FOLLOWS)
      .find({
        followerId: userObjId,
      })
      .select("followingId");

    const followedCreatorIds = followedCreators.map((f) => f.followingId);

    // Get user's liked categories and creators
    const userLikes = await mongoose
      .model(collectionNames.CONTENT_LIKES)
      .find({
        userId: userObjId,
        contentType: "shorts",
      })
      .populate("contentId", "category creatorId");

    const likedCategories = [
      ...new Set(
        userLikes.map((like) => like.contentId?.category).filter(Boolean)
      ),
    ];
    const likedCreatorIds = [
      ...new Set(
        userLikes.map((like) => like.contentId?.creatorId).filter(Boolean)
      ),
    ];

    // Use common recommendation pipeline
    const pipeline = getRecommendationPipeline(
      userId,
      EContentType.SHORT,
      algorithm,
      {
        likedCategories,
        likedCreatorIds,
        followedCreatorIds,
      },
      skip,
      limit,
      filterContentByVisibilityPipeline(userId, "creatorId")
    );

    const shorts = await ShortsModel.aggregate(pipeline);

    return ResultDB(
      STATUS_CODES.OK,
      true,
      SHORT_MESSAGES.RECOMMENDED_FETCHED,
      shorts
    );
  } catch (error) {
    printError(error, "getRecommendedShorts");
    return ResultDB(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      MESSAGES.INTERNAL_SERVER_ERROR,
      []
    );
  }
};

export const getSearchedShorts = async (
  search: string,
  userId: string,
  page: number = 1,
  limit: number = 10
) => {
  const skip = (page - 1) * limit;
  const safeSearch = escapeRegex(search);
  return ShortsModel.aggregate([
    {
      $match: {
        $or: [
          { description: { $regex: safeSearch, $options: "i" } },
          { category: { $regex: safeSearch, $options: "i" } },
          // { tags: { $in: [search], $options: "i" } },
        ],
        deletedAt: null,
      },
    },
    {
      $lookup: {
        from: collectionNames.USER,
        localField: "creatorId",
        foreignField: "_id",
        as: "creator",
        pipeline: [
          {
            $project: {
              username: 1,
              displayName: 1,
              profilePicture: 1,
              bio: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$creator",
    },
    ...isSubscribedPipeline(userId, "creatorId"),
    ...filterContentByVisibilityPipeline(userId, "creatorId", "filter"),
    { $skip: skip },
    { $limit: limit },
  ]);
};

// TODO : Implement and return pagination
export const getTrendingShorts = async (
  userId: string,
  page = 0,
  limit = 10
): Promise<ApiResponse<IShorts[]>> => {
  try {
    const skip = (page - 1) * limit;
    const pipeline: any[] = [
      {
        $match: {
          deletedAt: null,
        },
      },
      ...getTrendingDataPipeline({
        userId,
        contentType: EContentType.SHORT,
        videoUrlField: "videoUrl",
        skip,
        limit,
        extraProject: {
          // Add any shorts-specific projections here
          shortDuration: 1,
          creator: 1,
        },
      }),
    ];
    const result = await ShortsModel.aggregate(pipeline);
    return ResultDB<IShorts[]>(STATUS_CODES.OK, true, MESSAGES.FETCHED, result);
  } catch (error) {
    printError(error, "getTrendingShorts");
    return ResultDB<IShorts[]>(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      MESSAGES.INTERNAL_SERVER_ERROR,
      []
    );
  }
};
