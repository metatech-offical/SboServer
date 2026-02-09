import type { Request, Response } from "express";
import type { Document, Types } from "mongoose";
import { STATUS_CODES } from "../../constants/statusCodes";
import {
  ErrorResponse,
  SuccessResponse,
  NotFoundErrorResponse,
  BadRequestErrorResponse,
  printError,
} from "../../utils/responseHandler";
import UserModel from "../../models/user/user.schema";
import { UserStatus, type IUser } from "../../models/user/user.type";

/**
 * Get all users with pagination and advanced search
 * GET /api/v1/admin/users
 */
export const httpGetAllUsers = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const status = req.query.status as string;
    const membership = req.query.membership as string;
    const sortBy = (req.query.sortBy as string) || "createdAt";
    const sortOrder = (req.query.sortOrder as string) === "asc" ? 1 : -1;

    const query: Record<string, unknown> = {};

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

    // Filter by membership
    if (membership) {
      query.membership = membership;
    }

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      UserModel.find(query)
        .select("-password")
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      UserModel.countDocuments(query),
    ]);

    type LeanUser = Omit<IUser, keyof Document> & {
      _id: Types.ObjectId;
      createdAt?: Date;
      updatedAt?: Date;
    };
    
    const formattedUsers = users.map((user: LeanUser) => ({
      id: user._id,
      username: user.username || null,
      email: user.email || null,
      phoneNumber: user.phoneNumber || null,
      displayName: user.displayName || null,
      profilePicture: user.profilePicture || null,
      bio: user.bio || null,
      membership: user.membership,
      status: user.status || UserStatus.ACTIVE,
      verified: user.verified,
      isDeleted: user.isDeleted,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Users retrieved successfully",
      {
        users: formattedUsers,
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
    printError(error, "httpGetAllUsers");
    return ErrorResponse(res);
  }
};

/**
 * Get user by ID with full details
 * GET /api/v1/admin/users/:userId
 */
export const httpGetUserById = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await UserModel.findById(userId).select("-password").lean();

    if (!user) {
      return NotFoundErrorResponse(res, "User not found");
    }

    type LeanUserWithTimestamps = Omit<IUser, keyof Document> & {
      _id: Types.ObjectId;
      createdAt?: Date;
      updatedAt?: Date;
    };

    const leanUser = user as LeanUserWithTimestamps;

    const formatDate = (date: Date | undefined): string | null => {
      return date ? new Date(date).toISOString() : null;
    };

    const userDetails = {
      id: leanUser._id,
      username: leanUser.username || null,
      email: leanUser.email || null,
      phoneNumber: leanUser.phoneNumber || null,
      displayName: leanUser.displayName || null,
      profilePicture: leanUser.profilePicture || null,
      bio: leanUser.bio || null,
      membership: leanUser.membership,
      status: leanUser.status || UserStatus.ACTIVE,
      verified: leanUser.verified,
      isDeleted: leanUser.isDeleted,
      deletedReason: leanUser.deletedReason,
      notificationSettings: leanUser.notificationSettings,
      platformSubscription: leanUser.platformSubscription,
      creatorSubscriptions: leanUser.creatorSubscriptions,
      lastLogin: leanUser.lastLogin,
      sharesCount: leanUser.sharesCount,
      provider: leanUser.provider,
      createdAt: formatDate(leanUser.createdAt),
      updatedAt: formatDate(leanUser.updatedAt)
    };

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "User details retrieved successfully",
      userDetails
    );
  } catch (error) {
    printError(error, "httpGetUserById");
    return ErrorResponse(res);
  }
};

/**
 * Update user status (suspend, ban, activate)
 * PUT /api/v1/admin/users/:userId/status
 */
