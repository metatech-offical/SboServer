import UserFollowModel from "../../models/user/userFollow.schema";
import { NotificationService } from "..";
import { Types } from "mongoose";
import { isFollowingPipeline } from "../../utils/pipeline";
import { NOTIFICATION_BODY, NOTIFICATION_TITLE } from "../../constants/notification";
import { IUser } from "../../models/user/user.type";
import { ENotificationType } from "../../models/notification/notification.types";

export const getFollowersCount = (id: Types.ObjectId) => {
  return UserFollowModel.countDocuments({
    followingId: id,
  });
};

export const getFollowingCount = (id: Types.ObjectId) => {
  return UserFollowModel.countDocuments({
    followerId: id,
  });
};

export const isUserFollowingCreator = async (
  userId: string,
  creatorId: string
): Promise<boolean> => {
  const result = await UserFollowModel.findOne({
    followerId: userId,
    followingId: creatorId,
  });
  return !!result;
};

export const handleUserFollow = async (
  user: IUser,
  targetUserId: string
): Promise<{
  userAlreadyFollowing: boolean;
  isNotificationSent: boolean;
}> => {
  const userId = String(user.id);
  let isNotificationSent = false;
  const data = {
    followerId: userId, // userId-person who is following
    followingId: targetUserId, // targetUserId-person being followed
  };

  const alreadyFollowing = await UserFollowModel.findOne(data);
  const userAlreadyFollowing: boolean = alreadyFollowing !== null;
  if (userAlreadyFollowing) {
    // delete document
    const deleteRes = await UserFollowModel.findOneAndDelete(data);
    await NotificationService.deleteNotification({
      senderId: userId,
      contentId: null,
      type: ENotificationType.newFollower,
    });
  } else {
    // create document
    await UserFollowModel.create(data);

    const isSent = await NotificationService.sendUniqueNotification({
      userId: targetUserId,
      senderId: userId,
      type: ENotificationType.newFollower,
      contentId: null,
      contentType: null,
      notificationText: NOTIFICATION_BODY.NEW_FOLLOWER(),
      pushNotificationContent: {
        title: NOTIFICATION_TITLE.NEW_FOLLOWER,
        body: NOTIFICATION_BODY.NEW_FOLLOWER(user.username),
      },
    });

    if (isSent) {
      isNotificationSent = true;
    }
  }
  return {
    userAlreadyFollowing,
    isNotificationSent,
  };
};

export const removeUserFromFollowerFollowing = async (
  userId: string,
  targetUserId: string
) => {
  const deleteRes = await UserFollowModel.deleteMany({
    $or: [
      {
        followerId: userId,
        followingId: targetUserId,
      },
      {
        followerId: targetUserId,
        followingId: userId,
      },
    ],
  });

  return deleteRes;
};

/**
 * Get followers list for a user
 * @param userId - The user whose followers we want to get
 * @param currentUserId - The current logged-in user's ID to check if following each follower
 * @param page - Page number for pagination
 * @param limit - Number of items per page
 * @returns List of followers with pagination
 */
export const getFollowersList = async (
  userId: string,
  currentUserId: string,
  page: number = 1,
  limit: number = 10
) => {
  const skip = (page - 1) * limit;

  const pipeline: any[] = [
    {
      $match: { followingId: new Types.ObjectId(userId) },
    },
    {
      $lookup: {
        from: "users",
        localField: "followerId",
        foreignField: "_id",
        as: "follower",
        pipeline: [
          {
            $project: {
              username: 1,
              displayName: 1,
              profilePicture: 1,
              bio: 1,
              verified: 1,
              membership: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$follower",
    },
    ...isFollowingPipeline(currentUserId, "followerId"),
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

  const followers = await UserFollowModel.aggregate(pipeline);
  const total = await UserFollowModel.countDocuments({ followingId: userId });

  return {
    followers: followers.map((follow) => ({
      ...follow.follower,
      isFollowing: follow.isFollowing,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get following list for a user
 * @param userId - The user whose following list we want to get
 * @param currentUserId - The current logged-in user's ID to check if following each user in the following list
 * @param page - Page number for pagination
 * @param limit - Number of items per page
 * @returns List of following users with pagination
 */
export const getFollowingList = async (
  userId: string,
  currentUserId: string,
  page: number = 1,
  limit: number = 10
) => {
  const skip = (page - 1) * limit;

  const pipeline: any[] = [
    {
      $match: { followerId: new Types.ObjectId(userId) },
    },
    {
      $lookup: {
        from: "users",
        localField: "followingId",
        foreignField: "_id",
        as: "following",
        pipeline: [
          {
            $project: {
              username: 1,
              displayName: 1,
              profilePicture: 1,
              bio: 1,
              verified: 1,
              membership: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$following",
    },
    ...isFollowingPipeline(currentUserId, "followingId"),
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

  const following = await UserFollowModel.aggregate(pipeline);
  const total = await UserFollowModel.countDocuments({ followerId: userId });

  return {
    following: following.map((follow) => ({
      ...follow.following,
      isFollowing: follow.isFollowing,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};
