import { Schema, model } from "mongoose";
import { IStream } from "./stream.type";
import { collectionNames } from "../../constants/collectionNames";
import { EContentVisibility } from "../../types/enum";

const StreamSettingsSchema = new Schema(
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

const StreamSchema = new Schema<IStream>(
  {
    videoUrl: { type: String, default: "" }, //mp4
    transcodedUrl: { type: String, default: "" }, //m3u8
    type: { type: String, enum: ["vr", "video", "video-live"], required: true },
    status: {
      type: String,
      enum: ["uploading", "draft", "published", "ended", "uploaded"],
      required: true,
    },
    title: { type: String, required: true },
    settings: {
      type: StreamSettingsSchema,
      default: { visibility: EContentVisibility.everyone },
    },
    createdAt: { type: Date, default: Date.now },
    moderationDetails: {
      reviewedBy: String,
      reviewTimestamp: Date,
      reason: String,
    },
    // properties only for live videos
    isLive: { type: Boolean, default: false },
    endedAt: { type: Date },
    vodStatus: {
      type: String,
      enum: ["processing", "ready", "failed", "under-review", "rejected"],
      default: "processing",
    },
    vodRecordingTaskId: { type: String, default: "" },
    saveVod: { type: Boolean, default: true }, // Flag to show/hide VOD after stream ends
    vodMeta: {
      type: Schema.Types.Mixed,
      default: {},
    },

    // Common properties with shorts
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: collectionNames.USER,
      required: true,
    },
    description: { type: String, default: "" },
    category: { type: String, default: "" },
    tags: [{ type: String }],
    isDeleted: { type: Boolean, default: false },
    thumbnailUrl: { type: String, default: "" },
    duration: { type: Number, default: 0 },
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    viewsCount: { type: Number, default: 0 },
    sharesCount: { type: Number, default: 0 },
    roomId: { type: String, default: "" },
    token: { type: String, default: "" },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

StreamSchema.virtual("creator", {
  ref: collectionNames.USER,
  localField: "creatorId",
  foreignField: "_id",
  justOne: true,
});

StreamSchema.index({
  creatorId: 1,
  isDeleted: 1,
  isLive: 1,
  status: 1,
  type: 1,
  roomId: 1,
});
const StreamModel = model<IStream>(collectionNames.STREAM, StreamSchema);

export default StreamModel;
