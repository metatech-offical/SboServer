import {
  PASSWORD_LENGTH,
  PASSWORD_REGEX,
  USERNAME_LENGTH,
  USERNAME_REGEX,
} from "../constants/auth";
import { Joi } from "../middlewares/validator";
import { MembershipLevel } from "../models/user/user.type";

export const signupSchema = Joi.object({
  email: Joi.string().email().optional().allow(""),
  phoneNumber: Joi.string().optional().allow(""),
  uuid: Joi.string().optional(),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

export const resendOTPSchema = Joi.object({
  email: Joi.string().email().optional().allow(""),
  phoneNumber: Joi.string().optional().allow(""),
});

export const verifyOTPSchema = Joi.object({
  email: Joi.string().email().optional().allow(""),
  phoneNumber: Joi.string().optional().allow(""),
  otp: Joi.string().length(4).required(),
});

export const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
  newPassword: Joi.string()
    .pattern(PASSWORD_REGEX)
    .min(PASSWORD_LENGTH.MIN)
    .max(PASSWORD_LENGTH.MAX)
    .required(),
});

export const loginSchema = Joi.object({
  loginIdentifier: Joi.string().required().messages({
    "string.empty": "Email, username, or phone number is required",
    "any.required": "Email, username, or phone number is required",
  }),
  password: Joi.string().required().messages({
    "string.empty": "Password is required",
    "any.required": "Password is required",
  }),
  deviceInfo: Joi.object().optional().unknown(true),
}).unknown(true); // Allow additional fields for backward compatibility

export const completeProfileSchema = {
  body: Joi.object({
    uuid: Joi.string().required().label("UUID").messages({
      "any.invalid": "UUID must be valid.",
    }),
    membership: Joi.string()
      .valid(...Object.values(MembershipLevel))
      .required(),
  }),
};

export const saveUsernamePasswordSchema = {
  body: Joi.object({
    uuid: Joi.string().required().label("UUID").messages({
      "any.invalid": "UUID must be valid.",
    }),
    username: Joi.string()
      .pattern(USERNAME_REGEX)
      .min(USERNAME_LENGTH.MIN)
      .max(USERNAME_LENGTH.MAX)
      .required(),
    password: Joi.string()
      .pattern(PASSWORD_REGEX)
      .min(PASSWORD_LENGTH.MIN)
      .max(PASSWORD_LENGTH.MAX)
      .required(),
  }),
};

export const checkUsernameValidator = Joi.object({
  username: Joi.string()
    .pattern(USERNAME_REGEX)
    .min(USERNAME_LENGTH.MIN)
    .max(USERNAME_LENGTH.MAX)
    .required()
    .messages({
      "string.pattern.base":
        "Username can only contain letters, numbers, dots (.), hyphens (-), or underscores (_). It must not start or end with a dot, hyphen, or underscore and cannot contain restricted characters like @, #, $, %, ^, &, *, !, or ~.",
      "string.empty": "Username cannot be empty.",
      "string.min": "Username must be at least 3 characters long.",
      "string.max": "Username cannot exceed 30 characters.",
      "any.required": "Username is required.",
    }),
});
