import { Request, Response } from "express";
import {
  UserService,
  StoreService,
  UserBlockService,
  UserFollowService,
} from "../../services";
import {
  ErrorResponse,
  printError,
  SuccessOKResponse,
  BadRequestErrorResponse,
  SuccessResponse,
} from "../../utils/responseHandler";
import { STATUS_CODES } from "../../constants/statusCodes";
import { AWS_S3_BUCKET_NAME } from "../../config/environment";
import { uploadFileToS3 } from "../../lib/s3";
import { MembershipLevel } from "../../models/user/user.type";
import { EProfileQueryType } from "../../types/enum";
import { AuthenticatedRequest } from "../../types/express";

// This API is for one user to block or unblock other user
export const httpBlockOrUnblockUser = async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const { blockedId, action } = req.body;

  try {
    const data = await UserBlockService.blockOrUnblockUser(
      String(user._id),
      blockedId,
      action
    );
    return SuccessResponse(
      res,
      data.statusCode,
      data.success,
      data.message,
      data.data
    );
  } catch (err) {
    printError(err, "httpBlockOrUnblockUser");
    return ErrorResponse(res);
  }
};

export const httpGetUserById = async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const targetUserId = String(req?.params?.userId);

  try {
    const userData = await UserService.getPopulatedUserById(
      targetUserId,
      String(user._id)
    );
    return SuccessOKResponse(res, userData);
  } catch (err) {
    printError(err, "httpGetUserById");
    return ErrorResponse(res);
  }
};

// Profile screen API
export const httpGetProfileContentByUserId = async (
  req: Request,
  res: Response
) => {
  const user = (req as AuthenticatedRequest).user;
  const targetUserId = String(req?.params?.userId);
  const { limit, page, type, search = "" } = req.query;

  try {
    const profileContent = await UserService.getUserProfileContent(
      type as EProfileQueryType,
      targetUserId,
      String(user._id),
      Number(limit),
      Number(page),
      String(search)
    );

    return SuccessOKResponse(res, {
      content: profileContent.data,
      pagination: profileContent.pagination,
    });
  } catch (err) {
    printError(err, "httpGetUserById");
    return ErrorResponse(res);
  }
};

// This API is for one user to block or unblock other user
export const httpGetCurrentUserProfile = async (
  req: Request,
  res: Response
) => {
  return SuccessOKResponse(res, req.user);
};

// Get favorite creators based on viewership
export const httpGetFavoriteCreators = async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const userId = String(user._id);

  try {
    // Get query parameters for pagination (already validated by middleware)
    const limit = parseInt(req.query.limit as string) || 10;
    const page = parseInt(req.query.page as string) || 1;
    const data = await UserService.getFavoriteCreators(userId, limit, page);

    if (!data.success) {
      return ErrorResponse(res, data.statusCode, false, data.message, null);
    }

    return SuccessOKResponse(res, data.data, data.message);
  } catch (err) {
    printError(err, "httpGetFavoriteCreators");
    return ErrorResponse(res);
  }
};

export const httpUpdateUserMembership = async (req: Request, res: Response) => {
  try {
    const { membership } = req.body;
    const user = (req as AuthenticatedRequest).user;

    if (user.membership === membership) {
      return SuccessOKResponse(
        res,
        null,
        `User is already ${membership} member`
      );
    }

    // Update user membership
    const updatedUser = await UserService.updateUserMembership(
      user._id.toString(),
      membership
    );

    // If membership is creator, check if store exists and create one if it doesn't
    if (membership === MembershipLevel.CREATOR) {
      const existingStore = await StoreService.getStoreByOwnerId(user._id);

      // If store doesn't exist, create a new store
      if (!existingStore) {
        const storeResult = await StoreService.createStore({
          name: updatedUser?.displayName || updatedUser?.username || "My Store",
          ownerId: user._id,
          bio: updatedUser?.bio,
          logo: updatedUser?.profilePicture,
        });

        if (!storeResult.success) {
          console.warn(
            "Failed to create store for creator:",
            storeResult.message
          );
        }
      }
    }

    return SuccessOKResponse(res, updatedUser);
  } catch (err) {
    printError(err, "httpUpdateUserMembership");
    return ErrorResponse(res);
  }
};

