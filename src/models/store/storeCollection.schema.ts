import { Schema, model, Document, Types, Collection } from "mongoose";
import { IStoreCollection } from "./store.types";
import { collectionNames } from "../../constants/collectionNames";

const storeCollectionSchema = new Schema<IStoreCollection>(
  {
    name: { type: String, required: true, maxlength: 100 },
    description: { type: String, maxlength: 500 },
    tags: [{ type: String }],
    coverImage: { type: String }, // optional
    store: {
      type: Schema.Types.ObjectId,
      ref: collectionNames.STORE,
      required: true,
    },
  },
  { timestamps: true }
);

// Optional: unique index to prevent duplicate collection names per store
storeCollectionSchema.index({ store: 1, name: 1 }, { unique: true });

export const StoreCollection = model<IStoreCollection>(
  "StoreCollection",
  storeCollectionSchema
);
