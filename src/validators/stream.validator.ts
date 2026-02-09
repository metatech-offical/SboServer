import Joi from "joi";
import { EContentVisibility } from "../types/enum";
import { validateMongoObjectId } from "../utils/joiHelper";

export const createStreamSchema = Joi.object({
  type: Joi.string().valid("vr", "video", "video-live").required(),
  status: Joi.string().valid("uploading", "draft", "uploaded").required(),
  visibility: Joi.string()
    .valid(...Object.values(EContentVisibility))
    .optional(),
  title: Joi.string().required(),
  description: Joi.string().optional(),
  category: Joi.string().optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  thumbnailUrl: Joi.string().optional(),
  url: Joi.string().required(),
  duration: Joi.number().optional(),
});

export const createLiveStreamSchema = Joi.object({
  visibility: Joi.string()
    .valid(...Object.values(EContentVisibility))
    .optional(),
  title: Joi.string().required(),
  description: Joi.string().optional(),
  category: Joi.string().optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  thumbnailUrl: Joi.string().optional(),
});

export const streamIdSchema = Joi.object({
  streamId: Joi.string()
    .custom(validateMongoObjectId, "ObjectId Validation")
    .required()
    .label("Stream ID"),
});

export const queryStreamsValidator = Joi.object({
  creatorId: Joi.string()
    .custom(validateMongoObjectId, "ObjectId Validation")
    .optional()
    .label("Creator ID"),
  categoryName: Joi.string().optional().label("Category Name"),
  type: Joi.string()
    .valid(...Object.values(["video", "video-live", "all"]))
    .optional()
    .default("all")
    .label("Type"),
  page: Joi.number().min(1).optional().default(1).label("Page number"),
  limit: Joi.number().min(1).max(100).optional().default(10).label("Limit"),
});

export const getLiveStreamByUserIdSchema = Joi.object({
  userId: Joi.string().custom(validateMongoObjectId).required().messages({
    "string.custom": "Invalid userId format",
  }),
});

export const getAllLiveStreamsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    "number.base": "Page must be a number",
    "number.min": "Page must be at least 1",
  }),
  limit: Joi.number().integer().min(1).max(50).default(10).messages({
    "number.base": "Limit must be a number",
    "number.min": "Limit must be at least 1",
    "number.max": "Limit cannot exceed 50",
  }),
});

export const getSubscribedStreamsQuery = Joi.object({
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(50).default(10),
});

export const toggleSaveVodSchema = Joi.object({
  saveVod: Joi.boolean().required().label("Save VOD"),
});

export const getUserVodsQuery = Joi.object({
  page: Joi.number().min(1).default(1).label("Page number"),
  limit: Joi.number().min(1).max(100).default(10).label("Limit"),
});

export const getCreatorVodsParams = Joi.object({
  creatorId: Joi.string()
    .custom(validateMongoObjectId, "ObjectId Validation")
    .required()
    .label("Creator ID"),
});

export const getCreatorVodsQuery = Joi.object({
  page: Joi.number().min(1).default(1).label("Page number"),
  limit: Joi.number().min(1).max(100).default(10).label("Limit"),
});
