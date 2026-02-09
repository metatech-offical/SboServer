import mongoose from "mongoose";
import { collectionNames, EContentType } from "../constants/collectionNames";
import { PipelineStage } from "mongoose";

/**
 * Adds `isFollowing` field to a document (e.g., shorts, stream) that contains a user reference field.
 *
 * @param currentUserId - Logged-in user's ID
 * @param targetUserField - The field name in the document where target user's _id is present (e.g. 'creator')
 */
export function isFollowingPipeline(
  currentUserId: string,
  targetUserField: string
) {
  const currentUserObjId = new mongoose.Types.ObjectId(currentUserId);

  return [
    {
      $lookup: {
        from: collectionNames.USER_FOLLOWS,
        let: { targetId: `$${targetUserField}` },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$followerId", currentUserObjId] },
                  { $eq: ["$followingId", "$$targetId"] },
                ],
              },
            },
          },
        ],
        as: "followInfo",
      },
    },
    {
      $addFields: {
        isFollowing: {
          $gt: [{ $size: "$followInfo" }, 0],
        },
      },
    },
    {
      $project: {
        followInfo: 0,
      },
    },
  ];
}

/**
 * Adds `followersCount` field to a user document by counting followers in the USER_FOLLOWS collection.
 *
 * @returns MongoDB aggregation pipeline array
 */
export function getFollowersCountPipeline() {
  return [
    {
      $lookup: {
        from: collectionNames.USER_FOLLOWS,
        let: { userIdStr: { $toString: "$_id" } },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: [{ $toString: "$followingId" }, "$$userIdStr"],
              },
            },
          },
        ],
        as: "followers",
      },
    },
    {
      $addFields: {
        followersCount: { $size: "$followers" },
      },
    },
    {
      $project: {
        followers: 0,
      },
    },
  ];
}

/**
 * Adds `followingCount` field to a user document by counting users they are following in the USER_FOLLOWS collection.
 *
 * @returns MongoDB aggregation pipeline array
 */
export function getFollowingCountPipeline() {
  return [
    {
      $lookup: {
        from: collectionNames.USER_FOLLOWS,
        let: { userIdStr: { $toString: "$_id" } },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: [{ $toString: "$followerId" }, "$$userIdStr"],
              },
            },
          },
        ],
        as: "following",
      },
    },
    {
      $addFields: {
        followingCount: { $size: "$following" },
      },
    },
    {
      $project: {
        following: 0,
      },
    },
  ];
}

/**
 * Adds `isLive` field to a user document by checking if they have any active live streams.
 *
 * @returns MongoDB aggregation pipeline array
 */
export function getIsUserLivePipeline() {
  return [
    {
      $lookup: {
        from: collectionNames.STREAM,
        let: { userId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$creatorId", "$$userId"] },
                  { $eq: ["$isLive", true] },
                  { $eq: ["$isDeleted", false] },
                ],
              },
            },
          },
        ],
        as: "liveStreams",
      },
    },
    {
      $addFields: {
        isLive: { $gt: [{ $size: "$liveStreams" }, 0] },
      },
    },
    {
      $project: {
        liveStreams: 0,
      },
    },
  ];
}

/**
 * Adds `isViewed` field to a document by checking if the current user has viewed this content.
 *
 * @param currentUserId - Current user's ID
 * @param contentType - Type of content (shorts, streams, posts, users, etc.)
 * @returns MongoDB aggregation pipeline array
 */
export function isViewedPipeline(currentUserId: string, contentType: string) {
  const currentUserObjId = new mongoose.Types.ObjectId(currentUserId);

  return [
    {
      $lookup: {
        from: collectionNames.CONTENT_VIEWS,
        let: { contentId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$contentType", contentType] },
                  { $eq: ["$contentId", "$$contentId"] },
                  { $eq: ["$userId", currentUserObjId] },
                ],
              },
            },
          },
        ],
        as: "userView",
      },
    },
    {
      $addFields: {
        isViewed: { $gt: [{ $size: "$userView" }, 0] },
      },
    },
    {
      $project: {
        userView: 0,
      },
    },
  ];
}

export const getIsBlockedPipeline = (
  currentUserId: string
): PipelineStage[] => {
  const currentUserObjId = new mongoose.Types.ObjectId(currentUserId);

  return [
    {
      $lookup: {
        from: collectionNames.USER_BLOCKS,
        let: { blockerId: currentUserObjId, blockedId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$blocker", "$$blockerId"] },
                  { $eq: ["$blocked", "$$blockedId"] },
                ],
              },
            },
          },
          { $limit: 1 },
        ],
        as: "blockInfo",
      },
    },
    {
      $addFields: {
        isBlocked: {
          $gt: [{ $size: "$blockInfo" }, 0],
        },
      },
    },
  ];
};

