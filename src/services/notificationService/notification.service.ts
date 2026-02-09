import { Types } from "mongoose";
import NotificationModel from "../../models/notification/notification.schema";
import {
  FirebaseMessage,
  ENotificationType,
  SendNotificationParams,
} from "../../models/notification/notification.types";
import { messaging } from "../../config/firebase";
import { IPagination } from "../../types/schema";
import DeviceModel from "../../models/device/device.schema";
import UserModel from "../../models/user/user.schema";
import { ApiResponse, printError, ResultDB } from "../../utils/responseHandler";
import {
  EContentType,
  ENotificationContentType,
} from "../../constants/collectionNames";
import { DEFAULT_DATA_WITH_PAGINATION } from "../../constants";
import { STATUS_CODES } from "../../constants/statusCodes";
import UserFollowModel from "../../models/user/userFollow.schema";
import { addNotificationToQueue } from "../../queues/notification";
import {
  NOTIFICATION_BODY,
  NOTIFICATION_TITLE,
} from "../../constants/notification";
import { IUser } from "../../models/user/user.type";
import { escapeRegex } from "../../utils/regex.helper";

/**
 * Get unread notifications count
 */
export const getUnreadCount = async (userId: string): Promise<number> => {
  try {
    return await NotificationModel.countDocuments({
      userId: new Types.ObjectId(userId),
      isRead: false,
    });
  } catch (error) {
    console.error("Error getting unread count:", error);
    return 0;
  }
};

/**
 * Create notification in database
 */
const createDbNotification = async ({
  userId,
  senderId,
  type,
  contentId,
  contentType,
  notificationText = "",
}: {
  userId: string; // receiver
  senderId: string; // sender/trigger person
  type: ENotificationType;
  contentId: Types.ObjectId | null;
  contentType: ENotificationContentType | null;
  notificationText?: string; // optional, mostly for system notifications
}) => {
  try {
    return await NotificationModel.create({
      userId: new Types.ObjectId(userId),
      senderId: new Types.ObjectId(senderId),
      type,
      notificationText,
      contentId,
      contentType,
      isRead: false,
    });
  } catch (error) {
    console.error("Error creating database notification:", error);
    throw error;
  }
};

/**
 * Get user notifications with advanced filtering
 */
export const getUserNotifications = async (
  userId: any,
  type: string = "all",
  page: number = 1,
  limit: number = 20,
  fromDate?: string,
  toDate?: string,
  search: string = ""
): Promise<ApiResponse<{ data: any[]; pagination: IPagination }>> => {
  try {
    const skip = (page - 1) * limit;
    const query: any = { userId };

    // Type filtering
    if (type && type !== "all") {
      if (type === "orders") {
        query.type = {
          $in: [ENotificationType.orderPlace, ENotificationType.orderStatus],
        };
      } else if (type === "ticket") {
        query.type = ENotificationType.ticket;
      }
    }

    // Date range filtering
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) query.createdAt.$lte = new Date(toDate);
    }

    // Search on notificationText
    if (search && search.trim() !== "") {
      query.notificationText = { $regex: escapeRegex(search), $options: "i" };
    }

    const [notifications, total] = await Promise.all([
      NotificationModel.find(query)
        .populate({
          path: "sender",
          select: "username profilePicture",
          match: { isDeleted: false },
        })
        .populate("content")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      NotificationModel.countDocuments(query),
    ]);

    return ResultDB(
      STATUS_CODES.OK,
      true,
      "Notifications fetched successfully",
      {
        data: notifications as any[],
        pagination: {
          totalRecords: total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          limit,
        },
      }
    );
  } catch (error) {
    printError(error, "getUserNotifications");
    return ResultDB(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      "Error fetching user notifications",
      DEFAULT_DATA_WITH_PAGINATION
    );
  }
};

/**
 * Mark notifications as read
 */
export const markAsRead = async (userId: string): Promise<boolean> => {
  try {
    const query = { userId: new Types.ObjectId(userId) };
    await NotificationModel.updateMany(query, { $set: { isRead: true } });
    return true;
  } catch (error) {
    printError(error, "markAsRead");
    return false;
  }
};

/**
 * Send Firebase FCM notification
 */
export const sendFirebaseNotification = async (
  fcmToken: string,
  notificationContent: FirebaseMessage
): Promise<boolean> => {
  try {
    const firebaseMessage = {
      notification: {
        title: notificationContent.title,
        body: notificationContent.body,
      },
      token: fcmToken,
    };

    await messaging.send(firebaseMessage);
    return true;
  } catch (error) {
    console.error(
      `Error sending Firebase notification for ${fcmToken}:`,
      error
    );
    return false;
  }
};

/**
 * Check if user notification setting is on for particular type
 * If notificationType is not present in user object, then return true
 * return false only if same key is present in user object with value false
 */
