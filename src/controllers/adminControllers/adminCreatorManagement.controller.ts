import type { Request, Response } from "express";
import { STATUS_CODES } from "../../constants/statusCodes";
import {
  ErrorResponse,
  SuccessResponse,
  NotFoundErrorResponse,
  BadRequestErrorResponse,
  printError,
} from "../../utils/responseHandler";
import UserModel from "../../models/user/user.schema";
import { MembershipLevel, UserStatus } from "../../models/user/user.type";
import { CreatorSubscriptionPlanModel } from "../../models/subscription/creatorSubscriptionPlan.schema";
import { UserCreatorSubscriptionModel } from "../../models/subscription/userCreatorSubscriptions.schema";
import PostModel from "../../models/post/post.schema";
import ShortsModel from "../../models/short/short.schema";
import StreamModel from "../../models/stream/stream.schema";

/**
 * Get all creators with pagination and search
 * GET /api/v1/admin/creators
 */
export const httpGetAllCreators = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const status = req.query.status as string;
    const sortBy = (req.query.sortBy as string) || "createdAt";
    const sortOrder = (req.query.sortOrder as string) === "asc" ? 1 : -1;

    const query: any = {
      membership: MembershipLevel.CREATOR,
      isDeleted: false,
    };

    // Search by username, email, phoneNumber, or displayName
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
        { displayName: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by status
    if (status && Object.values(UserStatus).includes(status as UserStatus)) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    // Get creators with content counts
    const creators = await UserModel.aggregate([
      { $match: query },
      { $sort: { [sortBy]: sortOrder } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "posts",
          let: { creatorId: "$_id" },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ["$creatorId", "$$creatorId"] }, { $eq: ["$isDeleted", false] }] } } },
            { $count: "count" }
          ],
          as: "postsData"
        }
      },
      {
        $lookup: {
          from: "shorts",
          let: { creatorId: "$_id" },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ["$creatorId", "$$creatorId"] }, { $eq: ["$deletedAt", null] }] } } },
            { $count: "count" }
          ],
          as: "shortsData"
        }
      },
      {
        $lookup: {
          from: "streams",
          let: { creatorId: "$_id" },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ["$creatorId", "$$creatorId"] }, { $eq: ["$isDeleted", false] }] } } },
            { $count: "count" }
          ],
          as: "streamsData"
        }
      },
      {
        $lookup: {
          from: "creatorsubscriptionplans",
          localField: "_id",
          foreignField: "creatorId",
          as: "subscriptionPlans"
        }
      },
      {
        $lookup: {
          from: "usercreatorsubscriptions",
          let: { creatorId: "$_id" },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ["$creatorId", "$$creatorId"] }, { $eq: ["$status", "active"] }] } } },
            { $count: "count" }
          ],
          as: "activeSubscribersData"
        }
      },
      {
        $project: {
          password: 0,
        }
      },
      {
        $addFields: {
          postsCount: { $ifNull: [{ $arrayElemAt: ["$postsData.count", 0] }, 0] },
          shortsCount: { $ifNull: [{ $arrayElemAt: ["$shortsData.count", 0] }, 0] },
          streamsCount: { $ifNull: [{ $arrayElemAt: ["$streamsData.count", 0] }, 0] },
          activeSubscribers: { $ifNull: [{ $arrayElemAt: ["$activeSubscribersData.count", 0] }, 0] },
          subscriptionPlansCount: { $size: "$subscriptionPlans" },
        }
      }
    ]);

    const total = await UserModel.countDocuments(query);

    const formattedCreators = creators.map((creator: any) => ({
      id: creator._id,
      username: creator.username || null,
      email: creator.email || null,
      phoneNumber: creator.phoneNumber || null,
      displayName: creator.displayName || null,
      profilePicture: creator.profilePicture || null,
      bio: creator.bio || null,
      status: creator.status || UserStatus.ACTIVE,
      verified: creator.verified,
      lastLogin: creator.lastLogin,
      createdAt: creator.createdAt,
      // Creator-specific stats
      postsCount: creator.postsCount,
      shortsCount: creator.shortsCount,
      streamsCount: creator.streamsCount,
      totalContent: creator.postsCount + creator.shortsCount + creator.streamsCount,
      activeSubscribers: creator.activeSubscribers,
      subscriptionPlansCount: creator.subscriptionPlansCount,
    }));

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Creators retrieved successfully",
      {
        creators: formattedCreators,
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
    printError(error, "httpGetAllCreators");
    return ErrorResponse(res);
  }
};

