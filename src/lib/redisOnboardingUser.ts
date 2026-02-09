import redisClient from "../config/redis";
import { IOnboardingRedisUser } from "../models/user/user.type";
import { v4 as uuidv4 } from "uuid";

const TTL = 60 * 60; // 1 hour TTL for onboarding user data
const OTP_TTL = 60 * 10; // 10 mins TTL for OTPs

export const saveDeviceInfoToRedis = async (uuid: string, deviceInfo: any) => {
  if (!uuid || !deviceInfo) return;
  const key = `device:uuid:${uuid}`;
  const savedDevice = await redisClient.setEx(
    key,
    TTL,
    JSON.stringify(deviceInfo)
  );
  return savedDevice;
};

export const getDeviceInfoFromRedis = async (
  uuid: string
): Promise<any | null> => {
  if (!uuid) return null;
  const key = `device:uuid:${uuid}`;
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
};

export const saveOnboardingUserToRedis = async (
  user: Partial<IOnboardingRedisUser>
) => {
  if (!user.uuid || user.uuid.trim() === "") {
    const uuid = uuidv4();
    user.uuid = uuid;
  }

  const fullUser: IOnboardingRedisUser = {
    uuid: user.uuid,
    email: user.email || "",
    phoneNumber: user.phoneNumber || "",
    onboardingSteps: {
      emailVerified: user.onboardingSteps?.emailVerified || false,
      phoneVerified: user.onboardingSteps?.phoneVerified || false,
    },
    username: user.username || "",
    password: user.password || "",
  };
  const value = JSON.stringify(fullUser);
  const keys: string[] = [`signup:uuid:${fullUser.uuid}`];

  if (fullUser.email) keys.push(`signup:email:${fullUser.email}`);
  if (fullUser.phoneNumber) keys.push(`signup:phone:${fullUser.phoneNumber}`);

  await Promise.all(keys.map((key) => redisClient.setEx(key, TTL, value)));
  return fullUser;
};

export const getRedisUser = async (
  keyType: "uuid" | "email" | "phone",
  value: string
): Promise<IOnboardingRedisUser | null> => {
  const data = await redisClient.get(`signup:${keyType}:${value}`);
  return data ? (JSON.parse(data) as IOnboardingRedisUser) : null;
};

// loginIdentifier can be email or phoneNumber
export const saveSignupOTPtoRedis = async (
  loginIdentifier: string,
  otp: string
) => {
  const key = `signupOTP:${loginIdentifier}`;

  // Delete any previous OTP first
  await redisClient.del(key);

  // Save the new OTP with expiry
  return await redisClient.setEx(
    `signupOTP:${loginIdentifier}`,
    OTP_TTL,
    JSON.stringify({ otp })
  );
};

export const getOTPFromRedis = async (loginIdentifier: string, otp: string) => {
  const data = await redisClient.get(`signupOTP:${loginIdentifier}`);
  if (!data) return null;
  const parsed = JSON.parse(data);
  return parsed.otp === otp ? parsed : null;
};

export const deleteUserDataFromRedis = async (user: IOnboardingRedisUser) => {
  const keys: string[] = [];

  if (!user) return;

  // Device Info
  if (user.uuid) keys.push(`device:uuid:${user.uuid}`);

  // Onboarding User Info
  if (user.uuid) keys.push(`signup:uuid:${user.uuid}`);
  if (user.email) keys.push(`signup:email:${user.email}`);
  if (user.phoneNumber) keys.push(`signup:phone:${user.phoneNumber}`);

  // OTP
  if (user.email) keys.push(`signupOTP:${user.email}`);

  // Delete all relevant keys from Redis
  if (keys.length > 0) {
    await Promise.all(keys.map((key) => redisClient.del(key)));
  }
};

export const deleteOTPFromRedis = async (email: string) => {
  await redisClient.del(`signupOTP:${email}`);
};

export const clearRedisDB = async () => {
  await redisClient.flushAll();
};
