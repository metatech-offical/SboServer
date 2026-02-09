import { Schema, model, Types, Document } from "mongoose";
import { collectionNames, EContentType } from "../../constants/collectionNames";

export interface ILike extends Document {
  contentType: EContentType;
  contentId: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  createdAt?: Date;
}

const LikeSchema = new Schema<ILike & Document>(
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
    userId: {
      type: Types.ObjectId,
      ref: collectionNames.USER,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// indexing to make sure user likes one content one time only
LikeSchema.index({ contentId: 1, contentType: 1, userId: 1 }, { unique: true });
const LikeModel = model<ILike & Document>(
  collectionNames.CONTENT_LIKES,
  LikeSchema
);

export default LikeModel;
