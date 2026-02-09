import { Joi } from "../middlewares/validator";
import { MembershipLevel } from "../models/user/user.type";
import { validateMongoObjectId } from "../utils/joiHelper";
import { EProfileQueryType } from "../types/enum";

export const userIdValidator = Joi.object({
  userId: Joi.string().custom(validateMongoObjectId).required().messages({
    "any.required": "User ID is required",
    "any.invalid": "Invalid user ID format",
  }),
});

export const blockUserValidator = Joi.object({
  blockedId: Joi.string().custom(validateMongoObjectId).required().messages({
    "any.required": "Blocked ID is required",
    "any.invalid": "Invalid blocked ID format",
  }),
  action: Joi.string().valid("block", "unblock").required().messages({
    "any.only": "Action must be either 'block' or 'unblock'",
    "any.required": "Action is required",
  }),
});

export const userMembershipValidator = Joi.object({
  membership: Joi.string().valid(...Object.values(MembershipLevel)),
});

export const followUserValidator = Joi.object({
  targetUserId: Joi.string().required(),
});
export const favoriteCreatorsValidator = Joi.object({
  limit: Joi.number().integer().min(1).max(50).default(10).messages({
    "number.base": "Limit must be a number",
    "number.integer": "Limit must be an integer",
    "number.min": "Limit must be at least 1",
    "number.max": "Limit cannot exceed 50",
  }),
  page: Joi.number().integer().min(1).default(1).messages({
    "number.base": "Page number must be a number",
    "number.integer": "Page number must be an integer",
    "number.min": "Page number cannot be negative",
  }),
});

export const userNotificationSettingsValidator = Joi.object({
  notifications: Joi.object().pattern(Joi.string(), Joi.boolean()).optional(),
});

export const creatorProfileSettingsValidator = Joi.object({
  username: Joi.string().optional().messages({
    "string.empty": "Username is required.",
    "any.required": "Username is a mandatory field.",
  }),
  displayName: Joi.string().optional().messages({
    "string.empty": "Display name is required.",
    "any.required": "Display name is a mandatory field.",
  }),
  bio: Joi.string().optional().messages({
    "string.empty": "Bio is required.",
    "any.required": "Bio is a mandatory field.",
  }),
});

export const updatePostSettingsValidator = Joi.object({
  postVisibility: Joi.string()
    .valid("followers", "everyone", "subscribers", "none")
    .optional()
    .messages({
      "any.only": "Invalid post visibility value.",
    }),
  liveVisibility: Joi.string()
    .valid("followers", "everyone", "subscribers", "none")
    .optional()
    .messages({
      "any.only": "Invalid live visibility value.",
    }),
  liveVideoPricing: Joi.object({
    currency: Joi.string().valid("USD", "INR").required().messages({
      "any.only": "Currency must be either USD or INR.",
    }),
    price: Joi.number().min(0).required().messages({
      "number.base": "Price must be a valid number.",
      "number.min": "Price must be greater than or equal to 0.",
    }),
  }).optional(),
});

export const deleteUserValidator = Joi.object({
  category: Joi.string().required().messages({
    "string.empty": "Category is required.",
    "any.required": "Category is a mandatory field.",
  }),
  reason: Joi.string().required().messages({
    "string.empty": "Reason is required.",
    "any.required": "Reason is a mandatory field.",
  }),
});

export const userProfileQueryValidator = Joi.object({
  page: Joi.number().integer().min(0).default(1).messages({
    "number.base": "Page must be a number",
    "number.integer": "Page must be an integer",
    "number.min": "Page cannot be negative",
  }),
  limit: Joi.number().integer().min(1).max(50).default(10).messages({
    "number.base": "Limit must be a number",
    "number.integer": "Limit must be an integer",
    "number.min": "Limit must be at least 1",
    "number.max": "Limit cannot exceed 50",
  }),
  type: Joi.string()
    .valid(...Object.values(EProfileQueryType))
    .default(EProfileQueryType.HOME)
    .messages({
      "any.only": "Invalid profile query type",
    }),
  search: Joi.string().optional().allow(""),
});

export const followersListValidator = Joi.object({
  userId: Joi.string().custom(validateMongoObjectId).optional().messages({
    "any.invalid": "Invalid user ID format",
  }),
  page: Joi.number().integer().min(1).default(1).messages({
    "number.base": "Page must be a number",
    "number.integer": "Page must be an integer",
    "number.min": "Page must be at least 1",
  }),
  limit: Joi.number().integer().min(1).max(50).default(10).messages({
    "number.base": "Limit must be a number",
    "number.integer": "Limit must be an integer",
    "number.min": "Limit must be at least 1",
    "number.max": "Limit cannot exceed 50",
  }),
});

export const followingListValidator = Joi.object({
  userId: Joi.string().custom(validateMongoObjectId).optional().messages({
    "any.invalid": "Invalid user ID format",
  }),
  page: Joi.number().integer().min(1).default(1).messages({
    "number.base": "Page must be a number",
    "number.integer": "Page must be an integer",
    "number.min": "Page must be at least 1",
  }),
  limit: Joi.number().integer().min(1).max(50).default(10).messages({
    "number.base": "Limit must be a number",
    "number.integer": "Limit must be an integer",
    "number.min": "Limit must be at least 1",
    "number.max": "Limit cannot exceed 50",
  }),
});

export const createUserAddressSchema = {
  body: Joi.object({
    fullName: Joi.string().max(100).required(),
    mobileNumber: Joi.string().max(20).required(),
    countryCode: Joi.string().max(8).required(),
    streetNo: Joi.string().max(100).optional().allow(""),
    location: Joi.object({
      lat: Joi.number().optional(),
      lng: Joi.number().optional(),
    }).optional(),
    buildingName: Joi.string().max(100).required(),
    city: Joi.string().max(100).required(),
    areaDistrict: Joi.string().max(100).required(),
    landmark: Joi.string().max(100).optional().allow(""),
    addressType: Joi.string().valid("home", "office", "other").required(),
  }),
};

export const updateUserAddressSchema = {
  body: Joi.object({
    fullName: Joi.string().max(100).optional(),
    mobileNumber: Joi.string().max(20).optional(),
    countryCode: Joi.string().max(8).optional(),
    streetNo: Joi.string().max(100).optional().allow(""),
    location: Joi.object({
      lat: Joi.number().optional(),
      lng: Joi.number().optional(),
    }).optional(),
    buildingName: Joi.string().max(100).optional(),
    city: Joi.string().max(100).optional(),
    areaDistrict: Joi.string().max(100).optional(),
    landmark: Joi.string().max(100).optional().allow(""),
    addressType: Joi.string().valid("home", "office", "other").optional(),
  }),
  params: Joi.object({
    addressId: Joi.string().custom(validateMongoObjectId).required(),
  }),
};

export const addressIdParamSchema = {
  params: Joi.object({
    addressId: Joi.string().custom(validateMongoObjectId).required(),
  }),
};
export const getSuggestedAccountsValidator = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    "number.base": "Page number must be a number",
    "number.integer": "Page number must be an integer",
    "number.min": "Page number must be at least 0",
  }),
  limit: Joi.number().integer().min(1).max(50).default(10),
});