/**
 * Adds `isSaved` field to a document by checking if the current user has saved this content.
 *
 * @param currentUserId - Current user's ID
 * @param contentType - Type of content (shorts, streams, posts, etc.)
 * @returns MongoDB aggregation pipeline array
 */
export function isContentSavedPipeline(
  currentUserId: string,
  contentType: string
) {
  const currentUserObjId = new mongoose.Types.ObjectId(currentUserId);

  return [
    {
      $lookup: {
        from: collectionNames.SAVED_ITEMS,
        let: { contentId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$contentType", contentType] },
                  { $eq: ["$contentId", "$$contentId"] },
                  { $eq: ["$userId", currentUserObjId] },
                ],
              },
            },
          },
        ],
        as: "userSave",
      },
    },
    {
      $addFields: {
        isSaved: { $gt: [{ $size: "$userSave" }, 0] },
      },
    },
    {
      $project: {
        userSave: 0,
      },
    },
  ];
}

/**
 * Adds `isLiked` field to a document by checking if the current user has liked this content.
 *
 * @param currentUserId - Current user's ID
 * @param contentType - Type of content (shorts, streams, posts, etc.)
 * @returns MongoDB aggregation pipeline array
 */
export function isContentLikedPipeline(
  currentUserId: string,
  contentType: string
) {
  const currentUserObjId = new mongoose.Types.ObjectId(currentUserId);

  return [
    {
      $lookup: {
        from: collectionNames.CONTENT_LIKES,
        let: { contentId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$contentType", contentType] },
                  { $eq: ["$contentId", "$$contentId"] },
                  { $eq: ["$userId", currentUserObjId] },
                ],
              },
            },
          },
        ],
        as: "userLike",
      },
    },
    {
      $addFields: {
        isLiked: { $gt: [{ $size: "$userLike" }, 0] },
      },
    },
    {
      $project: {
        userLike: 0,
      },
    },
  ];
}

/**
 * Adds `isSubscribed` field to a document by checking if the current user has an active subscription to the creator.
 *
 * @param currentUserId - Current user's ID
 * @param creatorField - The field name in the document where creator's _id is present (e.g. 'creatorId')
 * @returns MongoDB aggregation pipeline array
 *
 * @example
 * // Usage in a shorts/streams aggregation pipeline:
 * const pipeline = [
 *   { $match: { isDeleted: false } },
 *   {
 *     $lookup: {
 *       from: "users",
 *       localField: "creatorId",
 *       foreignField: "_id",
 *       as: "creator",
 *       pipeline: [{ $project: { username: 1, displayName: 1, profilePicture: 1 } }]
 *     }
 *   },
 *   { $unwind: "$creator" },
 *   ...isSubscribedPipeline(userId, "creatorId"), // Adds isSubscribed field
 *   ...isContentLikedPipeline(userId, "shorts"),
 *   ...isContentSavedPipeline(userId, "shorts"),
 *   ...isFollowingPipeline(userId, "creatorId"),
 *   { $sort: { createdAt: -1 } }
 * ];
 */
export function isSubscribedPipeline(
  currentUserId: string,
  creatorField: string
) {
  const currentUserObjId = new mongoose.Types.ObjectId(currentUserId);
  const currentDate = new Date();

  return [
    {
      $lookup: {
        from: collectionNames.USER_CREATOR_SUBSCRIPTIONS,
        let: { creatorId: `$${creatorField}` },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$userId", currentUserObjId] },
                  { $eq: ["$creatorId", "$$creatorId"] },
                  { $eq: ["$status", "active"] },
                  { $lte: ["$startDate", currentDate] },
                  { $gte: ["$endDate", currentDate] },
                ],
              },
            },
          },
        ],
        as: "subscriptionInfo",
      },
    },
    {
      $addFields: {
        isSubscribed: {
          $gt: [{ $size: "$subscriptionInfo" }, 0],
        },
      },
    },
    {
      $project: {
        subscriptionInfo: 0,
      },
    },
  ];
}

/**
 * Filters content (shorts, streams, etc.) by visibility: allows 'everyone', or 'subscribers' only if user is subscribed to creator.
 * To be used in aggregation pipelines for content with settings.visibility and creatorId.
 * @param currentUserId - Current user's ID
 * @param creatorField - The field name in the document where creator's _id is present (e.g. 'creatorId')
 * @param filterMode - 'filter' to completely exclude content, 'nullify' to keep content but nullify video URLs
 * @returns MongoDB aggregation pipeline array
 */
