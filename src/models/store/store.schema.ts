import { Schema, model } from "mongoose";
import { IStore } from "./store.types";
import { collectionNames } from "../../constants/collectionNames";

const storeSchema = new Schema<IStore>(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: collectionNames.USER,
      required: true,
      unique: true,
    },
    name: { type: String, required: true }, //default creator name
    bio: { type: String },
    logo: { type: String },
    banner: { type: String },
    collectionsCount: { type: Number, default: 0 },
    totalProducts: { type: Number, default: 0 },
    liveProducts: { type: Number, default: 0 },
    outOfStockProducts: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    globalReturnPolicy: { type: String },
  },
  {
    timestamps: true,
  }
);

storeSchema.index({ owner: 1, isActive: 1 });

export const Store = model<IStore>(collectionNames.STORE, storeSchema);
