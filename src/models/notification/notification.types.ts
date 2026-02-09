import { Document, Types } from "mongoose";
import { ENotificationContentType } from "../../constants/collectionNames";

// only those notification which can be controlled by user via settings
export const UserDefaultNotifications = {
  comment: true,
  like: true,
  live: true,
  post: true,
};

export interface FirebaseMessage {
  title: string;
  body: string;
}

export interface SendNotificationParams {
  userId: string; // receiver
  senderId: string; // sender/trigger person
  type: ENotificationType;
  contentId: string | null;
  contentType: ENotificationContentType | null;
  notificationText?: string; // optional, mostly for system notifications
  pushNotificationContent: {
    title: string;
    body: string;
  };
}

export enum ENotificationType {
  newFollower = "newFollower",
  orderPlace = "order_placed",
  orderStatus = "order_status_update",
  ticket = "ticket",
  subscribe = "subscribe",
  eventPostponed = "event_postponed",
  eventCancelled = "event_cancelled",
  refundRequest = "refund_request",
  refundApproved = "refund_approved",
  // in user schema, below notifications can be turned off by user
  comment = "comment", //when someone comment on any content
  like = "like", //when someone like any content
  live = "live", //when creator goes live
  post = "post", //notification to creator when creator uploads new post
}

// notification service
export interface INotification extends Document {
  type: ENotificationType;
  userId: Types.ObjectId;
  senderId: Types.ObjectId;
  contentId?: Types.ObjectId | null;
  contentType?: ENotificationContentType | null;
  isRead: boolean;
  isActive: boolean;
  notificationText?: string; //it will be empty mostly, because handled by frontend, but if needed for system notifications
  createdAt: Date;
  updatedAt?: Date;
}
