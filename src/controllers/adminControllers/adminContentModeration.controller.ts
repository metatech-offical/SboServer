import type { Request, Response } from "express";
import { STATUS_CODES } from "../../constants/statusCodes";
import {
  ErrorResponse,
  SuccessResponse,
  NotFoundErrorResponse,
  BadRequestErrorResponse,
  printError,
} from "../../utils/responseHandler";
import PostModel from "../../models/post/post.schema";
import ShortsModel from "../../models/short/short.schema";
import StreamModel from "../../models/stream/stream.schema";

/**
 * Get content moderation statistics
 * GET /api/v1/admin/content/stats
 */
export const httpGetContentStats = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Videos stats (streams with type video or video-live)
    const [
      totalVideos,
      totalLiveStreams,
      totalShorts,
      totalPosts,
      deletedVideos,
      deletedShorts,
      deletedPosts,
      newVideosThisMonth,
      newShortsThisMonth,
      newPostsThisMonth,
      newVideosThisWeek,
      newShortsThisWeek,
      newPostsThisWeek,
      liveNow,
    ] = await Promise.all([
      // Total active content
      StreamModel.countDocuments({ isDeleted: false, type: { $in: ["video", "video-live"] } }),
      StreamModel.countDocuments({ isDeleted: false, type: "video-live" }),
      ShortsModel.countDocuments({ deletedAt: null }),
      PostModel.countDocuments({ isDeleted: false }),
      // Deleted content
      StreamModel.countDocuments({ isDeleted: true, type: { $in: ["video", "video-live"] } }),
      // Only count shorts where deletedAt exists and is not null (actually deleted)
      ShortsModel.countDocuments({ 
        $and: [
          { deletedAt: { $exists: true } },
          { deletedAt: { $ne: null } }
        ]
      }),
      PostModel.countDocuments({ isDeleted: true }),
      // New this month
      StreamModel.countDocuments({ isDeleted: false, type: { $in: ["video", "video-live"] }, createdAt: { $gte: thirtyDaysAgo } }),
      ShortsModel.countDocuments({ deletedAt: null, createdAt: { $gte: thirtyDaysAgo } }),
      PostModel.countDocuments({ isDeleted: false, createdAt: { $gte: thirtyDaysAgo } }),
      // New this week
      StreamModel.countDocuments({ isDeleted: false, type: { $in: ["video", "video-live"] }, createdAt: { $gte: sevenDaysAgo } }),
      ShortsModel.countDocuments({ deletedAt: null, createdAt: { $gte: sevenDaysAgo } }),
      PostModel.countDocuments({ isDeleted: false, createdAt: { $gte: sevenDaysAgo } }),
      // Currently live
      StreamModel.countDocuments({ isDeleted: false, isLive: true, status: "published" }),
    ]);

    // Aggregate engagement stats
    const [videoEngagement, shortEngagement, postEngagement] = await Promise.all([
      StreamModel.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: null,
            totalViews: { $sum: "$viewsCount" },
            totalLikes: { $sum: "$likesCount" },
            totalComments: { $sum: "$commentsCount" },
            totalShares: { $sum: "$sharesCount" },
          },
        },
      ]),
      ShortsModel.aggregate([
        { $match: { deletedAt: null } },
        {
          $group: {
            _id: null,
            totalViews: { $sum: "$viewsCount" },
            totalLikes: { $sum: "$likesCount" },
            totalComments: { $sum: "$commentsCount" },
            totalShares: { $sum: "$sharesCount" },
          },
        },
      ]),
      PostModel.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: null,
            totalLikes: { $sum: "$likesCount" },
            totalComments: { $sum: "$commentsCount" },
            totalShares: { $sum: "$sharesCount" },
          },
        },
      ]),
    ]);

    const stats = {
      // Content counts
      totalContent: totalVideos + totalShorts + totalPosts,
      totalVideos,
      totalLiveStreams,
      totalShorts,
      totalPosts,
      liveNow,
      // Deleted content
      totalDeletedContent: deletedVideos + deletedShorts + deletedPosts,
      deletedVideos,
      deletedShorts,
      deletedPosts,
      // New content this month
      newContentThisMonth: newVideosThisMonth + newShortsThisMonth + newPostsThisMonth,
      newVideosThisMonth,
      newShortsThisMonth,
      newPostsThisMonth,
      // New content this week
      newContentThisWeek: newVideosThisWeek + newShortsThisWeek + newPostsThisWeek,
      newVideosThisWeek,
      newShortsThisWeek,
      newPostsThisWeek,
      // Engagement
      engagement: {
        videos: videoEngagement[0] || { totalViews: 0, totalLikes: 0, totalComments: 0, totalShares: 0 },
        shorts: shortEngagement[0] || { totalViews: 0, totalLikes: 0, totalComments: 0, totalShares: 0 },
        posts: postEngagement[0] || { totalLikes: 0, totalComments: 0, totalShares: 0 },
      },
    };

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Content stats retrieved successfully",
      stats
    );
  } catch (error) {
    printError(error, "httpGetContentStats");
    return ErrorResponse(res);
  }
};

