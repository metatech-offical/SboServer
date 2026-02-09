import mongoose, { Types } from "mongoose";
import { STATUS_CODES } from "../../constants/statusCodes";
import { ApiResponse, printError, ResultDB } from "../../utils/responseHandler";
import { EContentType } from "../../constants/collectionNames";
import {
  MESSAGES,
  POST_ACTION_MESSAGES,
} from "../../constants/responseMessage";
import LikeModel from "../../models/contentActions/like.schema";
import { NotificationService } from "..";
import {
  NOTIFICATION_BODY,
  NOTIFICATION_TITLE,
} from "../../constants/notification";
import { IUser } from "../../models/user/user.type";
import { ENotificationType } from "../../models/notification/notification.types";
import redisClient from "../../config/redis";
import { QUEUE } from "../../constants/queue";

//  like/unlike function - automatically determines action based on existing like
export const likeOrUnlikeContent = async (
  contentId: string,
  contentType: EContentType,
  user: IUser
): Promise<ApiResponse<null>> => {
  try {
    const userId = String(user._id);
    const contentObjectId = new Types.ObjectId(contentId);
    const userObjectId = user._id;

    // Check if like already exists
    const existingLike = await LikeModel.findOne({
      contentId: contentObjectId,
      userId: userObjectId,
    });

    if (existingLike) {
      // Unlike: Remove the like
      const deleteResult = await LikeModel.deleteOne({
        contentId: contentObjectId,
        userId: userObjectId,
      });

      // Only decrement count and mark notification inactive if a like was actually removed
      if (deleteResult.deletedCount > 0) {
        await NotificationService.deleteNotification({
          senderId: String(user._id),
          contentId: contentId,
          type: ENotificationType.like,
        });

        const updatedContent = await mongoose
          .model(contentType)
          .findByIdAndUpdate(
            contentObjectId,
            { $inc: { likesCount: -1 } },
            { new: true }
          );

        if (!updatedContent) {
          console.warn(`Content with ID ${contentId} not found while unliking`);
        }
      }

      return ResultDB(
        STATUS_CODES.OK,
        true,
        POST_ACTION_MESSAGES.UNLIKE(contentType),
        null
      );
    } else {
      // Like: Create new like
      const result = await LikeModel.create({
        contentId: contentObjectId,
        userId: userObjectId,
        contentType,
        likedAt: new Date(),
      });

      if (result) {
        // Increment likesCount and get updated content with creator
        const content = await mongoose
          .model(contentType)
          .findByIdAndUpdate(
            contentObjectId,
            { $inc: { likesCount: 1 } },
            { new: true }
          );

        if (!content) {
          console.warn(
            `Content ${contentType} with ID ${contentId} not found while liking`
          );
          return ResultDB(
            STATUS_CODES.NOT_FOUND,
            false,
            "Content not found",
            null
          );
        }

        // Send notification to creator that content is liked
        if (
          content?.creatorId &&
          String(content.creatorId) !== String(userId)
        ) {
          const isSent = await NotificationService.sendUniqueNotification({
            userId: String(content.creatorId),
            senderId: userId,
            type: ENotificationType.like,
            contentId: contentId,
            contentType: contentType,
            notificationText: NOTIFICATION_BODY.LIKE(contentType),
            pushNotificationContent: {
              title: NOTIFICATION_TITLE.LIKE,
              body: NOTIFICATION_BODY.LIKE(contentType, user.username),
            },
          });

          if (isSent) {
            console.log("Notification sent to creator that content is liked");
          }
        }
      }

      return ResultDB(
        STATUS_CODES.OK,
        true,
        POST_ACTION_MESSAGES.LIKE(contentType),
        null
      );
    }
  } catch (error) {
    printError(error, "likeOrUnlikeContent");
    return ResultDB(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      POST_ACTION_MESSAGES.ERROR_LIKE_ACTION,
      null
    );
  }
};

export const redisLikeOperation = async (
  contentType: EContentType,
  contentId: string,
  user: IUser,
  action: "like" | "unlike",
  creatorId?: string
) => {
  const userId = String(user._id);
  const likedUsersSetKey = `likes:users:${contentType}:${contentId}`;
  const pendingSyncSetKey = "likes:pendingSync"; // renamed from dirtySetKey

  if (action === "like") {
    const added = await redisClient.sAdd(likedUsersSetKey, userId);
    if (added > 0) {
      // refresh TTL if configured
      if (QUEUE.LIKE.TTL && QUEUE.LIKE.TTL > 0) {
        await redisClient.expire(likedUsersSetKey, QUEUE.LIKE.TTL);
      }
      // mark content for pending sync
      await redisClient.sAdd(pendingSyncSetKey, `${contentType}:${contentId}`);
    }
  } else if (action === "unlike") {
    const removed = await redisClient.sRem(likedUsersSetKey, userId);
    if (removed > 0) {
      if (QUEUE.LIKE.TTL && QUEUE.LIKE.TTL > 0) {
        await redisClient.expire(likedUsersSetKey, QUEUE.LIKE.TTL);
      }
      // mark content for pending sync
      await redisClient.sAdd(pendingSyncSetKey, `${contentType}:${contentId}`);
      // Optional: enqueue "unlike" notification if needed
    }
  } else {
    return ResultDB(
      STATUS_CODES.BAD_REQUEST,
      false,
      MESSAGES.INVALID_INPUT,
      null
    );
  }

  return ResultDB(
    STATUS_CODES.OK,
    true,
    action === "like" ? "Liked successfully" : "Unliked successfully",
    null
  );
};