/**
 * Get creator by ID with full details
 * GET /api/v1/admin/creators/:creatorId
 */
export const httpGetCreatorById = async (req: Request, res: Response) => {
  try {
    const { creatorId } = req.params;

    const creator = await UserModel.findOne({
      _id: creatorId,
      membership: MembershipLevel.CREATOR,
    }).select("-password").lean();

    if (!creator) {
      return NotFoundErrorResponse(res, "Creator not found");
    }

    // Get subscription plans
    const subscriptionPlans = await CreatorSubscriptionPlanModel.find({
      creatorId: creator._id,
    }).lean();

    // Get active subscribers count
    const activeSubscribersCount = await UserCreatorSubscriptionModel.countDocuments({
      creatorId: creator._id,
      status: "active",
    });

    // Get total revenue from subscriptions
    const revenueData = await UserCreatorSubscriptionModel.aggregate([
      { $match: { creatorId: creator._id } },
      {
        $lookup: {
          from: "creatorsubscriptionplans",
          localField: "planId",
          foreignField: "_id",
          as: "plan"
        }
      },
      { $unwind: "$plan" },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$plan.price" },
          totalSubscriptions: { $sum: 1 }
        }
      }
    ]);

    // Get content counts
    const [postsCount, shortsCount, streamsCount] = await Promise.all([
      PostModel.countDocuments({ creatorId: creator._id, isDeleted: false }),
      ShortsModel.countDocuments({ creatorId: creator._id, deletedAt: null }),
      StreamModel.countDocuments({ creatorId: creator._id, isDeleted: false }),
    ]);

    // Get recent content
    const [recentPosts, recentShorts, recentStreams] = await Promise.all([
      PostModel.find({ creatorId: creator._id, isDeleted: false })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("caption photoUrls likesCount commentsCount createdAt")
        .lean(),
      ShortsModel.find({ creatorId: creator._id, deletedAt: null })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("description thumbnailUrl likesCount viewsCount createdAt")
        .lean(),
      StreamModel.find({ creatorId: creator._id, isDeleted: false })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("title thumbnailUrl type status likesCount viewsCount createdAt")
        .lean(),
    ]);

    const creatorDetails = {
      id: creator._id,
      username: creator.username || null,
      email: creator.email || null,
      phoneNumber: creator.phoneNumber || null,
      displayName: creator.displayName || null,
      profilePicture: creator.profilePicture || null,
      bio: creator.bio || null,
      status: (creator as any).status || UserStatus.ACTIVE,
      verified: creator.verified,
      isDeleted: creator.isDeleted,
      deletedReason: creator.deletedReason,
      notificationSettings: creator.notificationSettings,
      lastLogin: creator.lastLogin,
      sharesCount: creator.sharesCount,
      provider: creator.provider,
      createdAt: (creator as any).createdAt,
      updatedAt: (creator as any).updatedAt,
      // Creator-specific data
      subscriptionPlans: subscriptionPlans.map(plan => ({
        id: plan._id,
        interval: plan.interval,
        price: plan.price,
        currency: plan.currency,
        description: plan.description,
      })),
      stats: {
        activeSubscribers: activeSubscribersCount,
        totalSubscriptions: revenueData[0]?.totalSubscriptions || 0,
        totalRevenue: revenueData[0]?.totalRevenue || 0,
        postsCount,
        shortsCount,
        streamsCount,
        totalContent: postsCount + shortsCount + streamsCount,
      },
      recentContent: {
        posts: recentPosts,
        shorts: recentShorts,
        streams: recentStreams,
      },
    };

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Creator details retrieved successfully",
      creatorDetails
    );
  } catch (error) {
    printError(error, "httpGetCreatorById");
    return ErrorResponse(res);
  }
};

/**
 * Approve creator account (activate)
 * POST /api/v1/admin/creators/:creatorId/approve
 */
export const httpApproveCreator = async (req: Request, res: Response) => {
  try {
    const { creatorId } = req.params;

    const creator = await UserModel.findOne({
      _id: creatorId,
      membership: MembershipLevel.CREATOR,
    });

    if (!creator) {
      return NotFoundErrorResponse(res, "Creator not found");
    }

    if (creator.status === UserStatus.ACTIVE) {
      return BadRequestErrorResponse(res, "Creator is already active");
    }

    creator.status = UserStatus.ACTIVE;
    await creator.save();

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Creator approved successfully",
      {
        id: creator._id,
        status: creator.status,
      }
    );
  } catch (error) {
    printError(error, "httpApproveCreator");
    return ErrorResponse(res);
  }
};

