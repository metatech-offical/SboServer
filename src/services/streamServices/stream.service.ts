import mongoose, { PipelineStage } from "mongoose";

import {
  CREATOR_SUBSCRIPTION_MESSAGES,
  MESSAGES,
  STREAM_MESSAGES,
} from "../../constants/responseMessage";
import { STATUS_CODES } from "../../constants/statusCodes";
import StreamModel from "../../models/stream/stream.schema";
import { IStream } from "../../models/stream/stream.type";
import { ApiResponse, printError, ResultDB } from "../../utils/responseHandler";
import { Types } from "mongoose";
import { generateZegoToken } from "../../utils/zegocloud.helper";
import {
  APPID,
  AWS_S3_BUCKET_NAME,
  SERVER_SECRET,
} from "../../config/environment";
import { streamIO } from "../../sockets/main";
import { escapeRegex } from "../../utils/regex.helper";
import {
  filterContentByVisibilityPipeline,
  isFollowingPipeline,
  getTrendingDataPipeline,
  getConditionalVideoUrlProjection,
} from "../../utils/pipeline";
import { Stream } from "stream";
import { collectionNames, EContentType } from "../../constants/collectionNames";
import {
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { UploadSessionModel } from "../../models/videoUpload/uploadSession.schema";
import s3Client from "../../config/s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import pLimit from "p-limit";
import {
  isContentLikedPipeline,
  isContentSavedPipeline,
  isViewedPipeline,
  isSubscribedPipeline,
} from "../../utils/pipeline";
import { IPagination } from "../../types/schema";
import { DEFAULT_DATA_WITH_PAGINATION } from "../../constants";
import {
  hasUserLikedContent,
  hasUserViewedContent,
} from "../contentActionServices";
import { hasUserSavedContent } from "../contentActionServices/save.service";
import { UserFollowService } from "..";
import { hasUserSubscribedCreator } from "../subscription/subscription.service";
import { EContentVisibility } from "../../types/enum";
import LikeModel from "../../models/contentActions/like.schema";
import { UserCreatorSubscriptionModel } from "../../models/subscription/userCreatorSubscriptions.schema";

export const createStream = async (newStreamData: Partial<IStream>) => {
  const newStream = new StreamModel(newStreamData);
  await newStream.save();
  return await newStream.populate(
    "creator",
    "username displayName email bio profilePicture"
  );
};

/**
 * Following service function soft deletes the stream.
 * we make sure that stream gets deleted from featured list if exists by,
 * starting a transaction to ensure both operations succeed or fail together.
 * Inside we Check if user is the creator and Soft delete the stream by changing stream isDeleted from false to true.
 * @param streamId
 * @param userId
 * @returns
 */
export const deleteStreamService = async (
  streamId: string,
  userId: string
): Promise<ApiResponse<IStream>> => {
  try {
    const stream = await StreamModel.findOne({
      _id: streamId,
      isDeleted: false,
    });

    if (!stream) {
      return ResultDB<IStream>(
        STATUS_CODES.NOT_FOUND,
        false,
        MESSAGES.NOT_FOUND,
        null
      );
    }

    if (stream.creatorId.toString() !== userId.toString()) {
      return ResultDB<IStream>(
        STATUS_CODES.UNAUTHORIZED,
        false,
        MESSAGES.UNAUTHORIZED,
        null
      );
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      stream.isDeleted = true;
      await stream.save({ session });

      // await FeaturedStreams.updateMany(
      //   { streams: streamId },
      //   { $pull: { streams: streamId } },
      //   { session }
      // );

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    return ResultDB<IStream>(STATUS_CODES.OK, true, MESSAGES.DELETED, stream);
  } catch (error) {
    printError(error, "");
    return ResultDB<IStream>(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      MESSAGES.INTERNAL_SERVER_ERROR,
      null
    );
  }
};

// for httpSearch API
export const getSearchedStreams = async (
  search: string,
  userId: string,
  page: number = 1,
  limit: number = 10
) => {
  try {
    const skip = (page - 1) * limit;
    const safeSearch = escapeRegex(search);
    const query: any = {
      isDeleted: false,
      $or: [
        { title: { $regex: safeSearch, $options: "i" } },
        { description: { $regex: safeSearch, $options: "i" } },
      ],
    };

    query.$nor = [
      {
        isLive: false,
        type: "video-live",
        videoUrl: "",
      },
    ];

    const pipeline: any = [
      { $match: query },
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
      { $unwind: "$creator" },
      ...filterContentByVisibilityPipeline(userId, "creatorId", "filter"),
      ...isSubscribedPipeline(userId, "creatorId"),
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ];
    const data = StreamModel.aggregate(pipeline);
    return data;
  } catch (e) {
    printError(e, "getSearchedStreams");
    return [];
  }
};

// for trending Searches API
export const getKeywordsMatchingStreams = async (
  keywords: string[],
  userId: string
) => {
  return StreamModel.aggregate([
    {
      $match: {
        isDeleted: false,
        $or: [
          { title: { $in: keywords.map((kw) => new RegExp(kw, "i")) } },
          { description: { $in: keywords.map((kw) => new RegExp(kw, "i")) } },
          { tags: { $in: keywords } },
        ],
        $nor: [
          {
            isLive: false,
            type: "video-live",
            videoUrl: "",
          },
        ],
      },
    },
    ...filterContentByVisibilityPipeline(userId, "creatorId"),
    { $sort: { createdAt: -1 } },
    { $limit: 10 },
      {
        $lookup: {
          from: "users",
          localField: "creatorId",
          foreignField: "_id",
          as: "creator",
          pipeline: [
            {
              $match: {
                isDeleted: false,
              },
            },
            { $project: { username: 1, profilePicture: 1, displayName: 1 } },
          ],
        },
      },
      {
        $match: {
          "creator.0": { $exists: true },
        },
      },
    { $unwind: "$creator" },
  ]);
};

/**
 * This pipeline is responsible for getting streams based on the trending scores of stream.
 * @param userId function accepts the userId for checking isLiked and isFollowed
 * @returns
 */
// Implement and return pagination
export const getTrendingStreams = async (
  userId: string,
  page = 1,
  limit = 10
): Promise<ApiResponse<any[]>> => {
  try {
    const skip = (page - 1) * limit;
    const pipeline: any[] = getTrendingDataPipeline({
      userId,
      contentType: EContentType.STREAM,
      videoUrlField: "videoUrl",
      skip,
      limit,
      extraMatch: {
        isDeleted: false,
        // $or: [{ vodStatus: "ready" }], //{ isLive: true },
      },
      extraProject: {
        title: 1,
        transcodedUrl: 1,
        category: 1,
        tags: 1,
        cover: 1,
        videoLength: 1,
        type: 1,
        status: 1,
        isLive: 1,
        sharesCount: 1,
        commentsCount: 1,
        // Add more stream-specific fields as needed
      },
    });
    const result = await StreamModel.aggregate(pipeline);
    return ResultDB<any[]>(
      STATUS_CODES.OK,
      true,
      STREAM_MESSAGES.FETCH_STREAMS,
      result
    );
  } catch (error) {
    printError(error, "getTrendingStreams");
    return ResultDB<any[]>(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      STREAM_MESSAGES.INTERNAL_SERVER_ERROR,
      []
    );
  }
};

export const initiateMultipartUpload = async (
  userId: string,
  fileName: string,
  contentType: string
) => {
  const key = `stream/video/${userId}/${Date.now()}-${fileName}`;

  const command = new CreateMultipartUploadCommand({
    Bucket: AWS_S3_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const response = await s3Client.send(command);

  if (!response.UploadId) {
    throw new Error("Failed to create multipart upload");
  }

  // Store session in DB
  await UploadSessionModel.create({
    userId,
    key,
    uploadId: response.UploadId,
    status: "pending",
  });

  return {
    uploadId: response.UploadId,
    key,
    AWS_S3_BUCKET_NAME,
  };
};

export const generatePresignedUrls = async (
  userId: string,
  uploadId: string,
  key: string,
  fileSize: number
) => {
  const session = await UploadSessionModel.findOne({
    userId,
    uploadId,
    key,
    status: "pending",
  });

  if (!session) throw new Error("Invalid or expired upload session");

  const chunkSize = 10 * 1024 * 1024; // 10 MB
  const numberOfParts = Math.ceil(fileSize / chunkSize);

  const limit = pLimit(5); // at most 5 concurrent URL generations

  const urlPromises = Array.from({ length: numberOfParts }, (_, i) =>
    limit(async () => {
      const command = new UploadPartCommand({
        Bucket: AWS_S3_BUCKET_NAME,
        Key: key,
        UploadId: uploadId,
        PartNumber: i + 1,
      });

      const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      return { url, partNumber: i + 1 };
    })
  );

  const urls = await Promise.all(urlPromises);

  return {
    uploadId,
    key,
    chunkSize,
    numberOfParts,
    presignedUrls: urls,
  };
};
interface CompletedPart {
  ETag: string;
  PartNumber: number;
}

export const completeMultipartUpload = async (
  userId: string,
  uploadId: string,
  key: string,
  parts: CompletedPart[]
) => {
  const session = await UploadSessionModel.findOne({
    userId,
    uploadId,
    key,
    status: "pending",
  });
  if (!session) throw new Error("Invalid upload session");

  const command = new CompleteMultipartUploadCommand({
    Bucket: AWS_S3_BUCKET_NAME,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: parts.map((p) => ({ ETag: p.ETag, PartNumber: p.PartNumber })),
    },
  });

  try {
    const response = await s3Client.send(command);

    session.status = "completed";
    await session.save();

    return {
      location: response.Location,
      bucket: response.Bucket,
      key: response.Key,
      etag: response.ETag,
    };
  } catch (err) {
    console.log("Failed to complete multipart upload:", err);
    throw new Error(
      "Failed to complete multipart upload: " + (err as Error).message
    );
  }
};

export const getFilteredStreams = async (
  userId: string,
  creatorId: string,
  page: number,
  limit: number,
  type: "video" | "video-live" | "all" = "all",
  filterMode: "filter" | "nullify" | "" = "filter",
  category?: string,
  search?: string,
  sorting: any = { createdAt: -1 }
): Promise<ApiResponse<{ data: any[]; pagination: IPagination }>> => {
  try {
    const skip = (page - 1) * limit;
    const matchStage: any = {
      isDeleted: false,
    };

    matchStage.$nor = [
      {
        isLive: false,
        type: "video-live",
        videoUrl: "",
      },
    ];

    // Filter out VODs where saveVod is false (user chose not to save)
    matchStage.$and = [
      {
        $or: [
          { saveVod: { $ne: false } }, // Include if saveVod is true or undefined
          { type: { $ne: "video-live" } }, // Include non-live streams
          { isLive: true }, // Include currently live streams
        ],
      },
    ];

    if (type !== "all") {
      matchStage.type = type;
    }

    // Add category filter if provided
    if (category) {
      matchStage.category = category;
    }

    // Add search filter if provided
    if (search && search.trim() !== "") {
      const regex = new RegExp(escapeRegex(search.trim()), "i");
      matchStage.$or = [
        { title: regex },
        { description: regex },
      ];
    }

    // Add creator filter if provided
    if (creatorId) {
      matchStage.creatorId = new mongoose.Types.ObjectId(creatorId);
    }

    const pipeline: any[] = [
      { $match: matchStage },
      {
        $lookup: {
          from: "users",
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
                bio: 1,
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
      { $unwind: "$creator" },
      // Add common pipeline functions for user interaction fields
      ...isContentLikedPipeline(userId, EContentType.STREAM),
      ...isContentSavedPipeline(userId, EContentType.STREAM),
      ...isViewedPipeline(userId, EContentType.STREAM),
      ...isFollowingPipeline(userId, "creatorId"),
      ...isSubscribedPipeline(userId, "creatorId"),
      // Filter content by visibility
      ...(filterMode === ""
        ? []
        : filterContentByVisibilityPipeline(userId, "creatorId", filterMode)),
      { $sort: sorting },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          title: 1,
          description: 1,
          thumbnailUrl: 1,
          ...(filterMode === "nullify"
            ? getConditionalVideoUrlProjection("videoUrl")
            : { videoUrl: 1 }),
          transcodedUrl: 1,
          category: 1,
          tags: 1,
          type: 1,
          status: 1,
          isLive: 1,
          sharesCount: 1,
          commentsCount: 1,
          likesCount: 1,
          viewsCount: 1,
          createdAt: 1,
          creatorId: 1,
          creator: 1,
          isLiked: 1,
          isSaved: 1,
          isViewed: 1,
          isFollowing: 1,
          isSubscribed: 1,
          settings: 1,
          duration: 1,
        },
      },
    ];

    // If type is all, set proprity to show live videos first, then normal video
    if (type === "all") {
      pipeline.push({
        $addFields: {
          priority: { $cond: [{ $eq: ["$isLive", true] }, 1, 0] },
        },
      });
      pipeline.push({ $sort: { priority: -1, createdAt: -1 } }); // Keep latest first
    }

    // Get total count for pagination
    const countPipeline = [
      { $match: matchStage },
      ...(filterMode === ""
        ? []
        : filterContentByVisibilityPipeline(userId, "creatorId", filterMode)),
      {
        $lookup: {
          from: "users",
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
      { $count: "total" },
    ];

    // Run both queries in parallel for better performance
    const [streams, countResult] = await Promise.all([
      StreamModel.aggregate(pipeline),
      StreamModel.aggregate(countPipeline),
    ]);

    const totalRecords = countResult[0]?.total || 0;
    const totalPages = Math.ceil(totalRecords / limit);

    return ResultDB(STATUS_CODES.OK, true, STREAM_MESSAGES.FETCH_STREAMS, {
      data: streams,
      pagination: {
        currentPage: page,
        totalRecords,
        totalPages,
        limit,
      },
    });
  } catch (error) {
    printError(error, "getFilteredStreams");
    return ResultDB(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      MESSAGES.INTERNAL_SERVER_ERROR,
      DEFAULT_DATA_WITH_PAGINATION
    );
  }
};

// get stream with keys - isFollowing, isLiked, isViewed, isSaved
export const getPopulatedStreamById = async (
  streamId: string,
  userId: string
): Promise<ApiResponse<any | null>> => {
  try {
    // const streamObjId = new mongoose.Types.ObjectId(streamId);
    const populatedStream = await StreamModel.findById(streamId)
      .populate({
        path: "creator",
        select: "username displayName profilePicture",
      })
      .lean();
    if (!populatedStream) {
      return ResultDB(STATUS_CODES.NOT_FOUND, false, MESSAGES.NOT_FOUND, null);
    }

    const [isLiked, isViewed, isSaved, isFollowing, isSubscribed] =
      await Promise.all([
        hasUserLikedContent(userId, streamId),
        hasUserViewedContent(userId, streamId),
        hasUserSavedContent(userId, streamId),
        UserFollowService.isUserFollowingCreator(
          userId,
          populatedStream.creatorId.toString()
        ),
        hasUserSubscribedCreator(userId, String(populatedStream.creatorId)),
      ]);

    // send video url null if not subscribed
    const videoUrl =
      String(userId) === String(populatedStream.creatorId) ||
      populatedStream.settings.visibility === EContentVisibility.everyone
        ? populatedStream.videoUrl
        : isSubscribed
        ? populatedStream.videoUrl
        : null;
    return ResultDB(STATUS_CODES.OK, true, MESSAGES.FETCHED, {
      ...populatedStream,
      _id: String(populatedStream._id),
      isLiked,
      isViewed,
      isSaved,
      isFollowing,
      videoUrl,
    });
  } catch (error) {
    printError(error, "getPopulatedStreamById");
    return ResultDB(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      MESSAGES.INTERNAL_SERVER_ERROR,
      null
    );
  }
};

/**
 * Get streams that the user is subscribed to.
 * This function retrieves streams from creators the user is subscribed to.
 */
export const getSubscribedStreams = async ({
  userId,
  page,
  limit,
}: {
  userId: string;
  page: number;
  limit: number;
}) => {
  // Step 1: Get active subscribed creators
  const activeSubscriptions = await UserCreatorSubscriptionModel.find({
    userId: new Types.ObjectId(userId),
    status: "active",
    endDate: { $gte: new Date() },
  }).select("creatorId");

  const creatorIds = activeSubscriptions.map((s) => s.creatorId);

  if (creatorIds.length === 0) {
    return ResultDB(
      STATUS_CODES.OK,
      true,
      CREATOR_SUBSCRIPTION_MESSAGES.SUBSCRIBED_CREATORS_FETCHED,
      { total: 0, page, limit, data: [] }
    );
  }

  const skip = (page - 1) * limit;

  // Step 2: Aggregate streams
  const [result] = await StreamModel.aggregate([
    {
      $match: {
        creatorId: { $in: creatorIds },
        isDeleted: false,
        "settings.visibility": "subscribers",
        $or: [
          { type: "video-live", isLive: true }, // live streams
          { type: { $in: ["video", "vr"] } }, // regular videos
        ],
      },
    },
    {
      $addFields: {
        sortOrder: {
          $cond: [{ $eq: ["$type", "video-live"] }, 0, 1], // live first
        },
      },
    },
    {
      $sort: { sortOrder: 1, createdAt: -1 },
    },
    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: limit },
          {
            $lookup: {
              from: "users",
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
          { $unwind: "$creator" },
          {
            $project: {
              _id: 1,
              title: 1,
              type: 1,
              videoUrl: 1,
              transcodedUrl: 1,
              thumbnailUrl: 1,
              createdAt: 1,
              isLive: 1,
              duration: 1,
              viewsCount: 1,
              likesCount: 1,
              commentsCount: 1,
              creatorId: 1,
              username: "$creator.username",
            },
          },
        ],
        totalCount: [{ $count: "count" }],
      },
    },
  ]);

  return ResultDB(
    STATUS_CODES.OK,
    true,
    CREATOR_SUBSCRIPTION_MESSAGES.SUBSCRIBED_CREATORS_FETCHED,
    {
      total: result?.totalCount[0]?.count || 0,
      page,
      limit,
      data: result?.data || [],
    }
  );
};

// export const streamsForCarousel = async (
//   userId: string,
//   page: number = 1,
//   limit: number = 10
// ) => {
//   try {
//     const skip = (page - 1) * limit;
//     const userObjId = new Types.ObjectId(userId);
//     const now = new Date();

//     const pipeline: PipelineStage[] = [
//       // Match non-deleted videos/live videos
//       {
//         $match: {
//           type: { $in: ["video-live", "video"] },
//           isDeleted: false,
//           $or: [
//             { "settings.visibility": EContentVisibility.everyone },
//             { "settings.visibility": EContentVisibility.subscribers },
//           ],
//         },
//       },
//       // Lookup active subscriptions if visibility is subscribers
//       {
//         $lookup: {
//           from: collectionNames.USER_CREATOR_SUBSCRIPTIONS,
//           let: { creatorId: "$creatorId" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $and: [
//                     { $eq: ["$creatorId", "$$creatorId"] },
//                     { $eq: ["$userId", userObjId] },
//                     { $eq: ["$status", "active"] },
//                     { $gte: ["$endDate", now] },
//                   ],
//                 },
//               },
//             },
//           ],
//           as: "activeSubscriptions",
//         },
//       },
//       // Determine if the current user can view the stream
//       {
//         $addFields: {
//           canView: {
//             $or: [
//               { $eq: ["$settings.visibility", EContentVisibility.everyone] },
//               {
//                 $and: [
//                   {
//                     $eq: [
//                       "$settings.visibility",
//                       EContentVisibility.subscribers,
//                     ],
//                   },
//                   { $gt: [{ $size: "$activeSubscriptions" }, 0] },
//                 ],
//               },
//             ],
//           },
//         },
//       },
//       // Filter out streams the user can't view
//       { $match: { canView: true } },

//       // Add sorting priority: live streams first, then regular videos
//       {
//         $addFields: {
//           isCurrentlyLive: {
//             $cond: [
//               {
//                 $and: [
//                   { $eq: ["$type", "video-live"] },
//                   { $eq: ["$isLive", true] },
//                 ],
//               },
//               1,
//               0,
//             ],
//           },
//         },
//       },

//       // Final sorting: live streams first, then most recent
//       {
//         $sort: {
//           isCurrentlyLive: -1,
//           createdAt: -1,
//         },
//       },

//       // Pagination
//       { $skip: skip },
//       { $limit: limit },

//       // Cleanup fields if desired (optional but recommended)
//       {
//         $project: {
//           activeSubscriptions: 0,
//           canView: 0,
//           isCurrentlyLive: 0,
//         },
//       },
//     ];

//     const result = await StreamModel.aggregate(pipeline);

//     return ResultDB(
//       STATUS_CODES.OK,
//       true,
//       STREAM_MESSAGES.FETCH_STREAMS,
//       result
//     );
//   } catch (error) {
//     printError(error, "streamsForCarousel");
//     return ResultDB(
//       STATUS_CODES.INTERNAL_SERVER_ERROR,
//       false,
//       MESSAGES.INTERNAL_SERVER_ERROR,
//       []
//     );
//   }
// };

export const streamsForCarousel = async (
  userId: string,
  page: number = 1,
  limit: number = 10
) => {
  try {
    const skip = (page - 1) * limit;
    const userObjId = new Types.ObjectId(userId);
    const now = new Date();

    // const pipeline = [
    //   {
    //     $match: {
    //       type: { $in: ["video-live", "video"] },
    //       isDeleted: false,
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: collectionNames.USER_CREATOR_SUBSCRIPTIONS,
    //       let: { creatorId: "$creatorId" },
    //       pipeline: [
    //         {
    //           $match: {
    //             userId: userObjId,
    //             status: "active",
    //             endDate: { $gte: now },
    //             $expr: {
    //               $eq: ["$creatorId", "$$creatorId"],
    //             },
    //           },
    //         },
    //       ],
    //       as: "activeSubscriptions",
    //     },
    //   },
    //   {
    //     $addFields: {
    //       canView: {
    //         $or: [
    //           { $eq: ["$settings.visibility", EContentVisibility.everyone] },
    //           {
    //             $and: [
    //               {
    //                 $eq: [
    //                   "$settings.visibility",
    //                   EContentVisibility.subscribers,
    //                 ],
    //               },
    //               { $gt: [{ $size: "$activeSubscriptions" }, 0] },
    //             ],
    //           },
    //         ],
    //       },
    //     },
    //   },
    //   { $match: { canView: true } },
    //   {
    //     $addFields: {
    //       isCurrentlyLive: {
    //         $cond: [
    //           {
    //             $and: [
    //               { $eq: ["$type", "video-live"] },
    //               { $eq: ["$isLive", true] },
    //             ],
    //           },
    //           1,
    //           0,
    //         ],
    //       },
    //     },
    //   },
    //   {
    //     $sort: {
    //       isCurrentlyLive: -1,
    //       createdAt: -1,
    //     },
    //   },
    //   { $skip: skip },
    //   { $limit: limit },
    //   {
    //     $project: {
    //       activeSubscriptions: 0,
    //       canView: 0,
    //       isCurrentlyLive: 0,
    //     },
    //   },
    // ];

    const pipeline: PipelineStage[] = [
      // 1. Only get non-deleted streams
      { $match: { isDeleted: false } },

      // 2. Lookup subscription: is current user subscribed to this creator?
      {
        $lookup: {
          from: "usercreatorsubscriptions", // The actual Mongo collection name (check your collection name)
          let: { creatorId: "$creatorId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$creatorId", "$$creatorId"] },
                    { $eq: ["$userId", new Types.ObjectId(userId)] },
                    { $eq: ["$status", "active"] },
                    { $gt: ["$endDate", now] }, // Subscription not expired
                  ],
                },
              },
            },
          ],
          as: "activeSubscription",
        },
      },

      // 3. Project "canView" field
      {
        $addFields: {
          canView: {
            $cond: [
              { $eq: ["$settings.visibility", "everyone"] },
              true,
              {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$settings.visibility", "subscribers"] },
                      { $gt: [{ $size: "$activeSubscription" }, 0] },
                    ],
                  },
                  true,
                  false,
                ],
              },
            ],
          },
        },
      },

      // 4. Filter streams user can actually view
      { $match: { canView: true } },

      // 5. (Optional) Populate creator info
      {
        $lookup: {
          from: "users",
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
      { $unwind: "$creator" },

      // 6. (Optional) Sort, paginate, etc.
      { $sort: { createdAt: -1 } },
    ];
    const result = await StreamModel.aggregate(pipeline);

    return ResultDB(
      STATUS_CODES.OK,
      true,
      STREAM_MESSAGES.FETCH_STREAMS,
      result
    );
  } catch (error) {
    printError(error, "streamsForCarousel");
    return ResultDB(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      MESSAGES.INTERNAL_SERVER_ERROR,
      []
    );
  }
};

