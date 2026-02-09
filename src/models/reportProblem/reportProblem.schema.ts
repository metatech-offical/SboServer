import { Document, Schema, Types, model } from "mongoose";
import { collectionNames } from "../../constants/collectionNames";

export interface IReportProblem extends Document {
  user: Types.ObjectId;
  category: string;
  message: string;
  images: string[];
  timestamp: Date;
}
const reportProblemSchema = new Schema<IReportProblem>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  category: { type: String, required: true },
  message: { type: String, required: true },
  images: { type: [String], maxlength: 5 },
  timestamp: { type: Date, default: Date.now },
});

const ReportProblemModel = model<IReportProblem>(
  collectionNames.REPORT_PROBLEM,
  reportProblemSchema
);

export default ReportProblemModel;
