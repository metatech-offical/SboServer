import { model, Schema, Types, Document } from "mongoose";
import { collectionNames } from "../../constants/collectionNames";

export interface IPost extends Document {
  _id: Types.ObjectId;
  creatorId: Types.ObjectId;
  caption?: string;
  tags: string[];
  photoUrls: string[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
}

const PostSchema = new Schema<IPost>(
  {
    creatorId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: collectionNames.USER,
    },
    caption: {
      type: String,
      default: "",
    },
    tags: {
      type: [String],
      default: [],
    },
    photoUrls: {
      type: [String],
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    sharesCount: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

PostSchema.index({ creatorId: 1 });
PostSchema.index({ tags: 1 });
PostSchema.index({ caption: "text" });

PostSchema.virtual("creator", {
  ref: collectionNames.USER,
  localField: "creatorId",
  foreignField: "_id",
  justOne: true,
});

const PostModel = model<IPost>(collectionNames.POST, PostSchema);
export default PostModel;