/**
 * Toggle saveVod flag for a stream
 * Allows user to choose whether to show/hide the VOD after stream ends
 */
export const toggleSaveVod = async (
  streamId: string,
  userId: string,
  saveVod: boolean
): Promise<ApiResponse<IStream>> => {
  try {
    const stream = await StreamModel.findOne({
      _id: streamId,
      creatorId: new Types.ObjectId(userId),
      isDeleted: false,
    });

    if (!stream) {
      return ResultDB<IStream>(
        STATUS_CODES.NOT_FOUND,
        false,
        MESSAGES.NOT_FOUND,
        null
      );
    }

    // Only allow toggling for video-live streams that have ended
    if (stream.type !== "video-live") {
      return ResultDB<IStream>(
        STATUS_CODES.BAD_REQUEST,
        false,
        "This action is only available for live streams",
        null
      );
    }

    stream.saveVod = saveVod;
    await stream.save();

    return ResultDB<IStream>(
      STATUS_CODES.OK,
      true,
      saveVod ? "VOD will be saved" : "VOD will be hidden",
      stream
    );
  } catch (error) {
    printError(error, "toggleSaveVod");
    return ResultDB<IStream>(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      MESSAGES.INTERNAL_SERVER_ERROR,
      null
    );
  }
};

/**
 * Get user's VODs (Video On Demand - recorded live streams)
 * Returns all ended live streams where saveVod is true
 */
