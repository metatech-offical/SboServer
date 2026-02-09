import { POST_MESSAGES } from "../../constants/responseMessage";
import { STATUS_CODES } from "../../constants/statusCodes";
import { Types } from "mongoose";
import LikeModel from "../../models/contentActions/like.schema";
import PostModel, { IPost } from "../../models/post/post.schema";
import { ApiResponse, printError, ResultDB } from "../../utils/responseHandler";
import { IPagination } from "../../types/schema";
import { DEFAULT_DATA_WITH_PAGINATION } from "../../constants";
import {
  isContentLikedPipeline,
  isContentSavedPipeline,
} from "../../utils/pipeline";
import { collectionNames, EContentType } from "../../constants/collectionNames";
import { NotificationService } from "..";
import { IUser } from "../../models/user/user.type";
import { escapeRegex } from "../../utils/regex.helper";

export const createPost = async ({
  creator,
  caption,
  tags,
  photoUrls,
}: {
  creator: IUser;
  caption?: string;
  tags?: string[];
  photoUrls: string[];
}) => {
  const creatorId = String(creator._id);
  const result = await PostModel.create({
    caption,
    tags,
    photoUrls,
    creatorId,
  });
  //send notification to all followers of creator
  NotificationService.sendNewPostNotification(
    creator,
    result._id.toString(),
    EContentType.POST
  );

  return ResultDB(STATUS_CODES.CREATED, true, POST_MESSAGES.CREATED, result);
};

export const deletePost = async ({
  postId,
  creatorId,
}: {
  postId: string;
  creatorId: string;
}) => {
  // Find the post and check if it exists and belongs to the creator
  const post = await PostModel.findOne({
    _id: new Types.ObjectId(postId),
    creatorId: new Types.ObjectId(creatorId),
    isDeleted: false,
  });

  if (!post) {
    return ResultDB(
      STATUS_CODES.NOT_FOUND,
      false,
      POST_MESSAGES.NOT_FOUND,
      null
    );
  }

  // Soft delete the post by setting isDeleted to true
  const deletedPost = await PostModel.findByIdAndUpdate(
    postId,
    { isDeleted: true },
    { new: true }
  );

  return ResultDB(STATUS_CODES.OK, true, POST_MESSAGES.DELETED, deletedPost);
};

export const getPostsByUserId = async ({
  userId,
  currentUserId,
  search,
  page = 1,
  limit = 10,
}: {
  userId: string;
  currentUserId?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const skip = (page - 1) * limit;

  const query: any = {
    creatorId: new Types.ObjectId(userId),
    isDeleted: false,
  };

  // Add search filter if provided
  if (search && search.trim() !== "") {
    const regex = new RegExp(escapeRegex(search.trim()), "i");
    query.$or = [{ caption: regex }];
  }

  const [posts, total] = await Promise.all([
    PostModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "creatorId",
        select: "username displayName profilePicture bio isVerified membership",
        match: { isDeleted: false },
      }) // ✅ Populating here
      .lean(),

    PostModel.countDocuments(query),
  ]);

  if (!posts.length) {
    return ResultDB(STATUS_CODES.OK, true, POST_MESSAGES.NO_POSTS, {
      posts: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
      },
    });
  }

  let postsWithLikeStatus = posts;
  if (currentUserId) {
    const postIds = posts.map((post) => post._id);
    const likedPosts = await LikeModel.find({
      contentId: { $in: postIds },
      contentType: EContentType.POST,
      userId: new Types.ObjectId(currentUserId),
    }).lean();

    const likedPostIds = new Set(
      likedPosts.map((like) => like.contentId.toString())
    );

    postsWithLikeStatus = posts.map((post) => ({
      ...post,
      isLiked: likedPostIds.has(post._id.toString()),
    }));
  } else {
    postsWithLikeStatus = posts.map((post) => ({
      ...post,
      isLiked: false,
    }));
  }

  return ResultDB(STATUS_CODES.OK, true, POST_MESSAGES.FETCHED_BY_USER, {
    posts: postsWithLikeStatus,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
};

export const getFilteredPosts = async (
  currentUserId: string,
  creatorId?: string,
  search: string = "",
  page: number = 1,
  limit: number = 10
): Promise<ApiResponse<{ data: IPost[]; pagination: IPagination }>> => {
  try {
    const skip = (page - 1) * limit;

    // Build match conditions
    const matchConditions: any = {
      isDeleted: false,
    };

    // Add creator filter if provided
    if (creatorId) {
      matchConditions.creatorId = new Types.ObjectId(creatorId);
    }

    // Add search filter if provided
    if (search && search.trim() !== "") {
      const regex = new RegExp(escapeRegex(search.trim()), "i");
      matchConditions.$or = [{ caption: regex }];
    }

    // Build aggregation pipeline
    const pipeline: any[] = [
      {
        $match: matchConditions,
      },
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
      // Add isLiked field using the common pipeline
      ...isContentLikedPipeline(currentUserId, EContentType.POST),
      ...isContentSavedPipeline(currentUserId, EContentType.POST),
      {
        $sort: { createdAt: -1 },
      },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const result = await PostModel.aggregate(pipeline);
    const posts = result[0]?.data || [];
    const totalRecords = result[0]?.totalCount[0]?.count || 0;
    const totalPages = Math.ceil(totalRecords / limit);

    const pagination: IPagination = {
      limit,
      currentPage: page,
      totalRecords,
      totalPages,
    };

    return ResultDB(STATUS_CODES.OK, true, "Posts fetched successfully", {
      data: posts,
      pagination,
    });
  } catch (err) {
    printError(err, "getFilteredPosts");
    return ResultDB(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      "Error fetching posts",
      DEFAULT_DATA_WITH_PAGINATION
    );
  }
};
