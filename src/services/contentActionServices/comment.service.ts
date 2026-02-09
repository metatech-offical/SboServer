import mongoose, { Types } from "mongoose";
import { STATUS_CODES } from "../../constants/statusCodes";
import { ApiResponse, printError, ResultDB } from "../../utils/responseHandler";
import { collectionNames, EContentType } from "../../constants/collectionNames";
import PostCommentModel from "../../models/contentActions/comment.schema";
import { NotificationService } from "..";
import {
  MESSAGES,
  POST_ACTION_MESSAGES,
} from "../../constants/responseMessage";
import { NOTIFICATION_BODY, NOTIFICATION_TITLE } from "../../constants/notification";
import { IUser } from "../../models/user/user.type";
import { ENotificationType } from "../../models/notification/notification.types";

// comment - short
export const addComment = async (
  contentId: string,
  contentType: EContentType,
  creatorId: string,
  user: IUser, //logged in user
  commentText: string,
  parentCommentId?: string
): Promise<ApiResponse<any>> => {
  try {
    const userId = String(user._id);
    const contentObjectId = new Types.ObjectId(contentId);
    const userObjectId = user._id;
    const creatorObjectId = new Types.ObjectId(creatorId);

    const newComment = await new PostCommentModel({
      contentId: contentObjectId,
      creatorId: creatorObjectId,
      contentType,
      user: userObjectId,
      commentText: commentText,
      parentId: parentCommentId ?? null,
    }).save();

    //increase comment count if it is not a reply comment
    if (!parentCommentId) {
      await mongoose.model(contentType).findByIdAndUpdate(contentId, {
        $inc: { commentsCount: 1 },
      });
    }

    // Send notification to creator
    const sentToCreator = await NotificationService.sendNotification({
      userId: creatorId,
      senderId: userId,
      type: ENotificationType.comment,
      contentId: contentId,
      contentType: contentType,
      notificationText: NOTIFICATION_BODY.COMMENT(commentText),
      pushNotificationContent: {
        title: NOTIFICATION_TITLE.COMMENT,
        body: NOTIFICATION_BODY.COMMENT(commentText, user.username),
      },
    });

    if (sentToCreator) {
      console.log("Notification sent to creator");
    }

    if (parentCommentId) {
      // Send notification to commentator that someone replied on their comment
      const parentComment = await PostCommentModel.findById(
        parentCommentId
      ).select("user");

      if (!parentComment) {
        return ResultDB(
          STATUS_CODES.INTERNAL_SERVER_ERROR,
          false,
          POST_ACTION_MESSAGES.ERROR_COMMENT_ACTION,
          null
        );
      }

      const commentatorId = String(parentComment.user);
      const sentToCommentator = await NotificationService.sendNotification({
        userId: commentatorId,
        senderId: userId,
        type: ENotificationType.comment,
        contentId: contentId,
        contentType: EContentType.SHORT,
        notificationText: NOTIFICATION_BODY.COMMENT(commentText),
        pushNotificationContent: {
          title: NOTIFICATION_TITLE.COMMENT,
          body: NOTIFICATION_BODY.COMMENT(commentText, user.username),
        },
      });

      if (sentToCommentator) {
        console.log("Notification sent to commentator");
      }
    }

    const populatedComment = await PostCommentModel.findById(newComment._id)
      .populate("user", "username displayName profilePicture")
      .lean();

    return ResultDB(
      STATUS_CODES.CREATED,
      true,
      POST_ACTION_MESSAGES.COMMENT(contentType),
      populatedComment
    );
  } catch (error) {
    printError(error, "addShortComment");
    return ResultDB(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      POST_ACTION_MESSAGES.ERROR_COMMENT_ACTION,
      null
    );
  }
};

