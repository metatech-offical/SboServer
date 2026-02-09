import { Schema, model, Document, Types } from "mongoose";
import { collectionNames, EContentType } from "../../constants/collectionNames";

export interface IPlaylistItem {
  contentId: Types.ObjectId;
  contentType: EContentType.SHORT | EContentType.STREAM;
}

export interface IPlaylist extends Document {
  title: string;
  description?: string;
  createdBy: Types.ObjectId;
  items: IPlaylistItem[];
  createdAt: Date;
  updatedAt: Date;
}

const PlaylistItemSchema = new Schema<IPlaylistItem>(
  {
    contentId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: "contentType",
    },
    contentType: {
      type: String,
      enum: [EContentType.STREAM, EContentType.SHORT],
      required: true,
    },
  },
  { _id: false }
);

const PlaylistSchema = new Schema<IPlaylist>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: collectionNames.USER,
      required: true,
    },
    items: {
      type: [PlaylistItemSchema],
      default: [],
    },
  },
  { timestamps: true }
);

PlaylistSchema.index({ createdBy: 1 });

const PlaylistModel = model<IPlaylist>(
  collectionNames.PLAYLIST,
  PlaylistSchema
);

export default PlaylistModel;
