import { Schema, model, Types } from "mongoose";
import { collectionNames, EContentType } from "../../constants/collectionNames";

export interface IComment extends Document {
  user: Schema.Types.ObjectId;
  creatorId: Schema.Types.ObjectId;
  contentType: EContentType;
  contentId: Schema.Types.ObjectId;
  commentText: string;
  parentId?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    user: { type: Types.ObjectId, ref: collectionNames.USER, required: true },
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
    creatorId: {
      type: Types.ObjectId,
      ref: collectionNames.USER,
      required: true,
    },
    commentText: { type: String, required: true },
    parentId: {
      type: Types.ObjectId,
      ref: collectionNames.CONTENT_COMMENTS,
      default: null,
    },
  },
  { timestamps: true }
);

const PostCommentModel = model<IComment>(
  collectionNames.CONTENT_COMMENTS,
  CommentSchema
);

export default PostCommentModel;
