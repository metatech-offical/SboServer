import mongoose, { Schema, Document } from "mongoose";
import { collectionNames, EContentType } from "../../constants/collectionNames";

export interface ISavedItem extends Document {
  contentType: EContentType;
  contentId: Schema.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  savedAt: Date;
  content?: any; // Virtual field for populated content
}

const SavedItemSchema = new Schema<ISavedItem>(
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
    userId: {
      type: Schema.Types.ObjectId,
      ref: collectionNames.USER,
      required: true,
    },
    savedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Virtual field to populate content
SavedItemSchema.virtual("content", {
  refPath: "contentType",
  localField: "contentId",
  foreignField: "_id",
  justOne: true,
});

// Ensure virtuals are included when converting to JSON
SavedItemSchema.set("toJSON", { virtuals: true });
SavedItemSchema.set("toObject", { virtuals: true });
SavedItemSchema.index(
  { userId: 1, contentId: 1, contentType: 1 },
  { unique: true }
);
export const SavedItemModel = mongoose.model<ISavedItem>(
  collectionNames.SAVED_ITEMS,
  SavedItemSchema
);
