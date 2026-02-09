import { Schema, model, Document } from "mongoose";

export interface IUploadSession extends Document {
  userId: string;
  key: string;
  uploadId: string;
  status: "pending" | "completed" | "aborted";
  createdAt: Date;
  updatedAt: Date;
}

const UploadSessionSchema = new Schema<IUploadSession>(
  {
    userId: { type: String, required: true },
    key: { type: String, required: true },
    uploadId: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "completed", "aborted"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export const UploadSessionModel = model<IUploadSession>(
  "UploadSession",
  UploadSessionSchema
);