export const httpFollowUnfollowUser = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const { targetUserId } = req.body;
    if (targetUserId === String(user._id)) {
      return ErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        false,
        "You cannot follow/unfollow yourself."
      );
    }

    const targetUser = await UserService.getUserById(targetUserId);
    if (!targetUser) {
      return ErrorResponse(
        res,
        STATUS_CODES.NOT_FOUND,
        false,
        "User not found."
      );
    }

    const { userAlreadyFollowing, isNotificationSent } =
      await UserFollowService.handleUserFollow(user, targetUserId);
    if (!userAlreadyFollowing && !isNotificationSent) {
      console.warn("Notification not sent on follow status change");
    }

    return SuccessOKResponse(res, null, "Follow status updated.");
  } catch (err) {
    printError(err, "httpFollowUnfollowUser");
    return ErrorResponse(res);
  }
};

export const httpUpdateUserNotificationSettings = async (
  req: Request,
  res: Response
) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const { notifications } = req.body;
    user.notificationSettings = notifications || user.notificationSettings;
    await user.save();

    return SuccessOKResponse(
      res,
      user,
      "User notification settings updated successfully"
    );
  } catch (err) {
    printError(err, "httpUpdateUserNotificationSettings");
    return ErrorResponse(res);
  }
};

export const httpDeleteAccount = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const { category, reason } = req.body;
    await UserService.deleteUser(user, category, reason);
    return SuccessOKResponse(res, null, "User account deleted successfully.");
  } catch (error) {
    printError(error, "httpDeleteAccount");
    return ErrorResponse(res);
  }
};

export const httpUpdateCreatorProfile = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const file = req.file;
    const { username, displayName, bio } = req.body;

    if (username && username !== user.username) {
      const existingUser = await UserService.getUserByUsername(username);
      if (existingUser && existingUser._id !== user._id) {
        return BadRequestErrorResponse(res, "Username already taken");
      }
      user.username = username;
    }

    if (file) {
      const key = `profile-pictures/${user._id}/${Date.now()}/${
        file.originalname
      }`;
      const { url, success } = await uploadFileToS3(
        file.buffer,
        AWS_S3_BUCKET_NAME,
        key,
        file.mimetype
      );

      if (!success) {
        return ErrorResponse(
          res,
          STATUS_CODES.INTERNAL_SERVER_ERROR,
          false,
          "Failed to upload profile!"
        );
      }

      user.profilePicture = url;
    }

    user.displayName = displayName || user.displayName;
    user.bio = bio || user.bio;
    await user.save();
    return SuccessOKResponse(res, user, "Creator profile updated successfully");
  } catch (error) {
    printError(error, "httpUpdateCreatorProfile");
    return ErrorResponse(res);
  }
};

export const httpGetBlockedUsers = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const { limit, page } = req.query;
    const result = await UserBlockService.getBlockedUsers(
      user._id.toString(),
      Number(limit),
      Number(page)
    );

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (err) {
    printError(err, "httpGetBlockedUsers");
    return ErrorResponse(res);
  }
};

export const httpGetFollowersList = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const { page = "1", limit = "10" } = req.query;

    // If no userId provided, use the authenticated user's ID
    const targetUserId = (req.query.userId as string) || String(user._id);

    const result = await UserFollowService.getFollowersList(
      targetUserId,
      String(user._id),
      Number(page),
      Number(limit)
    );

    return SuccessOKResponse(
      res,
      result,
      "Followers list fetched successfully"
    );
  } catch (err) {
    printError(err, "httpGetFollowersList");
    return ErrorResponse(res);
  }
};

export const httpGetFollowingList = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const { page = "1", limit = "10" } = req.query;

    // If no userId provided, use the authenticated user's ID
    const targetUserId = (req.query.userId as string) || String(user._id);
    const result = await UserFollowService.getFollowingList(
      targetUserId,
      String(user._id),
      Number(page),
      Number(limit)
    );

    return SuccessOKResponse(
      res,
      result,
      "Following list fetched successfully"
    );
  } catch (err) {
    printError(err, "httpGetFollowingList");
    return ErrorResponse(res);
  }
};

export const httpGetUserStatistics = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const result = await UserService.getUserStatistics(String(user._id));
    return SuccessOKResponse(res, result);
  } catch (err) {
    printError(err, "httpGetUserStatistics");
    return ErrorResponse(res);
  }
};

export const httpGetSuggestedAccounts = async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id.toString();
    const { page, limit } = req.query;

    const result = await UserService.getSuggestedAccounts({
      userId,
      page: Number(page),
      limit: Number(limit),
    });

    if (!result.success) {
      return ErrorResponse(res, result.statusCode, false, result.message);
    }

    return SuccessOKResponse(res, result.data, result.message);
  } catch (err) {
    printError(err, "httpGetSuggestedAccounts");
    return ErrorResponse(res);
  }
};