/**
 * Get all videos (streams) with pagination
 * GET /api/v1/admin/content/videos
 */
export const httpGetAllVideos = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const status = req.query.status as string;
    const type = req.query.type as string; // video, video-live, vr
    const includeDeleted = req.query.includeDeleted === "true";
    const sortBy = (req.query.sortBy as string) || "createdAt";
    const sortOrder = (req.query.sortOrder as string) === "asc" ? 1 : -1;

    const query: any = {};
    
    // Filter by type (video or video-live)
    if (type && ["video", "video-live", "vr"].includes(type)) {
      query.type = type;
    } else {
      query.type = { $in: ["video", "video-live"] };
    }

    // Include or exclude deleted
    if (!includeDeleted) {
      query.isDeleted = false;
    }

    // Search by title or description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const videos = await StreamModel.find(query)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .populate("creator", "username displayName profilePicture email")
      .lean();

    const total = await StreamModel.countDocuments(query);

    const formattedVideos = videos.map((video: any) => ({
      id: video._id,
      title: video.title,
      description: video.description,
      type: video.type,
      status: video.status,
      videoUrl: video.videoUrl,
      thumbnailUrl: video.thumbnailUrl,
      duration: video.duration,
      isLive: video.isLive,
      isDeleted: video.isDeleted,
      vodStatus: video.vodStatus,
      viewsCount: video.viewsCount,
      likesCount: video.likesCount,
      commentsCount: video.commentsCount,
      sharesCount: video.sharesCount,
      settings: video.settings,
      tags: video.tags,
      category: video.category,
      createdAt: video.createdAt,
      updatedAt: video.updatedAt,
      creator: video.creator ? {
        id: video.creator._id,
        username: video.creator.username,
        displayName: video.creator.displayName,
        profilePicture: video.creator.profilePicture,
        email: video.creator.email,
      } : null,
    }));

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Videos retrieved successfully",
      {
        videos: formattedVideos,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      }
    );
  } catch (error) {
    printError(error, "httpGetAllVideos");
    return ErrorResponse(res);
  }
};

/**
 * Get all shorts with pagination
 * GET /api/v1/admin/content/shorts
 */
export const httpGetAllShorts = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const includeDeleted = req.query.includeDeleted === "true";
    const sortBy = (req.query.sortBy as string) || "createdAt";
    const sortOrder = (req.query.sortOrder as string) === "asc" ? 1 : -1;

    const query: any = {};

    // Include or exclude deleted
    if (!includeDeleted) {
      query.deletedAt = null;
    }

    // Search by description
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    const skip = (page - 1) * limit;

    const shorts = await ShortsModel.find(query)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .populate("creator", "username displayName profilePicture email")
      .lean();

    const total = await ShortsModel.countDocuments(query);

    const formattedShorts = shorts.map((short: any) => ({
      id: short._id,
      description: short.description,
      videoUrl: short.videoUrl,
      thumbnailUrl: short.thumbnailUrl,
      duration: short.duration,
      category: short.category,
      tags: short.tags,
      viewsCount: short.viewsCount,
      likesCount: short.likesCount,
      commentsCount: short.commentsCount,
      sharesCount: short.sharesCount,
      settings: short.settings,
      deletedAt: short.deletedAt,
      // Only mark as deleted if deletedAt exists and is not null/undefined
      isDeleted: short.deletedAt != null,
      createdAt: short.createdAt,
      updatedAt: short.updatedAt,
      creator: short.creator ? {
        id: short.creator._id,
        username: short.creator.username,
        displayName: short.creator.displayName,
        profilePicture: short.creator.profilePicture,
        email: short.creator.email,
      } : null,
    }));

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Shorts retrieved successfully",
      {
        shorts: formattedShorts,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      }
    );
  } catch (error) {
    printError(error, "httpGetAllShorts");
    return ErrorResponse(res);
  }
};

/**
 * Get all posts with pagination
 * GET /api/v1/admin/content/posts
 */
