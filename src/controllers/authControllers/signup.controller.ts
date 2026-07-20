import { Request, Response } from "express";
import { StoreService, UserService } from "../../services";
import { STATUS_CODES } from "../../constants/statusCodes";
import {
  AUTHENTICATION_MESSAGES,
  OTP_MESSAGES,
} from "../../constants/responseMessage";
import {
  BadRequestErrorResponse,
  ErrorResponse,
  NotFoundErrorResponse,
  printError,
  SuccessOKResponse,
  SuccessResponse,
} from "../../utils/responseHandler";
import { generateOTP } from "../../models/otp/otp.model";
import { sendMail } from "../../lib/mailer";
import {
  RESEND_SIGNUP_OTP_EMAIL_CONTENT,
  SIGNUP_EMAIL_CONTENT,
} from "../../constants/email";
import { JWT_TOKEN_EXPIRY } from "../../constants/auth";
import { generateJwtToken } from "../../utils/jwtHelper";
import {
  getOTPFromRedis,
  saveOnboardingUserToRedis,
  saveSignupOTPtoRedis,
  getRedisUser,
  clearRedisDB,
  deleteUserDataFromRedis,
  deleteOTPFromRedis,
  saveDeviceInfoToRedis,
  getDeviceInfoFromRedis,
} from "../../lib/redisOnboardingUser";
import bcrypt from "bcrypt";
import {
  IOnboardingRedisUser,
  MembershipLevel,
} from "../../models/user/user.type";
import UserModel from "../../models/user/user.schema";
import { admin } from "../../config/firebase";
import DeviceModel from "../../models/device/device.schema";
import { NODE_ENV, OTP_DEBUG } from "../../config/environment";

// We can user this API for signin and signup both as it creates user if not present
export const httpSignUpWithNumber = async (req: Request, res: Response) => {
  try {
    const { uuid, idToken, deviceInfo, phoneNumber: bodyPhone } = req.body;
    let phoneNumber: string | undefined;

    // Local/dev bypass: accept phoneNumber directly when Firebase SMS is unavailable
    if (
      NODE_ENV === "development" &&
      (!idToken || idToken === "DEV") &&
      bodyPhone
    ) {
      phoneNumber = bodyPhone;
    } else {
      const decoded = await admin.auth().verifyIdToken(idToken);
      phoneNumber = decoded.phone_number;
    }

    if (!phoneNumber) {
      return SuccessResponse(
        res,
        STATUS_CODES.OK,
        false,
        "Phone number not found from token"
      );
    }

    let existingUser = await UserService.getUserByPhoneNumber(phoneNumber);
    if (existingUser) {
      return SuccessResponse(
        res,
        STATUS_CODES.OK,
        false,
        "User with this phone number already exists",
        existingUser
      );
    }

    let redisUser = uuid
      ? await getRedisUser("uuid", uuid)
      : await getRedisUser("phone", phoneNumber);
    redisUser = {
      ...redisUser,
      uuid: redisUser?.uuid || uuid,
      phoneNumber,
      onboardingSteps: {
        emailVerified: redisUser?.onboardingSteps.emailVerified || false,
        phoneVerified: true,
      },
    };

    redisUser = await saveOnboardingUserToRedis(redisUser);
    if (deviceInfo) {
      // save device in redis
      const savedDevice = await saveDeviceInfoToRedis(
        redisUser.uuid,
        deviceInfo
      );
    }
    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Phone number saved successfully",
      redisUser
    );
  } catch (error) {
    printError(error, "httpSignUpWithNumber");
    return ErrorResponse(res);
  }
};

/**
 * Regular signup with email including OTP verification.
 * @param req
 * @param res
 * @returns
 */
