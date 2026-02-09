import { Schema, model } from "mongoose";
import { collectionNames } from "../../constants/collectionNames";

const otpSchema = new Schema(
  {
    email: { type: String, required: true },
    otp: { type: String, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Add TTL index manually
otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 300 });

const OTP = model(collectionNames.OTP, otpSchema);
export default OTP;
