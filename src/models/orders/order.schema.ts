import mongoose, { Schema, Types } from "mongoose";
import { collectionNames } from "../../constants/collectionNames";
import { EOrderStatus, IOrder } from "./order.types";

const orderAddressSchema = new Schema(
  {
    fullName: { type: String, required: true },
    mobileNumber: { type: String, required: true },
    countryCode: { type: String, required: true },
    streetNo: { type: String },
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },
    buildingName: { type: String, required: true },
    city: { type: String, required: true },
    areaDistrict: { type: String, required: true },
    landmark: { type: String },
    addressType: {
      type: String,
      enum: ["home", "office", "other"],
      required: true,
      default: "home",
    },
  },
  { _id: false }
);

const orderItemSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: collectionNames.STORE,
      required: true,
    },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    media: [{ type: String, required: true }],
    variant: {
      size: { type: String },
      color: { type: String },
      price: { type: Number, required: false },
    },
    quantity: { type: Number, required: true },
    itemPrice: { type: Number, required: true },
    lineTotal: { type: Number, required: true },
  },
  { _id: false }
);

//for now payment id is not required and not uniue
const paymentInfoSchema = new Schema(
  {
    paymentId: { type: String, required: true },
    provider: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "success", "failed"], //TODO: refund
      required: true,
    },
    paidAt: { type: Date },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: collectionNames.USER,
      required: true,
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: collectionNames.STORE,
      required: true,
    },
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: collectionNames.USER,
      required: true,
    },
    address: { type: orderAddressSchema, required: true },
    items: { type: [orderItemSchema], required: true },
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: EOrderStatus,
      default: EOrderStatus.PENDING,
    },
    payment: { type: paymentInfoSchema, required: true },
    trackingLink: { type: String },
    reservedUntil: { type: Date },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

orderSchema.index({ userId: 1, storeId: 1, status: 1 });
orderSchema.virtual("creator", {
  ref: collectionNames.USER,
  localField: "creatorId",
  foreignField: "_id",
  justOne: true,
});

orderSchema.virtual("user", {
  ref: collectionNames.USER,
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});
const OrderModel = mongoose.model<IOrder>(collectionNames.ORDER, orderSchema);

export default OrderModel;
