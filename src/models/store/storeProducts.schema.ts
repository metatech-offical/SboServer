import { Collection, Schema, model } from "mongoose";
import { IStoreProduct, IVariant, PRODUCT_STATUS } from "./store.types";
import { collectionNames } from "../../constants/collectionNames";

// attributes can be like e.g., { size: "M", color: "Red" }
const variantSchema = new Schema<IVariant>(
  {
    size: {
      type: String,
      required: true,
      // unique: true,
      sparse: true,
    },
    stock: { type: Number, required: true },
    sku: { type: String, required: true },
    price: { type: Number, required: true },
    color: { type: String, required: false },
  },
  { _id: false }
);

const storeProductSchema = new Schema<IStoreProduct>(
  {
    productName: { type: String, required: true, maxlength: 100 },
    description: { type: String, maxlength: 2000 },
    price: { type: Number, required: true },
    media: [{ type: String, required: true }],
    storeId: {
      type: Schema.Types.ObjectId,
      ref: collectionNames.STORE,
      required: true,
    },
    collectionId: {
      type: Schema.Types.ObjectId,
      ref: "StoreCollection",
      required: true,
    },

    sku: { type: String, unique: true, sparse: true },
    tags: [{ type: String }],
    category: { type: String, required: true },
    returnPolicy: { type: String },
    stock: { type: Number, required: false, default: 0 }, // Used ONLY if no variants
    hasVariants: { type: Boolean, default: false },
    variants: [variantSchema],
    status: {
      type: String,
      enum: Object.values(PRODUCT_STATUS),
      default: "draft",
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

storeProductSchema.virtual("store", {
  ref: collectionNames.STORE,
  localField: "storeId",
  foreignField: "_id",
  justOne: true,
});

storeProductSchema.index({ storeId: 1, status: 1 });
storeProductSchema.index({ collectionId: 1, category: 1 });
storeProductSchema.index({ tags: 1 });
storeProductSchema.index({ productName: "text" });

export const StoreProduct = model<IStoreProduct>(
  "StoreProduct",
  storeProductSchema
);