export const httpGetAllPosts = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const includeDeleted = req.query.includeDeleted === "true";
    const sortBy = (req.query.sortBy as string) || "createdAt";
    const sortOrder = (req.query.sortOrder as string) === "asc" ? 1 : -1;

    const query: any = {};

    // Include or exclude deleted
    if (!includeDeleted) {
      query.isDeleted = false;
    }

    // Search by caption or tags
    if (search) {
      query.$or = [
        { caption: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    const skip = (page - 1) * limit;

    const posts = await PostModel.find(query)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .populate("creator", "username displayName profilePicture email")
      .lean();

    const total = await PostModel.countDocuments(query);

    const formattedPosts = posts.map((post: any) => ({
      id: post._id,
      caption: post.caption,
      photoUrls: post.photoUrls,
      tags: post.tags,
      likesCount: post.likesCount,
      commentsCount: post.commentsCount,
      sharesCount: post.sharesCount,
      isDeleted: post.isDeleted,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      creator: post.creator ? {
        id: post.creator._id,
        username: post.creator.username,
        displayName: post.creator.displayName,
        profilePicture: post.creator.profilePicture,
        email: post.creator.email,
      } : null,
    }));

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Posts retrieved successfully",
      {
        posts: formattedPosts,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      }
    );
  } catch (error) {
    printError(error, "httpGetAllPosts");
    return ErrorResponse(res);
  }
};

/**
 * Get video by ID
 * GET /api/v1/admin/content/videos/:videoId
 */
export const httpGetVideoById = async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;

    const video: any = await StreamModel.findById(videoId)
      .populate("creator", "username displayName profilePicture email bio verified")
      .lean();

    if (!video) {
      return NotFoundErrorResponse(res, "Video not found");
    }

    const videoDetails = {
      id: video._id,
      title: video.title,
      description: video.description,
      type: video.type,
      status: video.status,
      videoUrl: video.videoUrl,
      transcodedUrl: video.transcodedUrl,
      thumbnailUrl: video.thumbnailUrl,
      duration: video.duration,
      isLive: video.isLive,
      isDeleted: video.isDeleted,
      vodStatus: video.vodStatus,
      saveVod: video.saveVod,
      roomId: video.roomId,
      viewsCount: video.viewsCount,
      likesCount: video.likesCount,
      commentsCount: video.commentsCount,
      sharesCount: video.sharesCount,
      settings: video.settings,
      tags: video.tags,
      category: video.category,
      moderationDetails: video.moderationDetails,
      createdAt: video.createdAt,
      updatedAt: video.updatedAt,
      endedAt: video.endedAt,
      creator: video.creator ? {
        id: video.creator._id,
        username: video.creator.username,
        displayName: video.creator.displayName,
        profilePicture: video.creator.profilePicture,
        email: video.creator.email,
        bio: video.creator.bio,
        verified: video.creator.verified,
      } : null,
    };

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Video details retrieved successfully",
      videoDetails
    );
  } catch (error) {
    printError(error, "httpGetVideoById");
    return ErrorResponse(res);
  }
};

/**
 * Get short by ID
 * GET /api/v1/admin/content/shorts/:shortId
 */
export const httpGetShortById = async (req: Request, res: Response) => {
  try {
    const { shortId } = req.params;

    const short: any = await ShortsModel.findById(shortId)
      .populate("creator", "username displayName profilePicture email bio verified")
      .lean();

    if (!short) {
      return NotFoundErrorResponse(res, "Short not found");
    }

    const shortDetails = {
      id: short._id,
      description: short.description,
      videoUrl: short.videoUrl,
      thumbnailUrl: short.thumbnailUrl,
      duration: short.duration,
      category: short.category,
      tags: short.tags,
      viewsCount: short.viewsCount,
      likesCount: short.likesCount,
      commentsCount: short.commentsCount,
      sharesCount: short.sharesCount,
      settings: short.settings,
      deletedAt: short.deletedAt,
      isDeleted: short.deletedAt !== null,
      createdAt: short.createdAt,
      updatedAt: short.updatedAt,
      creator: short.creator ? {
        id: short.creator._id,
        username: short.creator.username,
        displayName: short.creator.displayName,
        profilePicture: short.creator.profilePicture,
        email: short.creator.email,
        bio: short.creator.bio,
        verified: short.creator.verified,
      } : null,
    };

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Short details retrieved successfully",
      shortDetails
    );
  } catch (error) {
    printError(error, "httpGetShortById");
    return ErrorResponse(res);
  }
};

/**
 * Get post by ID
 * GET /api/v1/admin/content/posts/:postId
 */
export const httpGetPostById = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;

    const post: any = await PostModel.findById(postId)
      .populate("creator", "username displayName profilePicture email bio verified")
      .lean();

    if (!post) {
      return NotFoundErrorResponse(res, "Post not found");
    }

    const postDetails = {
      id: post._id,
      caption: post.caption,
      photoUrls: post.photoUrls,
      tags: post.tags,
      likesCount: post.likesCount,
      commentsCount: post.commentsCount,
      sharesCount: post.sharesCount,
      isDeleted: post.isDeleted,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      creator: post.creator ? {
        id: post.creator._id,
        username: post.creator.username,
        displayName: post.creator.displayName,
        profilePicture: post.creator.profilePicture,
        email: post.creator.email,
        bio: post.creator.bio,
        verified: post.creator.verified,
      } : null,
    };

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Post details retrieved successfully",
      postDetails
    );
  } catch (error) {
    printError(error, "httpGetPostById");
    return ErrorResponse(res);
  }
};

