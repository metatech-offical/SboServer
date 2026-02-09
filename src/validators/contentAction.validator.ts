import { EContentType } from "../constants/collectionNames";
import { Joi } from "../middlewares/validator";
import { validateMongoObjectId } from "../utils/joiHelper";

export const likeContentValidator = {
  body: Joi.object({
    contentType: Joi.string()
      .valid(...Object.values(EContentType))
      .required(),
  }),
};

export const saveContentValidator = {
  body: Joi.object({
    action: Joi.string().valid("save", "unsave").required(),
    contentType: Joi.string()
      .valid(...Object.values(EContentType))
      .required(),
  }),
};

export const addCommentValidator = {
  body: Joi.object({
    creatorId: Joi.string()
      .custom(validateMongoObjectId, "ObjectId Validation")
      .required()
      .label("Creator ID"),
    contentId: Joi.string()
      .custom(validateMongoObjectId, "ObjectId Validation")
      .required()
      .label("Content ID"),
    contentType: Joi.string()
      .valid(...Object.values(EContentType))
      .required(),
    commentText: Joi.string().min(1).required(),
    replyTo: Joi.string()
      .custom(validateMongoObjectId, "ObjectId Validation")
      .optional()
      .allow(null),
  }),
};

export const paramsContentIdValidator = Joi.object({
  contentId: Joi.string()
    .custom(validateMongoObjectId, "ObjectId Validation")
    .required()
    .label("Content ID"),
});

export const paramsCommentIdValidator = Joi.object({
  commentId: Joi.string()
    .custom(validateMongoObjectId, "ObjectId Validation")
    .required()
    .label("Comment ID"),
});

export const contentTypeValidator = Joi.object({
  contentType: Joi.string()
    .valid(...Object.values(EContentType))
    .required(),
});

export const paginationQueryValidator = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
});

export const viewContentValidator = Joi.object({
  contentType: Joi.string()
    .valid(...Object.values(EContentType))
    .required(),
  ipAddress: Joi.string().optional(),
  userAgent: Joi.string().optional(),
});

export const addShareRecordValidator = Joi.object({
  url: Joi.string().uri().required(),
  contentId: Joi.string().required(),
  platform: Joi.string().optional(),
  contentType: Joi.string().valid(...Object.values(EContentType)),
});

export const createReportValidator = Joi.object({
  contentId: Joi.string().custom(validateMongoObjectId).required(),
  contentType: Joi.string()
    .valid(...Object.values(EContentType))
    .required()
    .messages({
      "any.only": "Invalid contentType",
      "any.required": "contentType is required",
    }),
  reason: Joi.string().required(),
  description: Joi.string().optional().allow("").messages({
    "string.base": "description must be a string",
  }),
});

export const addToNotInterestedValidator = Joi.object({
  contentId: Joi.string().custom(validateMongoObjectId).required(),
  contentType: Joi.string()
    .valid(...Object.values(EContentType))
    .required(),
});

export const removeFromNotInterestedValidator = Joi.object({
  contentId: Joi.string().custom(validateMongoObjectId).required(),
  contentType: Joi.string()
    .valid(...Object.values(EContentType))
    .required(),
});

export const presignedUrlQueryValidator = Joi.object({
  type: Joi.string().valid("streams", "shorts").required(),
});
