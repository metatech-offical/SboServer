import { Schema, model, Types } from "mongoose";
import { EPlatformType } from "../../types/enum";
import { IDevice } from "./device.type";
import { collectionNames } from "../../constants/collectionNames";

const DeviceSchema = new Schema<IDevice>(
  {
    platform: {
      type: String,
      enum: Object.values(EPlatformType),
      required: true,
    },
    OSVersion: { type: String, required: false },
    active: { type: Boolean, default: true },
    userId: { type: Types.ObjectId, ref: collectionNames.USER, required: true },
    fcmToken: { type: String, required: true },
  },
  { timestamps: true }
);

const DeviceModel = model<IDevice>(collectionNames.DEVICE, DeviceSchema);

export default DeviceModel;