export const httpSignupAndGetOTP = async (req: Request, res: Response) => {
  try {
    const { uuid, email } = req.body;

    // 1. check user in mongoDB, DB will have verified users only
    const existingUser = await UserService.getUserByEmail(email);
    if (existingUser) {
      return SuccessResponse(
        res,
        STATUS_CODES.OK,
        false,
        AUTHENTICATION_MESSAGES.USER_EXISTS,
        existingUser
      );
    }

    // 2. check user in redis - uuid for the case, when user has signed Up some times back
    let redisUser: Partial<IOnboardingRedisUser> | null = uuid
      ? await getRedisUser("uuid", uuid)
      : await getRedisUser("email", email);

    // 3. If redis user exists with this identifier verified, return (frontend will navigate to next step)
    if (redisUser) {
      const alreadyVerified = redisUser.onboardingSteps?.emailVerified;

      if (alreadyVerified) {
        return SuccessResponse(
          res,
          STATUS_CODES.OK,
          false,
          `Account with this email already exists!`,
          redisUser
        );
      }
    }

    // 4. Save new info (email or phoneNumber)
    redisUser = {
      ...redisUser,
      uuid: redisUser?.uuid || uuid,
      email: redisUser?.email || email || "",
      phoneNumber: redisUser?.phoneNumber || "",
    };

    // 5. Create OTP and save in redis
    const otp = generateOTP();
    const result = await Promise.allSettled([
      saveOnboardingUserToRedis(redisUser),
      saveSignupOTPtoRedis(email, otp),
    ]);

    if (result[0].status === "fulfilled") {
      redisUser = result[0].value; // This is user from saveOnboardingUserToRedis
    }

    // 6. Send OTP on email (Railway Hobby blocks SMTP — uses Resend HTTPS when configured)
    try {
      await sendMail(email, "Verify Your Account", SIGNUP_EMAIL_CONTENT(otp));
    } catch (mailError: any) {
      console.error("Signup OTP email failed:", mailError?.message || mailError);
      if (!OTP_DEBUG) {
        return ErrorResponse(
          res,
          STATUS_CODES.INTERNAL_SERVER_ERROR,
          false,
          "Failed to send OTP email. Please try again shortly."
        );
      }
      console.warn(`[OTP_DEBUG] signup OTP for ${email}: ${otp}`);
    }

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      `OTP sent successfully on email`,
      OTP_DEBUG ? { ...redisUser, debugOtp: otp } : redisUser
    );
  } catch (error) {
    printError(error, "httpSignupAndGetOTP");
    return ErrorResponse(res);
  }
};

/**
 * Following controller is for verifying OTP while signup.
 */
export const httpVerifySignupOTP = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    const otpDoc = await getOTPFromRedis(email, otp);
    if (!otpDoc) {
      return ErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        false,
        OTP_MESSAGES.INVALID
      );
    }

    const user = await getRedisUser("email", email);
    if (!user) {
      return NotFoundErrorResponse(res);
    }
    user.onboardingSteps.emailVerified = true;

    await Promise.allSettled([
      saveOnboardingUserToRedis(user),
      deleteOTPFromRedis(email),
    ]);
    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      OTP_MESSAGES.VERIFIED,
      user
    );
  } catch (error) {
    printError(error, "httpVerifySignupOTP");
    return ErrorResponse(res);
  }
};

/**
 * Controller to resend OTP for signup verification.
 * we get user email and check if user is already verified, if yes, we return an error.
 * we will delete the old OTP and generate a new one.
 * we will send the new OTP to the user's email.
 *
 * @param req
 * @param res
 * @returns
 */
export const httpResendSignupOTP = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await getRedisUser("email", email);
    if (!user) {
      return NotFoundErrorResponse(res);
    }

    const alreadyVerified = user.onboardingSteps.emailVerified;
    if (alreadyVerified) {
      return BadRequestErrorResponse(res, OTP_MESSAGES.USER_VERIFIED);
    }

    const otp = generateOTP();
    await saveSignupOTPtoRedis(email, otp);
    try {
      await sendMail(
        email,
        "Resend Verification OTP",
        RESEND_SIGNUP_OTP_EMAIL_CONTENT(otp)
      );
    } catch (mailError: any) {
      console.error("Resend OTP email failed:", mailError?.message || mailError);
      if (!OTP_DEBUG) {
        return ErrorResponse(
          res,
          STATUS_CODES.INTERNAL_SERVER_ERROR,
          false,
          "Failed to send OTP email. Please try again shortly."
        );
      }
      console.warn(`[OTP_DEBUG] resend OTP for ${email}: ${otp}`);
    }

    return SuccessOKResponse(
      res,
      OTP_DEBUG ? { debugOtp: otp } : null,
      OTP_MESSAGES.SUCCESS
    );
  } catch (error) {
    printError(error, "httpResendSignupOTP");
    return ErrorResponse(res);
  }
};

