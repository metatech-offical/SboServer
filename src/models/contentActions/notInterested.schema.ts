import { Schema, model, Types, Document } from "mongoose";
import { collectionNames, EContentType } from "../../constants/collectionNames";

export interface INotInterested extends Document {
  userId: Schema.Types.ObjectId;
  contentType: EContentType;
  contentId: Schema.Types.ObjectId;
  reason: String;
  createdAt: Date;
}

const NotInterestedSchema = new Schema<INotInterested>(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true },
    contentType: {
      type: String,
      enum: EContentType,
      required: true,
    },
    contentId: {
      type: Schema.Types.ObjectId,
      refPath: "contentType",
      required: true,
    },
    reason: { type: String }, // Optional for future extension
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

NotInterestedSchema.index(
  { userId: 1, contentId: 1, contentType: 1 },
  { unique: true }
);

const NotInterestedModel = model<INotInterested>(
  collectionNames.NOT_INTERESTED,
  NotInterestedSchema
);
export default NotInterestedModel;
