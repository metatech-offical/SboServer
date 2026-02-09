import { Request, Response } from "express";
import bcrypt from "bcrypt";
import OTP from "../../models/otp/otp.schema";
import { generateOTP } from "../../models/otp/otp.model";
import { sendMail } from "../../lib/mailer";
import { STATUS_CODES } from "../../constants/statusCodes";
import {
  AUTHENTICATION_MESSAGES,
  MESSAGES,
} from "../../constants/responseMessage";
import {
  ErrorResponse,
  NotFoundErrorResponse,
  printError,
  SuccessResponse,
  UnauthorizedErrorResponse,
} from "../../utils/responseHandler";
import Device from "../../models/device/device.schema";
import { registerDevice } from "../../models/device/device.model";
import { JWT_TOKEN_EXPIRY } from "../../constants/auth";
import { UserService, UserFollowService } from "../../services";
import { generateJwtToken } from "../../utils/jwtHelper";
import { RESET_PASSWORD_EMAIL_CONTENT } from "../../constants/email";
import { IUser } from "../../models/user/user.type";
import logger from "../../config/logger";

/**
 * Function to handle user logout.
 * We delete the device token from the database for the user.
 * @param req
 * @param res
 * @returns
 */
export const httpLogout = async (req: Request, res: Response) => {
  try {
    const { userId, fcmToken } = req.body;
    const response = await Device.findOneAndDelete({ userId, fcmToken });
    if (!response) {
      return UnauthorizedErrorResponse(res);
    }

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      AUTHENTICATION_MESSAGES.LOGOUT_SUCCESS,
      userId
    );
  } catch (error) {
    return ErrorResponse(res);
  }
};

export const httpSendForgotPasswordOTP = async (
  req: Request,
  res: Response
) => {
  try {
    const { email } = req.body;

    const user = await UserService.getUserByEmail(email);
    if (!user) {
      return NotFoundErrorResponse(res);
    }

    const otp = generateOTP();
    await OTP.create({ email, otp });

    const emailContent = RESET_PASSWORD_EMAIL_CONTENT(otp, user.username);
    try {
      await sendMail(email, "Password Reset OTP", emailContent);
    } catch (emailError) {
      logger.error(`Failed to send OTP email to ${email}`, emailError);
    }

    res.status(200).json({ success: true, message: "OTP sent successfully" });
  } catch (err) {
    printError(err, "httpSendForgotPasswordOTP");
    return ErrorResponse(res);
  }
};

export const httpVerifyForgotPasswordOTP = async (
  req: Request,
  res: Response
) => {
  try {
    const { email, otp } = req.body;
    const otpDoc = await OTP.findOne({ email, otp });
    if (!otpDoc) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired OTP" });
    }

    // Don't delete OTP here - it will be deleted after password reset
    // OTP has TTL index so it will auto-expire in 5 minutes
    res
      .status(200)
      .send({ success: true, message: "OTP verified successfully" });
  } catch (err) {
    printError(err, "httpVerifyForgotPasswordOTP");
    return ErrorResponse(res);
  }
};

export const httpResetPassword = async (req: Request, res: Response) => {
  try {
    const { email, newPassword } = req.body;

    const user = await UserService.getUserByEmail(email);
    if (!user) {
      return NotFoundErrorResponse(res);
    }

    // Hash the password before saving (CRITICAL FIX - was storing plaintext before)
    const hashedPassword = await bcrypt.hash(newPassword, 13);
    user.password = hashedPassword;
    await user.save();

    // Clean up any remaining OTPs for this email
    await OTP.deleteMany({ email });

    logger.info(`Password reset successful for user: ${email}`);

    res
      .status(STATUS_CODES.OK)
      .json({ success: true, message: "Password reset successfully" });
  } catch (err) {
    printError(err, "httpResetPassword");
    return ErrorResponse(res);
  }
};

/**
 * Login controller function to handle user login with username as well as email.
 * @param  req We accept login credentials.
 * @param  res HTTP response object used to send the response back to the client.
 * @returns
 */
export const httpLogin = async (req: Request, res: Response) => {
  try {
    const { loginIdentifier, password, deviceInfo } = req.body;

    if (!loginIdentifier || !password) {
      return ErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        false,
        MESSAGES.INVALID_INPUT
      );
    }

    const user =
      (await UserService.getUserByEmail(loginIdentifier)) ||
      (await UserService.getUserByUsername(loginIdentifier)) ||
      (await UserService.getUserByPhoneNumber(loginIdentifier));

    if (!user) {
      return NotFoundErrorResponse(res, "User not found");
    }

    const isPasswordValid = await user.verifyPassword(password);
    if (!isPasswordValid) {
      return UnauthorizedErrorResponse(res, AUTHENTICATION_MESSAGES.WRONG_PASS);
    }

    if (deviceInfo) {
      await registerDevice({
        userId: user?._id,
        ...deviceInfo,
      });
    }

    const token = generateJwtToken(
      { id: user._id, email: user.email },
      JWT_TOKEN_EXPIRY
    );
    const followersCount = await UserFollowService.getFollowersCount(user._id);
    const followingCount = await UserFollowService.getFollowingCount(user._id);
    const userResponse = user.toObject();
    delete userResponse.password;

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      AUTHENTICATION_MESSAGES.LOGIN_ACCOUNT,
      {
        user: {
          ...userResponse,
          followersCount,
          followingCount,
          fcmToken: deviceInfo?.fcmToken,
        },
        token,
      }
    );
  } catch (error) {
    printError(error, "httpLogin");
    return ErrorResponse(res);
  }
};

/**
 * Controller function to check username availability.
 * @param req
 * @param res
 * @returns
 */
export const httpCheckUsernameExists = async (req: Request, res: Response) => {
  const { username } = req.body;
  try {
    const exists = await UserService.checkUsernameExists(username);
    if (exists) {
      return SuccessResponse<boolean>(
        res,
        STATUS_CODES.OK,
        false,
        "Username is already taken!",
        false
      );
    }
    return SuccessResponse<boolean>(
      res,
      STATUS_CODES.OK,
      true,
      "Username is available",
      true
    );
  } catch (error) {
    printError(error, "httpCheckUsernameExists");
    return ErrorResponse<boolean>(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};