export const httpSaveUsernamePassword = async (req: Request, res: Response) => {
  const { uuid, username, password } = req.body;

  try {
    let redisUser = await getRedisUser("uuid", uuid);
    if (!redisUser) {
      return NotFoundErrorResponse(res, "Account not found");
    }

    if (!redisUser.onboardingSteps.phoneVerified) {
      return BadRequestErrorResponse(res, "Phone verification is pending");
    }

    if (!redisUser.onboardingSteps.emailVerified) {
      return BadRequestErrorResponse(res, "Email verification is pending");
    }

    const hash = await bcrypt.hash(password, 13);
    redisUser.password = hash;
    redisUser.username = username;
    redisUser = await saveOnboardingUserToRedis(redisUser);
    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Username and password saved successfully",
      {
        user: redisUser,
      }
    );
  } catch (error) {
    printError(error, "httpSaveUsernamePassword");
    return ErrorResponse(res);
  }
};

export const httpCompleteUserProfile = async (req: Request, res: Response) => {
  const { uuid, membership } = req.body;

  try {
    const redisUser = await getRedisUser("uuid", uuid);
    if (!redisUser) {
      return NotFoundErrorResponse(
        res,
        "Signup session expired. Please log in with your username and password."
      );
    }

    if (!redisUser.onboardingSteps.phoneVerified) {
      return BadRequestErrorResponse(res, "Phone verification is pending");
    }

    if (!redisUser.onboardingSteps.emailVerified) {
      return BadRequestErrorResponse(res, "Email verification is pending");
    }

    if (!redisUser.email || !redisUser.username || !redisUser.password) {
      return BadRequestErrorResponse(res, "Username or password not saved");
    }

    // Idempotent: account may already exist if complete-profile was called before
    let user =
      (await UserService.getUserByEmail(redisUser.email)) ||
      (await UserService.getUserByUsername(redisUser.username));

    if (!user) {
      const newUser = new UserModel({
        email: redisUser.email,
        phoneNumber: redisUser.phoneNumber,
        username: redisUser.username,
        password: redisUser.password,
        membership: membership,
        verified: true,
      });
      (newUser as any).isPasswordHashed = true;
      await newUser.save();
      user = newUser;

      const deviceInfo = await getDeviceInfoFromRedis(uuid);
      if (deviceInfo?.fcmToken) {
        await DeviceModel.create({
          ...deviceInfo,
          OSVersion: String(deviceInfo.OSVersion ?? ""),
          userId: user._id,
        });
      }

      if (membership === MembershipLevel.CREATOR) {
        await StoreService.createStore({
          ownerId: user._id,
          name: user.username,
        });
      }
    } else if (membership && user.membership !== membership) {
      user.membership = membership;
      await user.save();
      if (membership === MembershipLevel.CREATOR) {
        const existingStore = await StoreService.getStoreByOwnerId(user._id);
        if (!existingStore) {
          try {
            await StoreService.createStore({
              ownerId: user._id,
              name: user.username,
            });
          } catch (_) {
            // store may already exist
          }
        }
      }
    }

    await deleteUserDataFromRedis(redisUser);

    const token = generateJwtToken(
      { id: user?._id, email: user?.email },
      JWT_TOKEN_EXPIRY
    );

    const userResponse = user?.toObject();
    delete userResponse.password;
    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Profile completed successfully",
      {
        user: {
          ...userResponse,
          followersCount: 0,
          followingCount: 0,
        },
        token,
      }
    );
  } catch (error) {
    printError(error, "httpCompleteUserProfile");
    return ErrorResponse(res);
  }
};
