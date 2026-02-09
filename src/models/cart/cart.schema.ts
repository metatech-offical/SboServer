import { Schema, Types } from "mongoose";
import mongoose from "mongoose";
import { ICart, ICartItem, ICartVariant } from "./cart.types";
import { collectionNames } from "../../constants/collectionNames";

const cartVariantSchema = new Schema<ICartVariant>(
  {
    size: { type: String, required: false },
    color: { type: String, default: "", required: false }, // optional
    sku: { type: String, required: true },
    price: { type: Number, required: true },
  },
  { _id: false }
);

const cartItemSchema = new Schema<ICartItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "StoreProduct",
      required: true,
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: "stores",
      required: true,
    },
    variant: { type: cartVariantSchema, required: true },
    quantity: { type: Number, default: 1, min: 1 },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);
const cartSchema = new Schema<ICart>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    items: [cartItemSchema],
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// cartSchema.index({ userId: 1 }, { unique: true });

const CartModel = mongoose.model<ICart>(collectionNames.CART, cartSchema);
export default CartModel;
