import mongoose, { Schema, Document, Types } from "mongoose";
import { collectionNames } from "../../constants/collectionNames";

// User address TS interface (optional)
export interface IUserAddress extends Document {
  userId: Types.ObjectId;
  fullName: string;
  mobileNumber: string;
  countryCode: string;
  streetNo?: string;
  location?: { lat: number; lng: number }; // lat/lng only
  buildingName: string;
  city: string;
  areaDistrict: string;
  landmark?: string;
  addressType: "home" | "office" | "other";
  createdAt: Date;
  updatedAt: Date;
}

const userAddressSchema = new Schema<IUserAddress>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: collectionNames.USER,
      required: true,
    },
    fullName: { type: String, required: true, trim: true },
    mobileNumber: { type: String, required: true, trim: true },
    countryCode: { type: String, required: true, trim: true },
    streetNo: { type: String, trim: true },
    location: {
      lat: { type: Number, required: false },
      lng: { type: Number, required: false },
    },
    buildingName: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    areaDistrict: { type: String, required: true, trim: true },
    landmark: { type: String, trim: true },
    addressType: {
      type: String,
      enum: ["home", "office", "other"],
      required: true,
      default: "home",
    },
  },
  { timestamps: true }
);

userAddressSchema.index({ userId: 1 });

const UserAddressModel = mongoose.model<IUserAddress>(
  collectionNames.USER_ADDRESSES,
  userAddressSchema
);

export default UserAddressModel;
