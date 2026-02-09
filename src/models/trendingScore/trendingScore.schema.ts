import { Schema, model, Types } from "mongoose";
import { collectionNames, EContentType } from "../../constants/collectionNames";

export interface ITrendingScore {
  contentId: Schema.Types.ObjectId;
  contentType: EContentType.SHORT | EContentType.STREAM;
  trendingScore: number;
}

const TrendingScoreSchema = new Schema<ITrendingScore>({
  contentType: {
    type: String,
    enum: [EContentType.SHORT, EContentType.STREAM],
    required: true,
  },
  contentId: {
    type: Types.ObjectId,
    refPath: "contentType",
    required: true,
  },
  trendingScore: {
    type: Number,
    required: true,
    default: 0,
  },
});

TrendingScoreSchema.index({ trendingScore: -1 });

const TrendingScoreModel = model<ITrendingScore>(
  collectionNames.TREDNING_SCORES,
  TrendingScoreSchema
);

export default TrendingScoreModel;
