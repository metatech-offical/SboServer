import { printError } from "../../utils/responseHandler";
import DeviceModel from "./device.schema";
import { IDevice } from "./device.type";

export const getFcmTokenById = async (
  userId: string
): Promise<IDevice | null> => {
  return DeviceModel.findById(userId).populate("fcmToken");
};

/**
 * Following function is responsible for registering the device
 */
export const registerDevice = async ({
  userId,
  fcmToken,
  platform,
  OSVersion,
}: {
  userId: string;
  fcmToken: string;
  platform: string;
  OSVersion?: string;
}): Promise<void> => {
  try {
    await DeviceModel.updateMany({ fcmToken }, { active: false });

    await DeviceModel.findOneAndUpdate(
      { userId, fcmToken },
      { platform, OSVersion, active: true },
      { upsert: true, new: true }
    );
  } catch (error) {
    printError(error, "registerDevice");
  }
};