export const deleteComment = async (
  commentId: string,
  userId: string
): Promise<ApiResponse<null>> => {
  try {
    const comment = await PostCommentModel.findById(commentId);

    if (!comment) {
      return ResultDB(STATUS_CODES.NOT_FOUND, false, MESSAGES.NOT_FOUND, null);
    }

    if (comment.user.toString() !== userId.toString()) {
      return ResultDB(
        STATUS_CODES.FORBIDDEN,
        false,
        MESSAGES.UNAUTHORIZED,
        null
      );
    }

    // Delete parent + replies in one query
    await PostCommentModel.deleteMany({
      $or: [{ _id: comment._id }, { parentId: comment._id }],
    });

    if (!comment.parentId) {
      await mongoose
        .model(comment.contentType)
        .findByIdAndUpdate(comment.contentId, {
          $inc: { commentsCount: -1 },
        });
    }

    return ResultDB(
      STATUS_CODES.OK,
      true,
      POST_ACTION_MESSAGES.COMMENT_DELETE(comment.contentType),
      null
    );
  } catch (error) {
    printError(error, "deleteComment");
    return ResultDB(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      POST_ACTION_MESSAGES.COMMENT_DELETE_FAIL,
      null
    );
  }
};

export const getContentComments = async (
  contentId: string,
  page: number,
  limit: number
): Promise<ApiResponse<any>> => {
  try {
    const skip = (page - 1) * limit;
    const contentObjId = new Types.ObjectId(contentId);
    const comments = await PostCommentModel.aggregate([
      { $match: { contentId: contentObjId, parentId: null } },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
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
          "user.0": { $exists: true },
        },
      },
      { $unwind: "$user" },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: collectionNames.CONTENT_COMMENTS,
          localField: "_id",
          foreignField: "parentId",
          as: "replies",
        },
      },
      {
        $addFields: {
          repliesCount: { $size: "$replies" },
        },
      },
      {
        $project: {
          commentText: 1,
          createdAt: 1,
          repliesCount: 1,
          "user._id": 1,
          "user.username": 1,
          "user.displayName": 1,
          "user.profilePicture": 1,
        },
      },
    ]);

    // Count only comments from non-deleted users
    const totalCountResult = await PostCommentModel.aggregate([
      { $match: { contentId: contentObjId, parentId: null } },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
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
          "user.0": { $exists: true },
        },
      },
      { $count: "total" },
    ]);
    const totalCount = totalCountResult[0]?.total || 0;

    return ResultDB(STATUS_CODES.OK, true, MESSAGES.SUCCESS, {
      comments,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
      },
    });
  } catch (error) {
    printError(error, "getContentComments");
    return ResultDB(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      MESSAGES.INTERNAL_SERVER_ERROR,
      null
    );
  }
};

export const getCommentReplies = async (
  commentId: string,
  page: number,
  limit: number
): Promise<ApiResponse<any>> => {
  try {
    const skip = (page - 1) * limit;
    const commentObjId = new Types.ObjectId(commentId);
    
    const replies = await PostCommentModel.aggregate([
      { $match: { parentId: commentObjId } },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
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
          "user.0": { $exists: true },
        },
      },
      { $unwind: "$user" },
      { $sort: { createdAt: 1 } }, // chronological order
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          commentText: 1,
          createdAt: 1,
          updatedAt: 1,
          "user._id": 1,
          "user.username": 1,
          "user.displayName": 1,
          "user.profilePicture": 1,
        },
      },
    ]);

    // Count only replies from non-deleted users
    const totalCountResult = await PostCommentModel.aggregate([
      { $match: { parentId: commentObjId } },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
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
          "user.0": { $exists: true },
        },
      },
      { $count: "total" },
    ]);
    const totalCount = totalCountResult[0]?.total || 0;

    return ResultDB(STATUS_CODES.OK, true, MESSAGES.SUCCESS, {
      replies,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
      },
    });
  } catch (error) {
    printError(error, "getCommentReplies");
    return ResultDB(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      MESSAGES.INTERNAL_SERVER_ERROR,
      null
    );
  }
};