export const getUserVods = async (
  userId: string,
  page: number = 1,
  limit: number = 10
): Promise<ApiResponse<{ data: any[]; pagination: IPagination }>> => {
  try {
    const skip = (page - 1) * limit;

    const matchStage: any = {
      creatorId: new mongoose.Types.ObjectId(userId),
      isDeleted: false,
      type: "video-live",
      isLive: false,
      saveVod: true, // Only show VODs that user chose to save
      videoUrl: { $ne: "" }, // Only show VODs that have been recorded
    };

    const pipeline: any[] = [
      { $match: matchStage },
      {
        $lookup: {
          from: "users",
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
                bio: 1,
              },
            },
          ],
        },
      },
      { $unwind: "$creator" },
      // Add user interaction fields
      ...isContentLikedPipeline(userId, EContentType.STREAM),
      ...isContentSavedPipeline(userId, EContentType.STREAM),
      ...isViewedPipeline(userId, EContentType.STREAM),
      { $sort: { endedAt: -1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          title: 1,
          description: 1,
          thumbnailUrl: 1,
          videoUrl: 1,
          transcodedUrl: 1,
          category: 1,
          tags: 1,
          type: 1,
          status: 1,
          isLive: 1,
          sharesCount: 1,
          commentsCount: 1,
          likesCount: 1,
          viewsCount: 1,
          createdAt: 1,
          endedAt: 1,
          creatorId: 1,
          creator: 1,
          isLiked: 1,
          isSaved: 1,
          isViewed: 1,
          settings: 1,
          duration: 1,
          vodStatus: 1,
          vodMeta: 1,
        },
      },
    ];

    // Get total count
    const countPipeline = [
      { $match: matchStage },
      { $count: "total" },
    ];

    const [vods, countResult] = await Promise.all([
      StreamModel.aggregate(pipeline),
      StreamModel.aggregate(countPipeline),
    ]);

    const totalRecords = countResult[0]?.total || 0;
    const totalPages = Math.ceil(totalRecords / limit);

    return ResultDB(STATUS_CODES.OK, true, "VODs fetched successfully", {
      data: vods,
      pagination: {
        currentPage: page,
        totalRecords,
        totalPages,
        limit,
      },
    });
  } catch (error) {
    printError(error, "getUserVods");
    return ResultDB(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      MESSAGES.INTERNAL_SERVER_ERROR,
      DEFAULT_DATA_WITH_PAGINATION
    );
  }
};