/**
 * Disable creator account (suspend)
 * POST /api/v1/admin/creators/:creatorId/disable
 */
export const httpDisableCreator = async (req: Request, res: Response) => {
  try {
    const { creatorId } = req.params;
    const { reason } = req.body;

    const creator = await UserModel.findOne({
      _id: creatorId,
      membership: MembershipLevel.CREATOR,
    });

    if (!creator) {
      return NotFoundErrorResponse(res, "Creator not found");
    }

    if (creator.status === UserStatus.SUSPENDED) {
      return BadRequestErrorResponse(res, "Creator is already disabled");
    }

    creator.status = UserStatus.SUSPENDED;
    
    if (reason) {
      creator.deletedReason.push({
        category: "Disabled",
        reason: reason,
        deletedAt: new Date(),
      });
    }

    await creator.save();

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Creator disabled successfully",
      {
        id: creator._id,
        status: creator.status,
      }
    );
  } catch (error) {
    printError(error, "httpDisableCreator");
    return ErrorResponse(res);
  }
};

/**
 * Remove creator content by type
 * DELETE /api/v1/admin/creators/:creatorId/content
 */
export const httpRemoveCreatorContent = async (req: Request, res: Response) => {
  try {
    const { creatorId } = req.params;
    const { contentType, contentId, reason } = req.body;

    const creator = await UserModel.findOne({
      _id: creatorId,
      membership: MembershipLevel.CREATOR,
    });

    if (!creator) {
      return NotFoundErrorResponse(res, "Creator not found");
    }

    let result;

    if (contentId) {
      // Remove specific content
      switch (contentType) {
        case "post":
          result = await PostModel.findOneAndUpdate(
            { _id: contentId, creatorId },
            { isDeleted: true }
          );
          break;
        case "short":
          result = await ShortsModel.findOneAndUpdate(
            { _id: contentId, creatorId },
            { deletedAt: new Date() }
          );
          break;
        case "stream":
          result = await StreamModel.findOneAndUpdate(
            { _id: contentId, creatorId },
            { isDeleted: true }
          );
          break;
        default:
          return BadRequestErrorResponse(res, "Invalid content type");
      }

      if (!result) {
        return NotFoundErrorResponse(res, "Content not found");
      }

      return SuccessResponse(
        res,
        STATUS_CODES.OK,
        true,
        `${contentType} removed successfully`,
        { contentId, contentType }
      );
    } else {
      // Remove all content of specified type
      let deletedCount = 0;

      switch (contentType) {
        case "post":
          const postResult = await PostModel.updateMany(
            { creatorId, isDeleted: false },
            { isDeleted: true }
          );
          deletedCount = postResult.modifiedCount;
          break;
        case "short":
          const shortResult = await ShortsModel.updateMany(
            { creatorId, deletedAt: null },
            { deletedAt: new Date() }
          );
          deletedCount = shortResult.modifiedCount;
          break;
        case "stream":
          const streamResult = await StreamModel.updateMany(
            { creatorId, isDeleted: false },
            { isDeleted: true }
          );
          deletedCount = streamResult.modifiedCount;
          break;
        case "all":
          const [posts, shorts, streams] = await Promise.all([
            PostModel.updateMany({ creatorId, isDeleted: false }, { isDeleted: true }),
            ShortsModel.updateMany({ creatorId, deletedAt: null }, { deletedAt: new Date() }),
            StreamModel.updateMany({ creatorId, isDeleted: false }, { isDeleted: true }),
          ]);
          deletedCount = posts.modifiedCount + shorts.modifiedCount + streams.modifiedCount;
          break;
        default:
          return BadRequestErrorResponse(res, "Invalid content type");
      }

      return SuccessResponse(
        res,
        STATUS_CODES.OK,
        true,
        `${deletedCount} ${contentType === "all" ? "content items" : contentType + "s"} removed successfully`,
        { deletedCount, contentType }
      );
    }
  } catch (error) {
    printError(error, "httpRemoveCreatorContent");
    return ErrorResponse(res);
  }
};

