import { Schema, model, Types, Document } from "mongoose";
import { collectionNames, EContentType } from "../../constants/collectionNames";

export interface IView extends Document {
  contentType: EContentType;
  contentId: Schema.Types.ObjectId;
  userId?: Schema.Types.ObjectId;
  viewedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
}

const ViewSchema = new Schema<IView>(
  {
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
    userId: { type: Schema.Types.ObjectId, ref: "User", required: false },
    viewedAt: { type: Date, default: Date.now },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

// Ensure uniqueness for logged-in users, allow anonymous duplicates (sparse)
ViewSchema.index({ contentId: 1, userId: 1 }, { unique: true, sparse: true });

const ViewModel = model<IView>(collectionNames.CONTENT_VIEWS, ViewSchema);
export default ViewModel;
