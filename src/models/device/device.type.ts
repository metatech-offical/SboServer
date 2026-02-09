import { ObjectId } from "mongoose";
import { EPlatformType } from "../../types/enum";

export interface IDevice extends Document {
  platform: EPlatformType;
  OSVersion?: string;
  active: boolean;
  userId?: ObjectId;
  fcmToken: string;
  createdAt: Date;
  updatedAt: Date;
}