export const isUserNotificationSettingOn = async (
  userId: string,
  notificationType: ENotificationType
): Promise<boolean> => {
  const user = await UserModel.findById(userId);
  if (!user) {
    return false;
  }
  const setting = user.notificationSettings?.[notificationType];
  if (setting === false) return false;
  return true;
};

/**
 * Updated notification sendNotification function
 * Using Device schema for sending notification this will help in managing multiple devices.
 */
export const sendNotification = async ({
  userId,
  senderId,
  type,
  contentId,
  contentType,
  notificationText = "",
  pushNotificationContent = {
    title: "New notification",
    body: "You received a new notification",
  },
}: SendNotificationParams): Promise<boolean> => {
  try {
    if (String(userId) === String(senderId)) {
      console.log(
        `Receiver ${userId} is the same as sender ${senderId}, skipping notification`
      );
      return false;
    }

    // check if user notification setting is on for particular type
    const isNotificationAllowed = await isUserNotificationSettingOn(
      userId,
      type
    );
    if (!isNotificationAllowed) {
      console.log(
        `User ${userId} has notification setting for ${type} off, skipping notification`
      );
      return false;
    }

    const [devices, sender] = await Promise.all([
      DeviceModel.find({ userId, active: true })
        .select("fcmToken")
        .lean()
        .exec(),
      UserModel.findById(senderId).select("username").lean().exec(),
    ]);

    if (!sender) {
      console.warn(`Sender ${senderId} not found`);
      return false;
    }

    // Create notification in DB
    await createDbNotification({
      userId,
      senderId,
      type,
      contentId: contentId ? new Types.ObjectId(contentId) : null,
      contentType,
      notificationText,
    });

    if (devices.length === 0) {
      console.log(
        `User ${userId} has no active devices, skipping push notifications`
      );
      return false;
    }

    await Promise.all(
      devices.map((device) =>
        addNotificationToQueue(
          device.fcmToken,
          pushNotificationContent.title,
          pushNotificationContent.body
        )
      )
    );

    console.log(
      `Notification sent to user ${userId} on ${devices.length} devices`
    );

    return true;
  } catch (error) {
    printError(error, "sendNotification");
    return false;
  }
};

// when user upload any post, send notification to all followers whose post notification setting is on
export const sendNewPostNotification = async (
  user: IUser,
  postId: string,
  contentType: EContentType.POST | EContentType.STREAM | EContentType.SHORT
): Promise<boolean> => {
  try {
    const userId = String(user._id);
    const temp = await UserFollowModel.find({
      followingId: userId,
    }).populate({
      path: "followerId",
      match: {
        isDeleted: false,
        "notificationSettings.post": true,
      },
      select: "_id",
    });
    const userFollowers = temp.filter((t) => t.followerId);
    if (!userFollowers || userFollowers.length === 0) {
      console.log(
        `User ${userId} has no followers. Skipping sending new post notifications to followers`
      );
      return false;
    }

    console.log(
      `Sending new post notification to ${userFollowers.length} followers`
    );

    await Promise.all(
      userFollowers.map((u: any) => {
        return sendNotification({
          userId: String(u.followerId?._id),
          senderId: userId,
          type: ENotificationType.post,
          contentId: postId,
          contentType: contentType,
          notificationText: NOTIFICATION_BODY.NEW_CONTENT(contentType),
          pushNotificationContent: {
            title: NOTIFICATION_TITLE.NEW_CONTENT,
            body: NOTIFICATION_BODY.NEW_CONTENT(contentType, user.username),
          },
        });
      })
    );
    return true;
  } catch (e) {
    printError(e, "sendNewPostNotification");
    return false;
  }
};

export const sendUniqueNotification = async ({
  userId,
  senderId,
  type,
  contentId,
  contentType,
  pushNotificationContent,
  notificationText,
}: SendNotificationParams): Promise<boolean> => {
  // handle already liked posts
  const existingNotification = await NotificationModel.findOne({
    senderId,
    userId,
    type,
    contentId: contentId ? new Types.ObjectId(contentId) : null,
  });
  if (existingNotification) {
    console.log(
      `${type} Notification already exists for content ${contentId} by user ${senderId}, deleting...`
    );
    await NotificationModel.findByIdAndDelete(existingNotification._id);
  }
  return sendNotification({
    userId,
    senderId,
    type,
    contentId,
    contentType,
    pushNotificationContent,
    notificationText,
  });
};

export const deleteNotification = async ({
  senderId,
  contentId,
  type,
}: {
  senderId: string;
  contentId: string | null;
  type: ENotificationType;
}) => {
  return await NotificationModel.findOneAndDelete({
    senderId,
    type,
    contentId,
  });
};
