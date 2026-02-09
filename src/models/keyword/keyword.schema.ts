import { Schema, Types, model } from "mongoose";
import { collectionNames } from "../../constants/collectionNames";

export interface IKeyword {
  count: number;
  keyword: string;
  userId: Schema.Types.ObjectId;
}

const keywordSchema = new Schema<IKeyword>({
  keyword: { type: String, required: true },
  count: { type: Number, default: 1 },
  userId: { type: Types.ObjectId, ref: collectionNames.USER, required: true },
});
keywordSchema.index({ userId: 1, keyword: 1 }, { unique: true });
const KeywordModel = model<IKeyword>(collectionNames.KEYWORD, keywordSchema);

export default KeywordModel;
