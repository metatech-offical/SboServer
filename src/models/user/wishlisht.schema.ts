import { Schema, model } from "mongoose";
import { IWishlist } from "./user.type";

const wishlistSchema = new Schema<IWishlist>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "StoreProduct",
      required: true,
    },
  },
  { timestamps: true }
);

wishlistSchema.index({ userId: 1, productId: 1 }, { unique: true });

export const Wishlist = model<IWishlist>("Wishlist", wishlistSchema);
