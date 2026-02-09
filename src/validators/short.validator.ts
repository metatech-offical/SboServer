import { Joi } from "../middlewares/validator";
import { EContentVisibility } from "../types/enum";
import { validateMongoObjectId } from "../utils/joiHelper";

export const createShortSchema = Joi.object({
  description: Joi.string().required(),
  videoUrl: Joi.string().uri().optional(),
  thumbnailUrl: Joi.string().uri().required(),
  duration: Joi.number().min(0).required(),
  audioDetails: Joi.object({
    audioId: Joi.string().optional(),
    title: Joi.string().optional(),
    artist: Joi.string().optional(),
    duration: Joi.number().optional(),
  }).optional(),
  tags: Joi.array().items(Joi.string()).required(),
  location: Joi.object({
    coordinates: Joi.object({
      lat: Joi.string().optional(),
      lng: Joi.string().optional(),
    }).optional(),
    address: Joi.string().optional(),
  }).optional(),
  category: Joi.string().optional(),
  visibility: Joi.string().valid(...Object.values(EContentVisibility)).optional(),
});

export const paramsShortIdValidator = Joi.object({
  shortId: Joi.string()
    .custom(validateMongoObjectId, "ObjectId Validation")
    .required()
    .label("Short ID"),
});

export const queryShortsValidator = Joi.object({
  creatorId: Joi.string()
    .custom(validateMongoObjectId, "ObjectId Validation")
    .optional()
    .label("Creator ID"),
  categoryName: Joi.string().optional().label("Category Name"),
  page: Joi.number().min(1).optional().default(1).label("Page Number"),
  limit: Joi.number().min(1).max(100).optional().default(10).label("Limit"),
});

export const queryRecommendedShortsValidator = Joi.object({
  page: Joi.number().min(1).optional().default(1).label("Page Number"),
  limit: Joi.number().min(1).max(100).optional().default(10).label("Limit"),
  algorithm: Joi.string()
    .valid("collaborative", "content-based", "hybrid")
    .optional()
    .default("hybrid")
    .label("Recommendation Algorithm"),
});