export const httpUpdateUserStatus = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { status, reason } = req.body;

    // Validate status
    if (!status || !Object.values(UserStatus).includes(status)) {
      return BadRequestErrorResponse(
        res,
        `Invalid status. Must be one of: ${Object.values(UserStatus).join(", ")}`
      );
    }

    const user = await UserModel.findById(userId);

    if (!user) {
      return NotFoundErrorResponse(res, "User not found");
    }

    // Update status
    user.status = status;

    // If suspending or banning, optionally add reason
    if ((status === UserStatus.SUSPENDED || status === UserStatus.BANNED) && reason) {
      user.deletedReason.push({
        category: status === UserStatus.BANNED ? "Banned" : "Suspended",
        reason: reason,
        deletedAt: new Date(),
      });
    }

    await user.save();

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      `User ${status.toLowerCase()} successfully`,
      {
        id: user._id,
        status: user.status,
      }
    );
  } catch (error) {
    printError(error, "httpUpdateUserStatus");
    return ErrorResponse(res);
  }
};

/**
 * Suspend user account
 * POST /api/v1/admin/users/:userId/suspend
 */
export const httpSuspendUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const user = await UserModel.findById(userId);

    if (!user) {
      return NotFoundErrorResponse(res, "User not found");
    }

    if (user.status === UserStatus.SUSPENDED) {
      return BadRequestErrorResponse(res, "User is already suspended");
    }

    user.status = UserStatus.SUSPENDED;
    
    if (reason) {
      user.deletedReason.push({
        category: "Suspended",
        reason: reason,
        deletedAt: new Date(),
      });
    }

    await user.save();

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "User suspended successfully",
      {
        id: user._id,
        status: user.status,
      }
    );
  } catch (error) {
    printError(error, "httpSuspendUser");
    return ErrorResponse(res);
  }
};

/**
 * Ban user account
 * POST /api/v1/admin/users/:userId/ban
 */
export const httpBanUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const user = await UserModel.findById(userId);

    if (!user) {
      return NotFoundErrorResponse(res, "User not found");
    }

    if (user.status === UserStatus.BANNED) {
      return BadRequestErrorResponse(res, "User is already banned");
    }

    user.status = UserStatus.BANNED;
    
    if (reason) {
      user.deletedReason.push({
        category: "Banned",
        reason: reason,
        deletedAt: new Date(),
      });
    }

    await user.save();

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "User banned successfully",
      {
        id: user._id,
        status: user.status,
      }
    );
  } catch (error) {
    printError(error, "httpBanUser");
    return ErrorResponse(res);
  }
};

/**
 * Reactivate user account
 * POST /api/v1/admin/users/:userId/reactivate
 */
export const httpReactivateUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await UserModel.findById(userId);

    if (!user) {
      return NotFoundErrorResponse(res, "User not found");
    }

    if (user.status === UserStatus.ACTIVE) {
      return BadRequestErrorResponse(res, "User is already active");
    }

    user.status = UserStatus.ACTIVE;
    await user.save();

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "User reactivated successfully",
      {
        id: user._id,
        status: user.status,
      }
    );
  } catch (error) {
    printError(error, "httpReactivateUser");
    return ErrorResponse(res);
  }
};

/**
 * Get user statistics for admin panel
 * GET /api/v1/admin/users/stats
 */
export const httpGetUserStats = async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      bannedUsers,
      deletedUsers,
      newUsersThisMonth,
      verifiedUsers,
      creatorUsers,
    ] = await Promise.all([
      UserModel.countDocuments({ isDeleted: false }),
      UserModel.countDocuments({
        isDeleted: false,
        $or: [
          { status: UserStatus.ACTIVE },
          { status: null },
          { status: { $exists: false } }
        ]
      }),
      UserModel.countDocuments({ isDeleted: false, status: UserStatus.SUSPENDED }),
      UserModel.countDocuments({ isDeleted: false, status: UserStatus.BANNED }),
      UserModel.countDocuments({ isDeleted: true }),
      UserModel.countDocuments({
        isDeleted: false,
        createdAt: { $gte: thirtyDaysAgo },
      }),
      UserModel.countDocuments({ isDeleted: false, verified: true }),
      UserModel.countDocuments({ isDeleted: false, membership: "creator" }),
    ]);

    const stats = {
      totalUsers,
      activeUsers,
      suspendedUsers,
      bannedUsers,
      deletedUsers,
      newUsersThisMonth,
      verifiedUsers,
      creatorUsers,
    };

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "User stats retrieved successfully",
      stats
    );
  } catch (error) {
    printError(error, "httpGetUserStats");
    return ErrorResponse(res);
  }
};

