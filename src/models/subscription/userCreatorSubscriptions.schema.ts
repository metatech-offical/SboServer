import { Schema, model, Types } from "mongoose";
import { collectionNames } from "../../constants/collectionNames";

export interface IUserCreatorSubscription {
  userId: Types.ObjectId;
  creatorId: Types.ObjectId;
  planId: Types.ObjectId;
  startDate: Date;
  endDate: Date;
  status: "active" | "cancelled" | "expired";
  createdAt?: Date;
  updatedAt?: Date;
}

const userCreatorSubscriptionSchema = new Schema<IUserCreatorSubscription>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: collectionNames.USER,
      required: true,
    },
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: collectionNames.USER,
      required: true,
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: collectionNames.CREATOR_SUBSCRIPTION_PLANS,
      required: true,
    },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["active", "cancelled", "expired"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

export const UserCreatorSubscriptionModel = model(
  collectionNames.USER_CREATOR_SUBSCRIPTIONS,
  userCreatorSubscriptionSchema
);