export function filterContentByVisibilityPipeline(
  currentUserId: string,
  creatorField: string = "creatorId",
  filterMode: "filter" | "nullify" = "filter"
) {
  const currentUserObjId = new mongoose.Types.ObjectId(currentUserId);
  const currentDate = new Date();

  const subscriptionLookup = {
    $lookup: {
      from: collectionNames.USER_CREATOR_SUBSCRIPTIONS,
      let: { creatorId: `$${creatorField}` },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$userId", currentUserObjId] },
                { $eq: ["$creatorId", "$$creatorId"] },
                { $eq: ["$status", "active"] },
                { $lte: ["$startDate", currentDate] },
                { $gte: ["$endDate", currentDate] },
              ],
            },
          },
        },
      ],
      as: "_userSubscriptionInfo",
    },
  };

  if (filterMode === "filter") {
    // Case 1: Completely filter out content where visibility is 'subscribers' and user is not subscribed
    return [
      subscriptionLookup,
      {
        $match: {
          $or: [
            { "settings.visibility": { $eq: "everyone" } },
            {
              $and: [
                { "settings.visibility": { $eq: "subscribers" } },
                { $expr: { $gt: [{ $size: "$_userSubscriptionInfo" }, 0] } },
              ],
            },
          ],
        },
      },
      {
        $project: {
          _userSubscriptionInfo: 0,
        },
      },
    ];
  } else {
    // Case 2: Keep all content but add isSubscribed field for conditional video URL handling
    return [
      subscriptionLookup,
      {
        $addFields: {
          isSubscribed: {
            $gt: [{ $size: "$_userSubscriptionInfo" }, 0],
          },
        },
      },
      {
        $project: {
          _userSubscriptionInfo: 0,
        },
      },
    ];
  }
}

/**
 * Creates a conditional video URL field that returns null for subscriber-only content when user is not subscribed.
 * To be used in $project stage after using filterContentByVisibilityPipeline with 'nullify' mode.
 * @param videoUrlField - The field name for the video URL (e.g., 'videoUrl', 'url')
 * @returns MongoDB aggregation pipeline stage for conditional video URL
 */
export function getConditionalVideoUrlProjection(
  videoUrlField: string,
  userId?: string
) {
  const userObjId = userId ? new mongoose.Types.ObjectId(userId) : null;

  return {
    [videoUrlField]: {
      $cond: [
        // First condition: If visibility is "everyone", always show video
        { $eq: ["$settings.visibility", "everyone"] },
        `$${videoUrlField}`,
        {
          $cond: [
            // Second condition: If user is the creator, always show video
            userObjId ? { $eq: ["$creatorId", userObjId] } : false,
            `$${videoUrlField}`,
            {
              $cond: [
                // Third condition: If visibility is "subscribers" and user is subscribed
                {
                  $and: [
                    { $eq: ["$settings.visibility", "subscribers"] },
                    { $eq: ["$isSubscribed", true] },
                  ],
                },
                `$${videoUrlField}`,
                null,
              ],
            },
          ],
        },
      ],
    },
  };
}

/**
 * Common recommendation pipeline that can be used for both shorts and streams
 *
 * @param userId - Current user's ID
 * @param contentType - Content type (shorts, streams)
 * @param algorithm - Recommendation algorithm (collaborative, content-based, hybrid)
 * @param userPreferences - User's preferences (likedCategories, likedCreatorIds, followedCreatorIds)
 * @param skip - Number of documents to skip for pagination
 * @param limit - Number of documents to return
 * @returns MongoDB aggregation pipeline array
 */
