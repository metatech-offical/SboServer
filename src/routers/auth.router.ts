import { Router } from "express";
import { validator } from "../middlewares/validator";
import {
  checkUsernameValidator,
  completeProfileSchema,
  forgotPasswordSchema,
  loginSchema,
  resendOTPSchema,
  resetPasswordSchema,
  saveUsernamePasswordSchema,
  signupSchema,
  verifyOTPSchema,
} from "../validators/auth.validator";
import { SignupController, AuthController } from "../controllers/";
import { authLimiter, otpLimiter, otpVerifyLimiter } from "../middlewares/rateLimit";

const authRouter = Router();

// Signup
authRouter.post(
  "/signup/email",
  otpLimiter,
  validator.body(signupSchema),
  SignupController.httpSignupAndGetOTP
);

authRouter.post(
  "/signup/phone",
  SignupController.httpSignUpWithNumber
);

authRouter.post(
  "/signup/resend-otp",
  otpLimiter,
  validator.body(resendOTPSchema),
  SignupController.httpResendSignupOTP
);

authRouter.post(
  "/verify-signup-otp",
  otpVerifyLimiter,
  validator.body(verifyOTPSchema),
  SignupController.httpVerifySignupOTP
);

authRouter.post(
  "/check-username",
  validator.body(checkUsernameValidator),
  AuthController.httpCheckUsernameExists
);

authRouter.post(
  "/save/username-password",
  validator.body(saveUsernamePasswordSchema.body),
  SignupController.httpSaveUsernamePassword
);

authRouter.post(
  "/login/complete-profile",
  validator.body(completeProfileSchema.body),
  SignupController.httpCompleteUserProfile
);

// login
authRouter.post("/login", authLimiter, validator.body(loginSchema), AuthController.httpLogin); //login via email or username

// Reset password flow
authRouter.post(
  "/forgot-password/send-otp",
  otpLimiter,
  validator.body(forgotPasswordSchema),
  AuthController.httpSendForgotPasswordOTP
);

authRouter.post(
  "/forgot-password/verify-otp",
  otpVerifyLimiter,
  validator.body(verifyOTPSchema),
  AuthController.httpVerifyForgotPasswordOTP
);

authRouter.post(
  "/reset-password",
  otpVerifyLimiter,
  validator.body(resetPasswordSchema),
  AuthController.httpResetPassword
);

// logout
authRouter.post("/logout", AuthController.httpLogout);

export default authRouter;
