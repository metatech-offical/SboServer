import { Schema, model, Types, Document } from "mongoose";
import { EReportReason, EReportStatus } from "../../types/enum";
import { collectionNames, EContentType } from "../../constants/collectionNames";

export interface IReport extends Document {
  contentType: EContentType;
  contentId: Schema.Types.ObjectId;
  reporter: Types.ObjectId;
  reason: EReportReason;
  description?: string;
  status: EReportStatus;
  adminFeedback?: string;
  reviewedBy?: Schema.Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
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
    reporter: {
      type: Schema.Types.ObjectId,
      ref: collectionNames.USER,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      enum: Object.values(EReportReason),
    },
    description: { type: String },
    status: {
      type: String,
      enum: Object.values(EReportStatus),
      default: EReportStatus.PENDING,
      required: true,
    },
    adminFeedback: { type: String },
    reviewedBy: { type: Types.ObjectId, ref: collectionNames.USER },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

ReportSchema.index(
  { reporter: 1, contentId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: EReportStatus.PENDING },
  }
);

const Report = model<IReport>(collectionNames.REPORT, ReportSchema);

export default Report;
