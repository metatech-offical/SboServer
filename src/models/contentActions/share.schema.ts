import { model, Schema, Types } from "mongoose";
import { collectionNames, EContentType } from "../../constants/collectionNames";

export interface IContentShare extends Document {
  contentType: EContentType;
  contentId: Schema.Types.ObjectId;
  sharedBy: Schema.Types.ObjectId;
  url: string;
  platform?: string;
  createdAt?: string;
  updatedAt?: string;
}

const ShareSchema = new Schema<IContentShare>(
  {
    contentType: {
      type: String,
      enum: EContentType,
      required: true,
    },
    contentId: {
      type: Types.ObjectId,
      refPath: "contentType",
      required: true,
    },
    sharedBy: {
      type: Schema.Types.ObjectId,
      ref: collectionNames.USER,
      required: true,
    },
    url: { type: String, required: true },
    platform: { type: String, required: false },
  },
  { timestamps: true }
);

const ShareModel = model<IContentShare>(collectionNames.SHARES, ShareSchema);
export default ShareModel;