/**
 * Soft delete a video
 * DELETE /api/v1/admin/content/videos/:videoId
 */
export const httpDeleteVideo = async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;
    const { reason } = req.body;
    const admin = (req as any).admin;

    const video = await StreamModel.findById(videoId);

    if (!video) {
      return NotFoundErrorResponse(res, "Video not found");
    }

    if (video.isDeleted) {
      return BadRequestErrorResponse(res, "Video is already deleted");
    }

    video.isDeleted = true;
    video.moderationDetails = {
      reviewedBy: admin?.name || admin?.email || "Admin",
      reviewTimestamp: new Date(),
      reason: reason || "Removed by admin",
    };

    await video.save();

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Video deleted successfully",
      {
        id: video._id,
        title: video.title,
        isDeleted: video.isDeleted,
      }
    );
  } catch (error) {
    printError(error, "httpDeleteVideo");
    return ErrorResponse(res);
  }
};

/**
 * Soft delete a short
 * DELETE /api/v1/admin/content/shorts/:shortId
 */
export const httpDeleteShort = async (req: Request, res: Response) => {
  try {
    const { shortId } = req.params;
    const { reason } = req.body;

    const short = await ShortsModel.findById(shortId);

    if (!short) {
      return NotFoundErrorResponse(res, "Short not found");
    }

    if (short.deletedAt) {
      return BadRequestErrorResponse(res, "Short is already deleted");
    }

    short.deletedAt = new Date();
    await short.save();

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Short deleted successfully",
      {
        id: short._id,
        description: short.description,
        deletedAt: short.deletedAt,
      }
    );
  } catch (error) {
    printError(error, "httpDeleteShort");
    return ErrorResponse(res);
  }
};

/**
 * Soft delete a post
 * DELETE /api/v1/admin/content/posts/:postId
 */
export const httpDeletePost = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { reason } = req.body;

    const post = await PostModel.findById(postId);

    if (!post) {
      return NotFoundErrorResponse(res, "Post not found");
    }

    if (post.isDeleted) {
      return BadRequestErrorResponse(res, "Post is already deleted");
    }

    post.isDeleted = true;
    await post.save();

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Post deleted successfully",
      {
        id: post._id,
        caption: post.caption,
        isDeleted: post.isDeleted,
      }
    );
  } catch (error) {
    printError(error, "httpDeletePost");
    return ErrorResponse(res);
  }
};

/**
 * Restore a deleted video
 * POST /api/v1/admin/content/videos/:videoId/restore
 */
export const httpRestoreVideo = async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;

    const video = await StreamModel.findById(videoId);

    if (!video) {
      return NotFoundErrorResponse(res, "Video not found");
    }

    if (!video.isDeleted) {
      return BadRequestErrorResponse(res, "Video is not deleted");
    }

    video.isDeleted = false;
    video.moderationDetails = {
      reviewedBy: "",
      reviewTimestamp: undefined as any,
      reason: "",
    };

    await video.save();

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Video restored successfully",
      {
        id: video._id,
        title: video.title,
        isDeleted: video.isDeleted,
      }
    );
  } catch (error) {
    printError(error, "httpRestoreVideo");
    return ErrorResponse(res);
  }
};

/**
 * Restore a deleted short
 * POST /api/v1/admin/content/shorts/:shortId/restore
 */
export const httpRestoreShort = async (req: Request, res: Response) => {
  try {
    const { shortId } = req.params;

    const short = await ShortsModel.findById(shortId);

    if (!short) {
      return NotFoundErrorResponse(res, "Short not found");
    }

    if (!short.deletedAt) {
      return BadRequestErrorResponse(res, "Short is not deleted");
    }

    short.deletedAt = null as any;
    await short.save();

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Short restored successfully",
      {
        id: short._id,
        description: short.description,
        deletedAt: short.deletedAt,
      }
    );
  } catch (error) {
    printError(error, "httpRestoreShort");
    return ErrorResponse(res);
  }
};

/**
 * Restore a deleted post
 * POST /api/v1/admin/content/posts/:postId/restore
 */
export const httpRestorePost = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;

    const post = await PostModel.findById(postId);

    if (!post) {
      return NotFoundErrorResponse(res, "Post not found");
    }

    if (!post.isDeleted) {
      return BadRequestErrorResponse(res, "Post is not deleted");
    }

    post.isDeleted = false;
    await post.save();

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Post restored successfully",
      {
        id: post._id,
        caption: post.caption,
        isDeleted: post.isDeleted,
      }
    );
  } catch (error) {
    printError(error, "httpRestorePost");
    return ErrorResponse(res);
  }
};

