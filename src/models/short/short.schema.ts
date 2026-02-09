import mongoose, { Schema, Document } from "mongoose";
import { IShorts } from "./short.type";
import { collectionNames } from "../../constants/collectionNames";
import { EContentVisibility } from "../../types/enum";

const ShortsSettingsSchema = new Schema(
  {
    visibility: {
      type: String,
      enum: EContentVisibility,
      default: EContentVisibility.everyone,
      required: true,
    },
  },
  { _id: false }
);

const ShortsSchema: Schema = new Schema<IShorts>(
  {
    description: { type: String, required: true },
    videoUrl: { type: String, required: false },
    thumbnailUrl: {
      type: String,
      required: true,
    },
    duration: { type: Number, required: true },
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: collectionNames.USER,
      required: true,
    },
    settings: {
      type: ShortsSettingsSchema,
      default: { visibility: EContentVisibility.everyone },
    },
    category: { type: String, required: false },
    tags: { type: [String], required: true },
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    viewsCount: { type: Number, default: 0 },
    sharesCount: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

ShortsSchema.virtual("creator", {
  ref: collectionNames.USER,
  localField: "creatorId",
  foreignField: "_id",
  justOne: true,
});

ShortsSchema.index({ creator: 1 });
const ShortsModel = mongoose.model<IShorts>(
  collectionNames.SHORT,
  ShortsSchema
);

export default ShortsModel;