/**
 * Get creator statistics for admin panel
 * GET /api/v1/admin/creators/stats
 */
export const httpGetCreatorStats = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const baseQuery = { membership: MembershipLevel.CREATOR, isDeleted: false };

    const [
      totalCreators,
      activeCreators,
      suspendedCreators,
      newCreatorsThisMonth,
      verifiedCreators,
    ] = await Promise.all([
      UserModel.countDocuments(baseQuery),
      UserModel.countDocuments({
        ...baseQuery,
        $or: [
          { status: UserStatus.ACTIVE },
          { status: null },
          { status: { $exists: false } }
        ]
      }),
      UserModel.countDocuments({ ...baseQuery, status: UserStatus.SUSPENDED }),
      UserModel.countDocuments({ ...baseQuery, createdAt: { $gte: thirtyDaysAgo } }),
      UserModel.countDocuments({ ...baseQuery, verified: true }),
    ]);

    // Get total content stats
    const creatorIds = await UserModel.find(baseQuery).select("_id").lean();
    const ids = creatorIds.map(c => c._id);

    // If no creators, return zero stats
    const [totalPosts, totalShorts, totalStreams, totalActiveSubscriptions] = ids.length > 0
      ? await Promise.all([
          PostModel.countDocuments({ creatorId: { $in: ids }, isDeleted: false }),
          ShortsModel.countDocuments({ creatorId: { $in: ids }, deletedAt: null }),
          StreamModel.countDocuments({ creatorId: { $in: ids }, isDeleted: false }),
          UserCreatorSubscriptionModel.countDocuments({ creatorId: { $in: ids }, status: "active" }),
        ])
      : [0, 0, 0, 0];

    const stats = {
      totalCreators,
      activeCreators,
      suspendedCreators,
      newCreatorsThisMonth,
      verifiedCreators,
      totalContent: totalPosts + totalShorts + totalStreams,
      totalPosts,
      totalShorts,
      totalStreams,
      totalActiveSubscriptions,
    };

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Creator stats retrieved successfully",
      stats
    );
  } catch (error) {
    printError(error, "httpGetCreatorStats");
    return ErrorResponse(res);
  }
};

/**
 * Get creator's content list
 * GET /api/v1/admin/creators/:creatorId/content
 */
export const httpGetCreatorContent = async (req: Request, res: Response) => {
  try {
    const { creatorId } = req.params;
    const contentType = (req.query.type as string) || "all";
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const creator = await UserModel.findOne({
      _id: creatorId,
      membership: MembershipLevel.CREATOR,
    });

    if (!creator) {
      return NotFoundErrorResponse(res, "Creator not found");
    }

    const skip = (page - 1) * limit;
    let content: any[] = [];
    let total = 0;

    switch (contentType) {
      case "post":
        [content, total] = await Promise.all([
          PostModel.find({ creatorId, isDeleted: false })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
          PostModel.countDocuments({ creatorId, isDeleted: false }),
        ]);
        content = content.map(c => ({ ...c, type: "post" }));
        break;

      case "short":
        [content, total] = await Promise.all([
          ShortsModel.find({ creatorId, deletedAt: null })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
          ShortsModel.countDocuments({ creatorId, deletedAt: null }),
        ]);
        content = content.map(c => ({ ...c, type: "short" }));
        break;

      case "stream":
        [content, total] = await Promise.all([
          StreamModel.find({ creatorId, isDeleted: false })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
          StreamModel.countDocuments({ creatorId, isDeleted: false }),
        ]);
        content = content.map(c => ({ ...c, type: "stream" }));
        break;

      default:
        // Get all content types, sorted by date
        const [posts, shorts, streams] = await Promise.all([
          PostModel.find({ creatorId, isDeleted: false }).lean(),
          ShortsModel.find({ creatorId, deletedAt: null }).lean(),
          StreamModel.find({ creatorId, isDeleted: false }).lean(),
        ]);

        content = [
          ...posts.map(p => ({ ...p, type: "post" })),
          ...shorts.map(s => ({ ...s, type: "short" })),
          ...streams.map(s => ({ ...s, type: "stream" })),
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(skip, skip + limit);

        total = posts.length + shorts.length + streams.length;
    }

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Creator content retrieved successfully",
      {
        content,
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
    printError(error, "httpGetCreatorContent");
    return ErrorResponse(res);
  }
};