/**
 * Get VODs (Video On Demand) by creator ID
 * Returns all ended live streams from a specific creator where saveVod is true
 * Respects visibility settings and subscription requirements
 */
export const getCreatorVods = async (
  creatorId: string,
  userId: string,
  page: number = 1,
  limit: number = 10
): Promise<ApiResponse<{ data: any[]; pagination: IPagination }>> => {
  try {
    const skip = (page - 1) * limit;

    const matchStage: any = {
      creatorId: new mongoose.Types.ObjectId(creatorId),
      isDeleted: false,
      type: "video-live",
      isLive: false,
      saveVod: true, // Only show VODs that creator chose to save
      videoUrl: { $ne: "" }, // Only show VODs that have been recorded
    };

    const pipeline: any[] = [
      { $match: matchStage },
      {
        $lookup: {
          from: "users",
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
                bio: 1,
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
      { $unwind: "$creator" },
      // Add user interaction fields
      ...isContentLikedPipeline(userId, EContentType.STREAM),
      ...isContentSavedPipeline(userId, EContentType.STREAM),
      ...isViewedPipeline(userId, EContentType.STREAM),
      ...isFollowingPipeline(userId, "creatorId"),
      ...isSubscribedPipeline(userId, "creatorId"),
      // Filter content by visibility
      ...filterContentByVisibilityPipeline(userId, "creatorId", "filter"),
      { $sort: { endedAt: -1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          title: 1,
          description: 1,
          thumbnailUrl: 1,
          ...getConditionalVideoUrlProjection("videoUrl"), // Respect visibility for videoUrl
          transcodedUrl: 1,
          category: 1,
          tags: 1,
          type: 1,
          status: 1,
          isLive: 1,
          sharesCount: 1,
          commentsCount: 1,
          likesCount: 1,
          viewsCount: 1,
          createdAt: 1,
          endedAt: 1,
          creatorId: 1,
          creator: 1,
          isLiked: 1,
          isSaved: 1,
          isViewed: 1,
          isFollowing: 1,
          isSubscribed: 1,
          settings: 1,
          duration: 1,
          vodStatus: 1,
          vodMeta: 1,
        },
      },
    ];

    // Get total count (with visibility filter)
    const countPipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: "users",
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
      ...filterContentByVisibilityPipeline(userId, "creatorId", "filter"),
      { $count: "total" },
    ];

    const [vods, countResult] = await Promise.all([
      StreamModel.aggregate(pipeline),
      StreamModel.aggregate(countPipeline),
    ]);

    const totalRecords = countResult[0]?.total || 0;
    const totalPages = Math.ceil(totalRecords / limit);

    return ResultDB(STATUS_CODES.OK, true, "Creator VODs fetched successfully", {
      data: vods,
      pagination: {
        currentPage: page,
        totalRecords,
        totalPages,
        limit,
      },
    });
  } catch (error) {
    printError(error, "getCreatorVods");
    return ResultDB(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      MESSAGES.INTERNAL_SERVER_ERROR,
      DEFAULT_DATA_WITH_PAGINATION
    );
  }
};
