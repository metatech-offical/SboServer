import { Schema, model, Types } from "mongoose";
import { collectionNames } from "../../constants/collectionNames";

export interface ICreatorSubscriptionPlan {
  creatorId: Types.ObjectId;
  interval: "monthly" | "quarterly" | "six_months" | "yearly";
  currency: string;
  price: number;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const creatorSubscriptionPlanSchema = new Schema<ICreatorSubscriptionPlan>(
  {
    creatorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    interval: {
      type: String,
      enum: ["monthly", "quarterly", "six_months", "yearly"],
      required: true,
    },
    currency: { type: String, default: "USD" },
    price: { type: Number, required: true },
    description: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

export const CreatorSubscriptionPlanModel = model(
  collectionNames.CREATOR_SUBSCRIPTION_PLANS,
  creatorSubscriptionPlanSchema
);
