import mongoose, { Schema } from "mongoose";
import { IUserFollow } from "./user.type";
import { collectionNames } from "../../constants/collectionNames";

const userFollowSchema = new Schema<IUserFollow>({
  followerId: {
    type: Schema.Types.ObjectId,
    ref: collectionNames.USER,
    required: true,
  },
  followingId: {
    type: Schema.Types.ObjectId,
    ref: collectionNames.USER,
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

// Virtual for populating follower details
userFollowSchema.virtual("follower", {
  ref: collectionNames.USER,
  localField: "followerId",
  foreignField: "_id",
  justOne: true,
  options: { select: "displayName username profilePicture" },
});

// Virtual for populating following details
userFollowSchema.virtual("following", {
  ref: collectionNames.USER,
  localField: "followingId",
  foreignField: "_id",
  justOne: true,
  options: { select: "displayName username profilePicture" },
});

// Ensure virtuals are included when converting to JSON
userFollowSchema.set("toJSON", { virtuals: true });
userFollowSchema.set("toObject", { virtuals: true });

const UserFollowModel = mongoose.model<IUserFollow>(
  collectionNames.USER_FOLLOWS,
  userFollowSchema
);

export default UserFollowModel;
