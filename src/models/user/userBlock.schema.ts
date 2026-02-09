import mongoose, { Schema } from "mongoose";
import { IUserBlock } from "./user.type";
import { collectionNames } from "../../constants/collectionNames";

const userBlockSchema = new Schema<IUserBlock>({
  blocker: {
    type: Schema.Types.ObjectId,
    ref: collectionNames.USER,
    required: true,
  },
  blocked: {
    type: Schema.Types.ObjectId,
    ref: collectionNames.USER,
    required: true,
  },
  blockedAt: { type: Date, default: Date.now },
});
const UserBlockModel = mongoose.model<IUserBlock>(
  collectionNames.USER_BLOCKS,
  userBlockSchema
);

export default UserBlockModel;
