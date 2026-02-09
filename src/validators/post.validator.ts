import { Joi } from "../middlewares/validator";
import { validateMongoObjectId } from "../utils/joiHelper";

export const createPostValidator = Joi.object({
  caption: Joi.string().max(1000).optional().messages({
    "string.max": "Caption cannot exceed 1000 characters",
  }),
  tags: Joi.array().items(Joi.string().max(50)).max(10).optional().messages({
    "array.max": "Cannot have more than 10 tags",
    "string.max": "Each tag cannot exceed 50 characters",
  }),
  photoUrls: Joi.array()
    .items(Joi.string().uri())
    .min(1)
    .max(10)
    .required()
    .messages({
      "array.min": "At least one photo URL is required",
      "array.max": "Cannot have more than 10 photos",
      "any.required": "Photo URLs are required",
      "string.uri": "Invalid photo URL format",
    }),
});

export const deletePostValidator = Joi.object({
  postId: Joi.string().custom(validateMongoObjectId).required().messages({
    "any.required": "Post ID is required",
    "string.pattern.base": "Invalid post ID format",
  }),
});

export const getPostsByUserIdParamsValidator = Joi.object({
  userId: Joi.string().custom(validateMongoObjectId).required().messages({
    "any.required": "User ID is required",
    "string.pattern.base": "Invalid user ID format",
  }),
});

export const getPostsByUserIdQueryValidator = Joi.object({
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