export function getRecommendationPipeline(
  userId: string,
  contentType: EContentType,
  algorithm: string,
  userPreferences: {
    likedCategories: string[];
    likedCreatorIds: string[];
    followedCreatorIds: string[];
  },
  skip: number = 0,
  limit: number = 10,
  extraPipeline: any[] = []
) {
  const userObjId = new mongoose.Types.ObjectId(userId);
  const { likedCategories, likedCreatorIds, followedCreatorIds } =
    userPreferences;

  // Build recommendation pipeline based on algorithm
  let pipeline: any[] = [];

  if (algorithm === "collaborative") {
    // Collaborative filtering: recommend based on similar users' preferences
    pipeline = [
      {
        $match: {
          _id: { $ne: userObjId }, // Exclude user's own content
          deletedAt: null, // Exclude soft-deleted content
        },
      },
      {
        $lookup: {
          from: "likes",
          let: { contentId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$contentId", "$$contentId"] },
                    { $ne: ["$userId", userObjId] },
                  ],
                },
              },
            },
          ],
          as: "likes",
        },
      },
      {
        $addFields: {
          likeCount: { $size: "$likes" },
        },
      },
      {
        $sort: { likeCount: -1, createdAt: -1 },
      },
    ];
  } else if (algorithm === "content-based") {
    // Content-based filtering: recommend based on user's preferences
    pipeline = [
      {
        $match: {
          _id: { $ne: userObjId }, // Exclude user's own content
          deletedAt: null, // Exclude soft-deleted content
          $or: [
            { category: { $in: likedCategories } },
            { creatorId: { $in: likedCreatorIds } },
          ],
        },
      },
      {
        $addFields: {
          preferenceScore: {
            $add: [
              { $cond: [{ $in: ["$category", likedCategories] }, 2, 0] },
              { $cond: [{ $in: ["$creatorId", likedCreatorIds] }, 3, 0] },
              { $cond: [{ $in: ["$creatorId", followedCreatorIds] }, 1, 0] },
            ],
          },
        },
      },
      {
        $sort: { preferenceScore: -1, createdAt: -1 },
      },
    ];
  } else {
    // Hybrid approach: combine collaborative and content-based
    pipeline = [
      {
        $match: {
          _id: { $ne: userObjId }, // Exclude user's own content
          deletedAt: null, // Exclude soft-deleted content
        },
      },
      {
        $lookup: {
          from: "likes",
          let: { contentId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$contentId", "$$contentId"] },
                    { $ne: ["$userId", userObjId] },
                  ],
                },
              },
            },
          ],
          as: "likes",
        },
      },
      {
        $addFields: {
          likeCount: { $size: "$likes" },
          preferenceScore: {
            $add: [
              { $cond: [{ $in: ["$category", likedCategories] }, 2, 0] },
              { $cond: [{ $in: ["$creatorId", likedCreatorIds] }, 3, 0] },
              { $cond: [{ $in: ["$creatorId", followedCreatorIds] }, 1, 0] },
              { $multiply: ["$likeCount", 0.1] }, // Weight by popularity
            ],
          },
        },
      },
      {
        $sort: { preferenceScore: -1, createdAt: -1 },
      },
    ];
  }

  // Add common pipeline stages for all algorithms
  pipeline = [
    ...extraPipeline,
    ...pipeline,
    {
      $lookup: {
        from: "users",
        localField: "creatorId",
        foreignField: "_id",
        as: "creator",
        pipeline: [
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
      $unwind: "$creator",
    },
    // Use common pipeline functions for user interaction fields
    ...isContentLikedPipeline(userId, contentType),
    ...isViewedPipeline(userId, contentType),
    ...isContentSavedPipeline(userId, contentType),
    ...isFollowingPipeline(userId, "creatorId"),
    {
      $project: {
        likes: 0,
        likeCount: 0,
        preferenceScore: 0,
      },
    },
    {
      $skip: skip,
    },
    {
      $limit: limit,
    },
  ];

  return pipeline;
}

/**
 * Common trending data pipeline for shorts and streams.
 * @param userId - Current user's ID
 * @param contentType - 'short' or 'stream'
 * @param videoUrlField - The field name for the video URL (e.g., 'videoUrl' for shorts, 'url' for streams)
 * @param extraMatch - Additional $match stage(s) specific to shorts or streams
 * @param extraProject - Additional $project fields specific to shorts or streams
 * @param skip - Pagination skip
 * @param limit - Pagination limit
 */
export function getTrendingDataPipeline({
  userId,
  contentType,
  videoUrlField,
  extraMatch = {},
  extraProject = {},
  skip = 0,
  limit = 10,
}: {
  userId: string;
  contentType: EContentType.SHORT | EContentType.STREAM;
  videoUrlField: string;
  extraMatch?: any;
  extraProject?: any;
  skip?: number;
  limit?: number;
}) {
  const trendingScoreMatch = {
    $lookup: {
      from: collectionNames.TREDNING_SCORES,
      let: { contentId: "$_id" },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$contentId", "$$contentId"] },
                { $eq: ["$contentType", contentType] },
              ],
            },
          },
        },
      ],
      as: "trendingData",
    },
  };

  return [
    ...(Object.keys(extraMatch).length ? [{ $match: extraMatch }] : []),
    trendingScoreMatch,
    { $unwind: { path: "$trendingData", preserveNullAndEmptyArrays: false } },
    { $sort: { "trendingData.trendingScore": -1 } },
    ...isSubscribedPipeline(userId, "creatorId"),
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: "users",
        localField: "creatorId",
        foreignField: "_id",
        as: "creator",
      },
    },
    { $unwind: "$creator" },
    {
      $project: {
        _id: 1,
        description: 1,
        thumbnailUrl: 1,
        likesCount: 1,
        commentsCount: 1,
        sharesCount: 1,
        viewsCount: 1,
        duration: 1,
        createdAt: 1,
        creatorId: 1,
        tags: 1,
        isSubscribed: 1,
        settings: 1,
        username: "$creator.username",
        // Conditional video URL exposure based on visibility and subscription
        ...getConditionalVideoUrlProjection(videoUrlField, userId),
        ...extraProject,
      },
    },
  ];
}
