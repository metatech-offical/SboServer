import { Schema, model } from "mongoose";
import {
  collectionNames,
  EContentType,
  ENotificationContentCollection,
} from "../../constants/collectionNames";
import { ENotificationType, INotification } from "./notification.types";
import { NOTIFICATION_TTL } from "../../constants/notification";

const NotificationSchema = new Schema<INotification>(
  {
    type: {
      type: String,
      enum: ENotificationType,
      required: true,
    },
    isRead: { type: Boolean, default: false },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: collectionNames.USER,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: collectionNames.USER,
      required: true,
    },
    contentId: {
      //for populating content (collections mentioned in ENotificationContentCollection and EContentType)
      type: Schema.Types.ObjectId,
      refPath: "contentType",
      default: null,
    },
    contentType: {
      type: String,
      enum: Object.values({
        ...ENotificationContentCollection,
        ...EContentType,
      }),
      default: null,
    },
    isActive: { type: Boolean, default: true },
    notificationText: { type: String, default: "" },
  },
  { timestamps: true }
);

NotificationSchema.virtual("sender", {
  ref: collectionNames.USER,
  localField: "senderId",
  foreignField: "_id",
  justOne: true,
});

NotificationSchema.virtual("content", {
  refPath: "contentType",
  localField: "contentId",
  foreignField: "_id",
  justOne: true,
});

NotificationSchema.set("toJSON", { virtuals: true });
NotificationSchema.set("toObject", { virtuals: true });

NotificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: NOTIFICATION_TTL } // 30 days
);

const NotificationModel = model<INotification>(
  collectionNames.NOTIFICATIONS,
  NotificationSchema
);

export default NotificationModel;
